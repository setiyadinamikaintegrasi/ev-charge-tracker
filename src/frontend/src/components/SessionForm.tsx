import { useState, type FormEvent } from "react";
import type { SessionInput, ChargeSession } from "../api";

interface SessionFormProps {
  initial?: ChargeSession;
  submitLabel: string;
  onSubmit: (input: SessionInput) => Promise<void>;
}

interface FormState {
  date: string;
  location: string;
  energy_kwh: string;
  cost_idr: string;
  odometer_km: string;
  notes: string;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function stateFromSession(s?: ChargeSession): FormState {
  return {
    date: s?.date?.slice(0, 10) ?? todayISO(),
    location: s?.location ?? "",
    energy_kwh: s ? String(s.energy_kwh) : "",
    cost_idr: s ? String(s.cost_idr) : "",
    odometer_km: s?.odometer_km != null ? String(s.odometer_km) : "",
    notes: s?.notes ?? "",
  };
}

export default function SessionForm({
  initial,
  submitLabel,
  onSubmit,
}: SessionFormProps) {
  const [form, setForm] = useState<FormState>(() => stateFromSession(initial));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.date) {
      setError("Tanggal wajib diisi.");
      return;
    }
    if (!form.location.trim()) {
      setError("Lokasi wajib diisi.");
      return;
    }
    const energy = parseFloat(form.energy_kwh);
    if (isNaN(energy) || energy <= 0) {
      setError("Energi (kWh) harus lebih besar dari 0.");
      return;
    }
    const cost = parseInt(form.cost_idr, 10);
    if (isNaN(cost) || cost < 0) {
      setError("Biaya (Rp) harus >= 0.");
      return;
    }

    const payload: SessionInput = {
      date: form.date,
      location: form.location.trim(),
      energy_kwh: energy,
      cost_idr: cost,
      notes: form.notes.trim() || null,
    };
    if (form.odometer_km.trim() !== "") {
      const odo = parseInt(form.odometer_km, 10);
      if (isNaN(odo) || odo < 0) {
        setError("Odometer (km) harus angka >= 0.");
        return;
      }
      payload.odometer_km = odo;
    }

    setSubmitting(true);
    try {
      await onSubmit(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none";
  const labelClass = "block text-sm font-medium text-slate-700 mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="date" className={labelClass}>
          Tanggal <span className="text-red-500">*</span>
        </label>
        <input
          id="date"
          type="date"
          required
          value={form.date}
          onChange={(e) => set("date", e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="location" className={labelClass}>
          Lokasi (SPKLU/tempat) <span className="text-red-500">*</span>
        </label>
        <input
          id="location"
          type="text"
          required
          placeholder="cth. SPKLU Pluit Village"
          value={form.location}
          onChange={(e) => set("location", e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="energy_kwh" className={labelClass}>
            Energi (kWh) <span className="text-red-500">*</span>
          </label>
          <input
            id="energy_kwh"
            type="number"
            step="0.01"
            min="0.01"
            required
            inputMode="decimal"
            placeholder="cth. 32.5"
            value={form.energy_kwh}
            onChange={(e) => set("energy_kwh", e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="cost_idr" className={labelClass}>
            Biaya (Rp) <span className="text-red-500">*</span>
          </label>
          <input
            id="cost_idr"
            type="number"
            step="1"
            min="0"
            required
            inputMode="numeric"
            placeholder="cth. 97500"
            value={form.cost_idr}
            onChange={(e) => set("cost_idr", e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="odometer_km" className={labelClass}>
          Odometer (km) <span className="text-slate-400 text-xs">(opsional)</span>
        </label>
        <input
          id="odometer_km"
          type="number"
          step="1"
          min="0"
          inputMode="numeric"
          placeholder="cth. 12345"
          value={form.odometer_km}
          onChange={(e) => set("odometer_km", e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="notes" className={labelClass}>
          Catatan <span className="text-slate-400 text-xs">(opsional)</span>
        </label>
        <textarea
          id="notes"
          rows={3}
          placeholder="cth. Charging sambil makan siang"
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          className={inputClass}
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-green-600 hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-3 transition-colors"
      >
        {submitting ? "Menyimpan…" : submitLabel}
      </button>
    </form>
  );
}
