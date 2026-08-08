package main

import (
	"database/sql"
	"encoding/csv"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	_ "modernc.org/sqlite"
)

// ChargeSession represents a single EV charging record.
type ChargeSession struct {
	ID         int64   `json:"id"`
	Date       string  `json:"date"`
	Location   string  `json:"location"`
	EnergyKwh  float64 `json:"energy_kwh"`
	CostIDR    int64   `json:"cost_idr"`
	OdometerKm *int64  `json:"odometer_km"`
	Notes      *string `json:"notes"`
	CreatedAt  string  `json:"created_at"`
	UpdatedAt  string  `json:"updated_at"`
}

// Stats holds aggregate figures across all sessions.
type Stats struct {
	TotalCost     int64   `json:"total_cost"`
	TotalKwh      float64 `json:"total_kwh"`
	AvgCostPerKwh float64 `json:"avg_cost_per_kwh"`
	SessionCount  int64   `json:"session_count"`
}

// MonthlyStats holds aggregate figures for a single month.
type MonthlyStats struct {
	Year      int     `json:"year"`
	Month     int     `json:"month"`
	TotalCost int64   `json:"total_cost"`
	TotalKwh  float64 `json:"total_kwh"`
	Count     int64   `json:"count"`
}

// inputPayload is the request body for create/update.
type inputPayload struct {
	Date       *string  `json:"date"`
	Location   *string  `json:"location"`
	EnergyKwh  *float64 `json:"energy_kwh"`
	CostIDR    *int64   `json:"cost_idr"`
	OdometerKm *int64   `json:"odometer_km"`
	Notes      *string  `json:"notes"`
}

const schema = `
CREATE TABLE IF NOT EXISTS charge_sessions (
	id           INTEGER PRIMARY KEY AUTOINCREMENT,
	date         TEXT NOT NULL,
	location     TEXT NOT NULL,
	energy_kwh   REAL NOT NULL CHECK (energy_kwh > 0),
	cost_idr     INTEGER NOT NULL CHECK (cost_idr >= 0),
	odometer_km  INTEGER,
	notes        TEXT,
	created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
	updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_charge_sessions_date     ON charge_sessions(date);
CREATE INDEX IF NOT EXISTS idx_charge_sessions_location ON charge_sessions(location);
`

func main() {
	dbPath := filepath.Join("data", "evcharge.db")
	if err := os.MkdirAll("data", 0o755); err != nil {
		log.Fatalf("create data dir: %v", err)
	}

	// busy_timeout lets concurrent readers wait briefly instead of erroring.
	dsn := fmt.Sprintf("file:%s?_pragma=busy_timeout(5000)&_pragma=journal_mode(WAL)", dbPath)
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		log.Fatalf("open db: %v", err)
	}
	defer func() {
		if err := db.Close(); err != nil {
			log.Printf("close db: %v", err)
		}
	}()

	if _, err := db.Exec(schema); err != nil {
		log.Fatalf("init schema: %v", err)
	}

	e := echo.New()
	e.HideBanner = true
	e.Logger.SetOutput(os.Stdout)

	e.Use(middleware.Recover())
	e.Use(middleware.Gzip())
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: []string{
			"http://localhost:5174",
			"http://localhost:5173",
			"http://127.0.0.1:5174",
			"http://127.0.0.1:5173",
			"http://localhost:8100",
			"http://127.0.0.1:8100",
		},
		AllowHeaders: []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAccept, echo.HeaderAuthorization},
		AllowMethods: []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodOptions},
	}))

	h := &handler{db: db}

	api := e.Group("/api")
	api.GET("/sessions", h.listSessions)
	api.GET("/sessions/:id", h.getSession)
	api.POST("/sessions", h.createSession)
	api.PUT("/sessions/:id", h.updateSession)
	api.DELETE("/sessions/:id", h.deleteSession)
	api.GET("/stats", h.getStats)
	api.GET("/stats/monthly", h.getMonthlyStats)
	api.GET("/export.csv", h.exportCSV)

	// Serve built frontend from ../frontend/dist (production single-binary mode).
	distDir := filepath.Join("..", "frontend", "dist")
	if _, err := os.Stat(distDir); err == nil {
		e.Static("/", distDir)
		// SPA fallback: unknown non-API routes serve index.html.
		e.GET("/*", func(c echo.Context) error {
			return c.File(filepath.Join(distDir, "index.html"))
		})
	}

	addr := ":8100"
	e.Logger.Fatal(e.Start(addr))
}

type handler struct {
	db *sql.DB
}

// ---------- helpers ----------

func parseID(c echo.Context) (int64, error) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		return 0, fmt.Errorf("invalid id")
	}
	return id, nil
}

// validateISO8601Date checks a date string. Accepts full ISO-8601 datetime or
// a bare date (YYYY-MM-DD). Returns the normalized date (YYYY-MM-DD) or error.
func validateISO8601Date(s string) (string, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return "", fmt.Errorf("date is required")
	}
	// Bare date form.
	if len(s) >= 10 {
		bare := s[:10]
		if _, err := time.Parse("2006-01-02", bare); err == nil {
			return bare, nil
		}
	}
	return "", fmt.Errorf("invalid ISO 8601 date: %q", s)
}

func writeValidationError(c echo.Context, msg string) error {
	return c.JSON(http.StatusBadRequest, map[string]string{"error": msg})
}

func nullStringFromPtr(p *string) sql.NullString {
	if p == nil {
		return sql.NullString{}
	}
	return sql.NullString{String: *p, Valid: true}
}

func nullInt64FromPtr(p *int64) sql.NullInt64 {
	if p == nil {
		return sql.NullInt64{}
	}
	return sql.NullInt64{Int64: *p, Valid: true}
}

// scanSession scans a full row in column order.
func scanSession(rows interface{ Scan(...any) error }) (ChargeSession, error) {
	var s ChargeSession
	var odometer sql.NullInt64
	var notes sql.NullString
	err := rows.Scan(
		&s.ID, &s.Date, &s.Location, &s.EnergyKwh, &s.CostIDR,
		&odometer, &notes, &s.CreatedAt, &s.UpdatedAt,
	)
	if err != nil {
		return s, err
	}
	if odometer.Valid {
		v := odometer.Int64
		s.OdometerKm = &v
	}
	if notes.Valid {
		v := notes.String
		s.Notes = &v
	}
	return s, nil
}

const sessionColumns = `id, date, location, energy_kwh, cost_idr, odometer_km, notes, created_at, updated_at`

// ---------- routes ----------

func (h *handler) listSessions(c echo.Context) error {
	q := c.Request().URL.Query()

	var (
		conditions []string
		args       []any
	)
	if m := q.Get("month"); m != "" {
		month, err := strconv.Atoi(m)
		if err != nil || month < 1 || month > 12 {
			return writeValidationError(c, "month must be 1-12")
		}
		conditions = append(conditions, `CAST(strftime('%m', date) AS INTEGER) = ?`)
		args = append(args, month)
	}
	if y := q.Get("year"); y != "" {
		year, err := strconv.Atoi(y)
		if err != nil || year < 1900 {
			return writeValidationError(c, "year must be >= 1900")
		}
		conditions = append(conditions, `CAST(strftime('%Y', date) AS INTEGER) = ?`)
		args = append(args, year)
	}
	if loc := q.Get("location"); loc != "" {
		conditions = append(conditions, `location LIKE ?`)
		args = append(args, "%"+loc+"%")
	}

	query := `SELECT ` + sessionColumns + ` FROM charge_sessions`
	if len(conditions) > 0 {
		query += " WHERE " + strings.Join(conditions, " AND ")
	}
	query += ` ORDER BY date DESC, id DESC`

	rows, err := h.db.Query(query, args...)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	defer func() {
		if err := rows.Close(); err != nil {
			log.Printf("close rows: %v", err)
		}
	}()

	out := []ChargeSession{}
	for rows.Next() {
		s, err := scanSession(rows)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
		}
		out = append(out, s)
	}
	return c.JSON(http.StatusOK, out)
}

func (h *handler) getSession(c echo.Context) error {
	id, err := parseID(c)
	if err != nil {
		return writeValidationError(c, err.Error())
	}
	row := h.db.QueryRow(`SELECT `+sessionColumns+` FROM charge_sessions WHERE id = ?`, id)
	s, err := scanSession(row)
	if err == sql.ErrNoRows {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "session not found"})
	}
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, s)
}

func (h *handler) createSession(c echo.Context) error {
	var in inputPayload
	if err := c.Bind(&in); err != nil {
		return writeValidationError(c, "invalid JSON body")
	}

	if in.Date == nil {
		return writeValidationError(c, "date is required")
	}
	date, err := validateISO8601Date(*in.Date)
	if err != nil {
		return writeValidationError(c, err.Error())
	}
	if in.Location == nil || strings.TrimSpace(*in.Location) == "" {
		return writeValidationError(c, "location is required")
	}
	if in.EnergyKwh == nil || *in.EnergyKwh <= 0 {
		return writeValidationError(c, "energy_kwh must be > 0")
	}
	if in.CostIDR == nil || *in.CostIDR < 0 {
		return writeValidationError(c, "cost_idr must be >= 0")
	}

	location := strings.TrimSpace(*in.Location)
	res, err := h.db.Exec(
		`INSERT INTO charge_sessions (date, location, energy_kwh, cost_idr, odometer_km, notes)
		 VALUES (?, ?, ?, ?, ?, ?)`,
		date, location, *in.EnergyKwh, *in.CostIDR,
		nullInt64FromPtr(in.OdometerKm), nullStringFromPtr(in.Notes),
	)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	id, _ := res.LastInsertId()

	row := h.db.QueryRow(`SELECT `+sessionColumns+` FROM charge_sessions WHERE id = ?`, id)
	s, err := scanSession(row)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusCreated, s)
}

func (h *handler) updateSession(c echo.Context) error {
	id, err := parseID(c)
	if err != nil {
		return writeValidationError(c, err.Error())
	}
	var in inputPayload
	if err := c.Bind(&in); err != nil {
		return writeValidationError(c, "invalid JSON body")
	}

	// Ensure row exists.
	var existing ChargeSession
	erow := h.db.QueryRow(`SELECT `+sessionColumns+` FROM charge_sessions WHERE id = ?`, id)
	existing, err = scanSession(erow)
	if err == sql.ErrNoRows {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "session not found"})
	}
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	// Merge partial fields.
	date := existing.Date
	if in.Date != nil {
		d, err := validateISO8601Date(*in.Date)
		if err != nil {
			return writeValidationError(c, err.Error())
		}
		date = d
	}
	location := existing.Location
	if in.Location != nil {
		if strings.TrimSpace(*in.Location) == "" {
			return writeValidationError(c, "location must not be empty")
		}
		location = strings.TrimSpace(*in.Location)
	}
	energy := existing.EnergyKwh
	if in.EnergyKwh != nil {
		if *in.EnergyKwh <= 0 {
			return writeValidationError(c, "energy_kwh must be > 0")
		}
		energy = *in.EnergyKwh
	}
	cost := existing.CostIDR
	if in.CostIDR != nil {
		if *in.CostIDR < 0 {
			return writeValidationError(c, "cost_idr must be >= 0")
		}
		cost = *in.CostIDR
	}
	odometer := existing.OdometerKm
	if in.OdometerKm != nil {
		v := *in.OdometerKm
		odometer = &v
	}
	notes := existing.Notes
	if in.Notes != nil {
		v := *in.Notes
		notes = &v
	}

	_, err = h.db.Exec(
		`UPDATE charge_sessions
		   SET date = ?, location = ?, energy_kwh = ?, cost_idr = ?, odometer_km = ?, notes = ?,
		       updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')
		 WHERE id = ?`,
		date, location, energy, cost,
		nullInt64FromPtr(odometer), nullStringFromPtr(notes), id,
	)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	row := h.db.QueryRow(`SELECT `+sessionColumns+` FROM charge_sessions WHERE id = ?`, id)
	s, err := scanSession(row)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, s)
}

func (h *handler) deleteSession(c echo.Context) error {
	id, err := parseID(c)
	if err != nil {
		return writeValidationError(c, err.Error())
	}
	res, err := h.db.Exec(`DELETE FROM charge_sessions WHERE id = ?`, id)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "session not found"})
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *handler) getStats(c echo.Context) error {
	var s Stats
	err := h.db.QueryRow(
		`SELECT COALESCE(SUM(cost_idr), 0),
		        COALESCE(SUM(energy_kwh), 0),
		        COUNT(*)
		   FROM charge_sessions`,
	).Scan(&s.TotalCost, &s.TotalKwh, &s.SessionCount)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	if s.TotalKwh > 0 {
		s.AvgCostPerKwh = float64(s.TotalCost) / s.TotalKwh
	}
	return c.JSON(http.StatusOK, s)
}

func (h *handler) getMonthlyStats(c echo.Context) error {
	rows, err := h.db.Query(
		`SELECT CAST(strftime('%Y', date) AS INTEGER) AS year,
		        CAST(strftime('%m', date) AS INTEGER) AS month,
		        COALESCE(SUM(cost_idr), 0),
		        COALESCE(SUM(energy_kwh), 0),
		        COUNT(*)
		   FROM charge_sessions
		  GROUP BY year, month
		  ORDER BY year DESC, month DESC`,
	)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	defer func() {
		if err := rows.Close(); err != nil {
			log.Printf("close rows: %v", err)
		}
	}()

	out := []MonthlyStats{}
	for rows.Next() {
		var m MonthlyStats
		if err := rows.Scan(&m.Year, &m.Month, &m.TotalCost, &m.TotalKwh, &m.Count); err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
		}
		out = append(out, m)
	}
	if out == nil {
		out = []MonthlyStats{}
	}
	return c.JSON(http.StatusOK, out)
}

func (h *handler) exportCSV(c echo.Context) error {
	rows, err := h.db.Query(
		`SELECT date, location, energy_kwh, cost_idr, odometer_km, notes
		   FROM charge_sessions
		  ORDER BY date DESC, id DESC`,
	)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	defer func() {
		if err := rows.Close(); err != nil {
			log.Printf("close rows: %v", err)
		}
	}()

	c.Response().Header().Set(echo.HeaderContentType, "text/csv; charset=utf-8")
	c.Response().Header().Set(echo.HeaderContentDisposition, `attachment; filename="ev-charge-sessions.csv"`)
	c.Response().WriteHeader(http.StatusOK)

	w := csv.NewWriter(c.Response().Writer)
	if err := w.Write([]string{"date", "location", "energy_kwh", "cost_idr", "odometer_km", "notes"}); err != nil {
		return err
	}

	for rows.Next() {
		var (
			date, location string
			energy         float64
			cost           int64
			odometer       sql.NullInt64
			notes          sql.NullString
		)
		if err := rows.Scan(&date, &location, &energy, &cost, &odometer, &notes); err != nil {
			return err
		}
		odo := ""
		if odometer.Valid {
			odo = strconv.FormatInt(odometer.Int64, 10)
		}
		note := ""
		if notes.Valid {
			note = notes.String
		}
		if err := w.Write([]string{
			date, location,
			strconv.FormatFloat(energy, 'f', -1, 64),
			strconv.FormatInt(cost, 10),
			odo, note,
		}); err != nil {
			return err
		}
	}
	w.Flush()
	return nil
}
