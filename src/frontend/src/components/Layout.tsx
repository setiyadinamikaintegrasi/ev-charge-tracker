import { type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { to: "/", label: "Dashboard", icon: "📊" },
  { to: "/add", label: "Tambah", icon: "⚡" },
  { to: "/history", label: "Riwayat", icon: "📋" },
];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  return (
    <div className="min-h-full flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-green-600 text-white text-lg">
              ⚡
            </span>
            <span className="font-bold text-slate-900">EV Charge Tracker</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-4 pb-24">
        {children}
      </main>

      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 md:hidden">
        <div className="max-w-3xl mx-auto grid grid-cols-3">
          {navItems.map((item) => {
            const active =
              item.to === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center py-2 text-xs ${
                  active
                    ? "text-green-600 font-semibold"
                    : "text-slate-500"
                }`}
              >
                <span className="text-xl leading-none">{item.icon}</span>
                <span className="mt-0.5">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
