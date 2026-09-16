import { useState } from 'react';
import { AlertCircle, Loader2, LogIn, UserPlus, X } from 'lucide-react';
import { API_BASE_URL } from '../../config/api';
import { parseJsonResponse } from '../../lib/response';

function AuthDialog({ onClose, onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isRegistering = mode === 'register';

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/${isRegistering ? 'register' : 'login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await parseJsonResponse(response);

      if (!response.ok || !data.token || !data.user) {
        throw new Error(data.message || 'ไม่สามารถเข้าสู่ระบบได้');
      }

      onAuthenticated(data);
    } catch (requestError) {
      setError(requestError.message || 'ไม่สามารถเชื่อมต่อระบบเข้าสู่ระบบได้');
    } finally {
      setLoading(false);
    }
  }

  function switchMode() {
    setMode(isRegistering ? 'login' : 'register');
    setError('');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-8 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
          aria-label="ปิดหน้าต่างเข้าสู่ระบบ"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="rounded-2xl bg-orange-400/10 p-3 text-orange-200 w-fit">
          {isRegistering ? <UserPlus className="h-6 w-6" /> : <LogIn className="h-6 w-6" />}
        </div>
        <h2 className="mt-4 text-2xl font-semibold text-white">
          {isRegistering ? 'สร้างบัญชี menu-ai' : 'เข้าสู่ระบบ'}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          {isRegistering ? 'สมัครเพื่อเริ่มรับคำแนะนำเมนูจาก AI' : 'เข้าสู่ระบบเพื่อใช้งานตัวสร้างเมนู AI'}
        </p>

        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm text-slate-300">
            อีเมล
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/20"
            />
          </label>
          <label className="grid gap-2 text-sm text-slate-300">
            รหัสผ่าน
            <input
              type="password"
              autoComplete={isRegistering ? 'new-password' : 'current-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
              className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/20"
            />
            {isRegistering ? <span className="text-xs text-slate-500">อย่างน้อย 8 ตัวอักษร</span> : null}
          </label>

          {error ? (
            <p className="flex items-start gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : isRegistering ? <UserPlus className="h-5 w-5" /> : <LogIn className="h-5 w-5" />}
            {loading ? 'กำลังดำเนินการ...' : isRegistering ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-400">
          {isRegistering ? 'มีบัญชีอยู่แล้ว?' : 'ยังไม่มีบัญชี?'}
          <button type="button" onClick={switchMode} className="ml-2 font-medium text-orange-300 hover:text-orange-200">
            {isRegistering ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
          </button>
        </p>
      </div>
    </div>
  );
}

export default AuthDialog;
