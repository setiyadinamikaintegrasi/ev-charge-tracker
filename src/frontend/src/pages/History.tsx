import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type ChargeSession } from "../api";
import { formatIDR, formatNumber, formatDate, MONTH_NAMES_ID } from "../utils";

export default function History() {
  const [sessions, setSessions] = useState<ChargeSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const now = new Date();
  const [month, setMonth] = useState<string>(String(now.getMonth() + 1));
  const [year, setYear] = useState<string>(String(now.getFullYear()));
  const [useFilter, setUseFilter] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const filter = useFilter
        ? {
            month: month ? Number(month) : undefined,
            year: year ? Number(year) : undefined,
          }
        : undefined;
      const data = await api.listSessions(filter);
      setSessions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useFilter, month, year]);

  async function handleDelete(id: number) {
    if (!confirm("Hapus sesi ini? Tindakan ini tidak dapat dibatalkan.")) return;
    try {
      await api.deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    }
  }

  const inputClass =
    "rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none bg-white";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Riwayat Charging</h1>
        <a
          href={api.exportCsvUrl()}
          className="text-sm text-green-600 hover:underline font-medium"
        >
          ⬇ Export CSV
        </a>
      </div>

      {/* Filter */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-3">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={useFilter}
            onChange={(e) => setUseFilter(e.target.checked)}
            className="rounded border-slate-300 text-green-600 focus:ring-green-500"
          />
          Filter berdasarkan bulan/tahun
        </label>
        {useFilter && (
          <div className="grid grid-cols-2 gap-2">
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className={inputClass}
            >
              {MONTH_NAMES_ID.map((name, i) => (
                <option key={i} value={String(i + 1)}>
                  {name}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="2000"
              max="2100"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className={inputClass}
              placeholder="Tahun"
            />
          </div>
        )}
      </div>

      {loading && <p className="text-slate-500">Memuat…</p>}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && sessions.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
          <p className="text-slate-500">Belum ada sesi tercatat.</p>
          <Link
            to="/add"
            className="inline-block mt-2 text-green-600 hover:underline font-medium text-sm"
          >
            Tambah sesi pertama →
          </Link>
        </div>
      )}

      {!loading && !error && sessions.length > 0 && (
        <>
          {/* Desktop: table */}
          <div className="hidden sm:block overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Tanggal</th>
                  <th className="px-3 py-2 font-medium">Lokasi</th>
                  <th className="px-3 py-2 font-medium text-right">kWh</th>
                  <th className="px-3 py-2 font-medium text-right">Biaya</th>
                  <th className="px-3 py-2 font-medium text-right">Odo</th>
                  <th className="px-3 py-2 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 whitespace-nowrap text-slate-700">
                      {formatDate(s.date)}
                    </td>
                    <td className="px-3 py-2 text-slate-900">{s.location}</td>
                    <td className="px-3 py-2 text-right text-slate-700">
                      {formatNumber(s.energy_kwh)}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-900 font-medium whitespace-nowrap">
                      {formatIDR(s.cost_idr)}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-500">
                      {s.odometer_km != null ? `${s.odometer_km}` : "—"}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <Link
                        to={`/edit/${s.id}`}
                        className="text-green-600 hover:underline mr-3"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="text-red-600 hover:underline"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: cards */}
          <div className="sm:hidden space-y-2">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="rounded-xl border border-slate-200 bg-white p-3"
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">
                      {s.location}
                    </p>
                    <p className="text-xs text-slate-500">{formatDate(s.date)}</p>
                  </div>
                  <p className="font-semibold text-slate-900 whitespace-nowrap">
                    {formatIDR(s.cost_idr)}
                  </p>
                </div>
                <div className="mt-2 flex items-center gap-3 text-xs text-slate-600">
                  <span>{formatNumber(s.energy_kwh)} kWh</span>
                  {s.odometer_km != null && <span>{s.odometer_km} km</span>}
                </div>
                <div className="mt-2 flex gap-3 text-sm">
                  <Link
                    to={`/edit/${s.id}`}
                    className="text-green-600 hover:underline font-medium"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="text-red-600 hover:underline font-medium"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
