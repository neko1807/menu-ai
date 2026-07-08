import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { LockKeyhole, ShieldCheck, User } from 'lucide-react';
import TopNav from '../components/layout/TopNav';
import { useAuth } from '../auth/AuthContext';

function AdminLogin() {
  const { isAuthenticated, loading: authLoading, login, user } = useAuth();
  const [email, setEmail] = useState(import.meta.env.VITE_ADMIN_EMAIL || 'admin@menu-ai.local');
  const [password, setPassword] = useState(import.meta.env.VITE_ADMIN_PASSWORD || 'admin1234');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const fromPath = location.state?.from?.pathname || '/admin';

  if (authLoading) {
    return null;
  }

  if (isAuthenticated) {
    return <Navigate to={user?.role === 'ADMIN' ? '/admin' : '/'} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const result = await login(email, password);

      if (!result.success) {
        setError(result.message);
        setSubmitting(false);
        return;
      }

      if (result.user?.role !== 'ADMIN') {
        setError('บัญชีนี้ไม่ใช่ผู้ดูแลระบบ');
        setSubmitting(false);
        return;
      }

      navigate(fromPath, { replace: true });
    } catch {
      setError('ไม่สามารถเข้าสู่ระบบได้ในขณะนี้');
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_25%),linear-gradient(180deg,_#020617_0%,_#0f172a_45%,_#111827_100%)]">
      <TopNav />

      <div className="mx-auto flex min-h-[calc(100vh-73px)] max-w-[1600px] items-center justify-center px-6 py-10">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/75 shadow-glow backdrop-blur-xl xl:grid-cols-[0.95fr_1.05fr]">
          <div className="flex flex-col justify-between gap-6 bg-gradient-to-br from-sky-400/15 via-cyan-300/10 to-emerald-300/10 p-8 xl:p-10">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-sm text-sky-200">
                <ShieldCheck className="h-4 w-4" />
                Admin Access
              </div>
              <h1 className="text-3xl font-semibold text-white xl:text-5xl">
                เข้าสู่ระบบผู้ดูแล
              </h1>
              <p className="max-w-lg text-sm leading-6 text-slate-300 xl:text-base">
                หน้านี้ใช้ป้องกันการเข้าถึง `Admin Dashboard` โดยผู้ที่ไม่ได้รับอนุญาต
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5 text-sm text-slate-300">
              <p className="font-medium text-white">บัญชีตัวอย่างสำหรับเดโม</p>
              <p className="mt-2">Email: `admin@menu-ai.local`</p>
              <p>Password: `admin1234`</p>
            </div>
          </div>

          <div className="p-8 xl:p-10">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-white">Login</h2>
              <p className="mt-2 text-sm text-slate-400">กรอกข้อมูลเพื่อเข้าใช้งานหน้า Admin</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm text-slate-300">Email</label>
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 focus-within:border-sky-400/40">
                  <User className="h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full bg-transparent text-slate-100 outline-none placeholder:text-slate-500"
                    placeholder="admin@menu-ai.local"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">Password</label>
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 focus-within:border-sky-400/40">
                  <LockKeyhole className="h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full bg-transparent text-slate-100 outline-none placeholder:text-slate-500"
                    placeholder="admin1234"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {error ? (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-400 to-cyan-300 px-6 py-4 font-semibold text-slate-950 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
              </button>

              <p className="text-xs text-slate-500">
                บัญชี `USER` จะถูกพาไปหน้า User ส่วน `ADMIN` จะเข้าแดชบอร์ดผู้ดูแล
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminLogin;
