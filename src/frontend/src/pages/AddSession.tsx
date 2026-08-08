import { useNavigate } from "react-router-dom";
import { api, type SessionInput } from "../api";
import SessionForm from "../components/SessionForm";

export default function AddSession() {
  const navigate = useNavigate();

  async function handleSubmit(input: SessionInput) {
    await api.createSession(input);
    navigate("/");
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Tambah Sesi Charging</h1>
        <p className="text-sm text-slate-500">
          Catat sesi charging baru. Selesai dalam &lt; 30 detik.
        </p>
      </div>
      <SessionForm submitLabel="⚡ Simpan Sesi" onSubmit={handleSubmit} />
    </div>
  );
}
