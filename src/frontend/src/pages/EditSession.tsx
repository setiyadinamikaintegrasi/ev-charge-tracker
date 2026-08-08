import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, type ChargeSession, type SessionInput } from "../api";
import SessionForm from "../components/SessionForm";

export default function EditSession() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<ChargeSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const numId = Number(id);
    if (!numId || Number.isNaN(numId)) {
      setError("ID sesi tidak valid.");
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const s = await api.getSession(numId);
        if (!cancelled) setSession(s);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleSubmit(input: SessionInput) {
    const numId = Number(id);
    await api.updateSession(numId, input);
    navigate("/history");
  }

  if (loading) return <p className="text-slate-500">Memuat data sesi…</p>;
  if (error)
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700">
        {error}
      </div>
    );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Edit Sesi Charging</h1>
        <p className="text-sm text-slate-500">Perbarui detail sesi ini.</p>
      </div>
      {session && (
        <SessionForm
          initial={session}
          submitLabel="💾 Simpan Perubahan"
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
