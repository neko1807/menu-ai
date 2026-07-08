import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarDays, Edit3, LogOut, ShieldCheck, Sparkles, UserCircle2 } from 'lucide-react';
import TopNav from '../components/layout/TopNav';
import { useAuth } from '../auth/AuthContext';

function formatDate(value) {
  if (!value) return '-';

  const date = new Date(value);

  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export default function UserProfile() {
  const { user, logout, logoutAll } = useAuth();
  const navigate = useNavigate();

  const roleLabel = useMemo(() => {
    if (!user?.role) return '-';
    return user.role === 'ADMIN' ? 'ADMIN' : 'USER';
  }, [user?.role]);

  async function handleLogout() {
    await logout();
    navigate('/', { replace: true });
  }

  async function handleLogoutAll() {
    await logoutAll();
    navigate('/', { replace: true });
  }

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top,_rgba(251,146,60,0.18),_transparent_24%),linear-gradient(180deg,_#020617_0%,_#0f172a_45%,_#111827_100%)]">
      <TopNav />

      <div className="mx-auto flex min-h-[calc(100vh-73px)] max-w-[1600px] items-center justify-center px-6 py-10">
        <div className="w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/75 shadow-glow backdrop-blur-xl">
          <div className="grid gap-0 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="flex flex-col justify-between gap-6 bg-gradient-to-br from-orange-400/15 via-amber-300/10 to-rose-300/10 p-8 xl:p-10">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-400/10 px-3 py-1 text-sm text-orange-200">
                  <Sparkles className="h-4 w-4" />
                  User Profile
                </div>
                <h1 className="text-3xl font-semibold text-white xl:text-5xl">ข้อมูลบัญชีของคุณ</h1>
                <p className="max-w-lg text-sm leading-6 text-slate-300 xl:text-base">
                  หน้านี้ช่วยให้เราเช็กข้อมูลผู้ใช้ ปรับแต่งประสบการณ์การใช้งาน และจัดการ session ได้ครบขึ้น
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5 text-sm text-slate-300">
                <p className="font-medium text-white">สถานะบัญชี</p>
                <div className="mt-3 space-y-2">
                  <p className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-300" />
                    Role: {roleLabel}
                  </p>
                  <p className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-sky-300" />
                    สร้างบัญชีเมื่อ: {formatDate(user?.createdAt)}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-8 xl:p-10">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-white">Profile</h2>
                <p className="mt-2 text-sm text-slate-400">ดูข้อมูลบัญชีและจัดการ session ของคุณได้จากหน้านี้</p>
              </div>

              <div className="space-y-4">
                <ProfileCard icon={UserCircle2} label="ชื่อผู้ใช้" value={user?.name || '-'} />
                <ProfileCard label="อีเมล" value={user?.email || '-'} />
                <ProfileCard label="User ID" value={user?.id || '-'} />
                <ProfileCard label="เข้าสู่ระบบด้วยสิทธิ์" value={roleLabel} />

                <div className="grid gap-3 pt-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => navigate('/', { replace: true })}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/5 px-5 py-3 font-medium text-slate-200 transition hover:bg-white/10"
                  >
                    กลับไปแนะนำเมนู
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-500/15 px-5 py-3 font-medium text-rose-200 transition hover:bg-rose-500/25"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>

                <Link
                  to="/profile/edit"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-sky-400/20 bg-sky-400/10 px-5 py-3 font-medium text-sky-100 transition hover:bg-sky-400/15"
                >
                  <Edit3 className="h-4 w-4" />
                  แก้ไขโปรไฟล์
                </Link>

                <button
                  type="button"
                  onClick={handleLogoutAll}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-slate-950/40 px-5 py-3 font-medium text-slate-200 transition hover:bg-white/5"
                >
                  Logout all devices
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
      <div className="flex items-center gap-2 text-slate-400">
        {Icon ? <Icon className="h-4 w-4" /> : null}
        <span className="text-xs uppercase tracking-[0.2em]">{label}</span>
      </div>
      <div className="mt-2 break-all text-base font-medium text-white">{value}</div>
    </div>
  );
}
