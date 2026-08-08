import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Stats, type MonthlyStats } from "../api";
import { formatIDR, formatNumber, MONTH_NAMES_ID } from "../utils";
import StatCard from "../components/StatCard";

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [monthly, setMonthly] = useState<MonthlyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [s, m] = await Promise.all([api.getStats(), api.getMonthlyStats()]);
        if (cancelled) return;
        setStats(s);
        setMonthly(m);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <p className="text-slate-500">Memuat statistik…</p>;
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700">
        Gagal memuat statistik: {error}
      </div>
    );
  }

  // This-month figures for the headline cards.
  const now = new Date();
  const thisMonth = monthly.find(
    (m) => m.year === now.getFullYear() && m.month === now.getMonth() + 1
  );

  const maxCost = monthly.reduce((mx, m) => Math.max(mx, m.total_cost), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">
          Ringkasan biaya charging kendaraan listrik Anda.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <StatCard
          label="Biaya Bulan Ini"
          value={thisMonth ? formatIDR(thisMonth.total_cost) : formatIDR(0)}
          sub={thisMonth ? `${thisMonth.count} sesi` : "Belum ada sesi"}
          accent="green"
        />
        <StatCard
          label="Energi Bulan Ini"
          value={thisMonth ? `${formatNumber(thisMonth.total_kwh)} kWh` : "0 kWh"}
          sub="Total pengisian bulan ini"
          accent="blue"
        />
        <StatCard
          label="Rata-rata Rp/kWh"
          value={
            stats && stats.total_kwh > 0
              ? formatIDR(Math.round(stats.avg_cost_per_kwh))
              : "—"
          }
          sub="Seluruh waktu"
          accent="amber"
        />
        <StatCard
          label="Total Sesi"
          value={String(stats?.session_count ?? 0)}
          sub="Seluruh waktu"
          accent="slate"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-900">Biaya per Bulan</h2>
          <Link
            to="/history"
            className="text-sm text-green-600 hover:underline font-medium"
          >
            Lihat riwayat →
          </Link>
        </div>

        {monthly.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">
            Belum ada data. Tambahkan sesi charging pertama Anda.
          </p>
        ) : (
          <div className="space-y-2">
            {monthly.map((m) => {
              const pct = maxCost > 0 ? (m.total_cost / maxCost) * 100 : 0;
              return (
                <div key={`${m.year}-${m.month}`} className="flex items-center gap-3">
                  <div className="w-24 shrink-0 text-xs text-slate-600">
                    {MONTH_NAMES_ID[m.month - 1]} {m.year}
                  </div>
                  <div className="flex-1 h-6 bg-slate-100 rounded-md overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-md transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="w-28 shrink-0 text-right text-xs font-medium text-slate-700">
                    {formatIDR(m.total_cost)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Link
        to="/add"
        className="block w-full text-center rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold py-3 transition-colors"
      >
        ⚡ Tambah Sesi Charging
      </Link>
    </div>
  );
}
