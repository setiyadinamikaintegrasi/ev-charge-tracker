interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  accent?: "green" | "blue" | "amber" | "slate";
}

const accentClasses: Record<string, string> = {
  green: "bg-green-50 border-green-200 text-green-700",
  blue: "bg-blue-50 border-blue-200 text-blue-700",
  amber: "bg-amber-50 border-amber-200 text-amber-700",
  slate: "bg-slate-50 border-slate-200 text-slate-700",
};

export default function StatCard({
  label,
  value,
  sub,
  accent = "slate",
}: StatCardProps) {
  return (
    <div className={`rounded-xl border p-4 ${accentClasses[accent]}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {sub && <p className="mt-0.5 text-xs opacity-70">{sub}</p>}
    </div>
  );
}
