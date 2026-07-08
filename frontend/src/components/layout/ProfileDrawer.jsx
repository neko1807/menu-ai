import { useEffect, useState } from 'react';
import { CalendarDays, CircleUserRound, Edit3, LogOut, ShieldCheck, Sparkles, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';

function formatDate(value) {
  if (!value) return '-';

  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function ProfileDrawer({ open, user, onClose, onLogout, onLogoutAll }) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const rafId = window.requestAnimationFrame(() => setVisible(true));
      return () => window.cancelAnimationFrame(rafId);
    }

    setVisible(false);
    const timeoutId = window.setTimeout(() => setMounted(false), 520);
    return () => window.clearTimeout(timeoutId);
  }, [open]);

  useEffect(() => {
    function handleEscape(event) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    if (!mounted) {
      return undefined;
    }

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [mounted, onClose]);

  if (!mounted) return null;

  const roleLabel = user?.role === 'ADMIN' ? 'ADMIN' : 'USER';

  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        aria-label="Close profile drawer"
        onClick={onClose}
        className={`absolute inset-0 cursor-default bg-slate-950/60 backdrop-blur-[2px] transition-[opacity,backdrop-filter] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          visible ? 'opacity-100' : 'pointer-events-none opacity-0 backdrop-blur-none'
        }`}
      />

      <aside
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-white/10 bg-slate-950/95 shadow-[0_25px_80px_rgba(0,0,0,0.45)] transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${
          visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
        }`}
      >
        <div className="flex items-start justify-between border-b border-white/10 p-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-400/10 px-3 py-1 text-xs text-orange-200">
              <Sparkles className="h-3.5 w-3.5" />
              Profile Center
            </div>
            <h2 className="mt-3 text-2xl font-semibold text-white">Your account</h2>
            <p className="mt-1 text-sm text-slate-400">ดูข้อมูลและจัดการบัญชีได้จากแผงนี้</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-200 transition duration-300 hover:bg-white/10 hover:rotate-90"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center gap-4">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user?.name || 'Profile'}
                  className="h-14 w-14 rounded-2xl border border-white/10 object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-400/15 text-orange-200">
                  <CircleUserRound className="h-7 w-7" />
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold text-white">{user?.name || '-'}</p>
                <p className="truncate text-sm text-slate-400">{user?.email || '-'}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">{roleLabel}</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <InfoPill label="Role" value={roleLabel} icon={ShieldCheck} />
              <InfoPill label="Joined" value={formatDate(user?.createdAt)} icon={CalendarDays} />
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Quick actions</h3>
            <div className="mt-4 space-y-3">
              <NavLink
                to="/profile"
                onClick={onClose}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-100 transition duration-300 hover:-translate-y-0.5 hover:bg-white/5"
              >
                <span className="flex items-center gap-3">
                  <CircleUserRound className="h-4 w-4 text-orange-200" />
                  View profile
                </span>
                <span className="text-slate-400">Open</span>
              </NavLink>

              <NavLink
                to="/profile/edit"
                onClick={onClose}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-100 transition duration-300 hover:-translate-y-0.5 hover:bg-white/5"
              >
                <span className="flex items-center gap-3">
                  <Edit3 className="h-4 w-4 text-sky-300" />
                  Edit profile
                </span>
                <span className="text-slate-400">Open</span>
              </NavLink>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Session</h3>
            <div className="mt-4 grid gap-3">
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-500/15 px-4 py-3 text-sm font-medium text-rose-200 transition duration-300 hover:bg-rose-500/25"
              >
                <LogOut className="h-4 w-4" />
                Logout this device
              </button>
              <button
                type="button"
                onClick={onLogoutAll}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-200 transition duration-300 hover:bg-white/10"
              >
                <LogOut className="h-4 w-4" />
                Logout all devices
              </button>
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}

function InfoPill({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3">
      <div className="flex items-center gap-2 text-slate-400">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[11px] uppercase tracking-[0.2em]">{label}</span>
      </div>
      <p className="mt-1 truncate text-sm font-medium text-white">{value}</p>
    </div>
  );
}

export default ProfileDrawer;
