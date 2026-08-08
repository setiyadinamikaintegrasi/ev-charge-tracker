// API client for EV Charge Tracker. Base URL `/api` — proxied to backend :8100
// in dev (see vite.config.ts) and served same-origin in production.

const BASE = "/api";

export interface ChargeSession {
  id: number;
  date: string;
  location: string;
  energy_kwh: number;
  cost_idr: number;
  odometer_km: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SessionInput {
  date?: string;
  location?: string;
  energy_kwh?: number;
  cost_idr?: number;
  odometer_km?: number | null;
  notes?: string | null;
}

export interface Stats {
  total_cost: number;
  total_kwh: number;
  avg_cost_per_kwh: number;
  session_count: number;
}

export interface MonthlyStats {
  year: number;
  month: number;
  total_cost: number;
  total_kwh: number;
  count: number;
}

export interface SessionFilter {
  month?: number;
  year?: number;
  location?: string;
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.error) detail = body.error;
    } catch {
      /* ignore non-JSON error body */
    }
    throw new Error(detail);
  }
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

function qs(filter?: SessionFilter): string {
  if (!filter) return "";
  const params = new URLSearchParams();
  if (filter.month != null) params.set("month", String(filter.month));
  if (filter.year != null) params.set("year", String(filter.year));
  if (filter.location) params.set("location", filter.location);
  const s = params.toString();
  return s ? `?${s}` : "";
}

export const api = {
  async listSessions(filter?: SessionFilter): Promise<ChargeSession[]> {
    const res = await fetch(`${BASE}/sessions${qs(filter)}`);
    return handle<ChargeSession[]>(res);
  },

  async getSession(id: number): Promise<ChargeSession> {
    const res = await fetch(`${BASE}/sessions/${id}`);
    return handle<ChargeSession>(res);
  },

  async createSession(input: SessionInput): Promise<ChargeSession> {
    const res = await fetch(`${BASE}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return handle<ChargeSession>(res);
  },

  async updateSession(id: number, input: SessionInput): Promise<ChargeSession> {
    const res = await fetch(`${BASE}/sessions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return handle<ChargeSession>(res);
  },

  async deleteSession(id: number): Promise<void> {
    const res = await fetch(`${BASE}/sessions/${id}`, { method: "DELETE" });
    await handle<void>(res);
  },

  async getStats(): Promise<Stats> {
    const res = await fetch(`${BASE}/stats`);
    return handle<Stats>(res);
  },

  async getMonthlyStats(): Promise<MonthlyStats[]> {
    const res = await fetch(`${BASE}/stats/monthly`);
    return handle<MonthlyStats[]>(res);
  },

  exportCsvUrl(): string {
    return `${BASE}/export.csv`;
  },
};
