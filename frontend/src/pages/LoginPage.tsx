import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Briefcase, LogIn, ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "../auth/AuthContext";

const SAMPLES = [
  {
    role: "Account Executive",
    email: "ae@nexlara.test",
    password: "Demo123!",
    icon: Briefcase,
    tone: "bg-blue-100 text-blue-700",
    desc: "Create, edit and resubmit quotes",
  },
  {
    role: "Approving Manager",
    email: "manager@nexlara.test",
    password: "Demo123!",
    icon: ShieldCheck,
    tone: "bg-emerald-100 text-emerald-700",
    desc: "Approve or reject pending quotes",
  },
] as const;

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) return <Navigate to="/" replace />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
      navigate("/", { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-white border border-slate-200 shadow-lg p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="text-lg font-semibold tracking-tight">Nexlara</div>
              <div className="text-xs text-slate-500">Quote workspace · sign in</div>
            </div>
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <label className="text-xs text-slate-600">
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
            <label className="text-xs text-slate-600">
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 disabled:opacity-50"
            >
              <LogIn size={14} /> {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <div className="rounded-2xl bg-white/80 backdrop-blur border border-slate-200 shadow-lg p-6 flex flex-col gap-3">
          <div className="text-sm font-semibold">Sample logins</div>
          <div className="text-xs text-slate-500">
            Click a card to autofill — passwords are <code>Demo123!</code>.
          </div>
          <div className="flex flex-col gap-2 mt-2">
            {SAMPLES.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.email}
                  type="button"
                  onClick={() => {
                    setEmail(s.email);
                    setPassword(s.password);
                  }}
                  className="text-left rounded-xl border border-slate-200 p-3 hover:border-blue-300 hover:bg-blue-50/40 transition"
                >
                  <div className="flex items-center gap-2">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${s.tone}`}>
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{s.role}</div>
                      <div className="text-[11px] text-slate-500 truncate">{s.email}</div>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1.5">{s.desc}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
