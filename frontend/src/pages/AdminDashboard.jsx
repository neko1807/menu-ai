import { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, BookOpen, ChefHat, FlaskConical, Search, ShieldAlert, Tag, TimerReset, TrendingUp, Users, UtensilsCrossed } from 'lucide-react';
import StatCard from '../components/admin/StatCard';
import IngredientTable from '../components/admin/IngredientTable';
import IngredientManager from '../components/admin/IngredientManager';
import RecipeManager from '../components/admin/RecipeManager';
import TopNav from '../components/layout/TopNav';
import { useAuth } from '../auth/AuthContext';

function AdminDashboard() {
  const { authFetch } = useAuth();
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAnalytics = useCallback(async () => {
    try {
      setRefreshing(true);
      const response = await authFetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/analytics`);

      if (!response.ok) {
        throw new Error('Failed to load analytics');
      }

      const data = await response.json();

      setSnapshot({
        totals: data.totals || {},
        averages: data.averages || { cookingTime: 0 },
        recipeTypes: data.recipeTypes || [],
        topIngredients: (data.topIngredients || []).map((item) => ({
          name: item.name,
          count: item.count,
          note: 'ค้นหาบ่อยในระบบ',
        })),
        unmatchedSearchTerms: data.unmatchedSearchTerms || [],
      });
      setError('');
    } catch {
      setError('ไม่สามารถโหลดสถิติจริงจากฐานข้อมูลได้ในขณะนี้');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authFetch]);

  useEffect(() => {
    loadAnalytics();

    const intervalId = window.setInterval(() => {
      loadAnalytics();
    }, 60000);

    const handleFocus = () => {
      loadAnalytics();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadAnalytics]);

  const analyticsStatus = useMemo(() => ({ hasError: Boolean(error) }), [error]);

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_25%),linear-gradient(180deg,_#020617_0%,_#0f172a_45%,_#111827_100%)]">
      <TopNav />
      <div className="mx-auto max-w-[1600px] px-6 py-6 xl:px-10">
        <header className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-glow backdrop-blur-xl">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-sm text-sky-200">
                <BarChart3 className="h-4 w-4" />
                Admin Analytics Dashboard
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-white xl:text-5xl">
                  ภาพรวมพฤติกรรมการค้นหาและเมนูโปรด
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300 xl:text-base">
                  ข้อมูลทั้งหมดในหน้านี้คำนวณจากฐานข้อมูลจริง และจะรีเฟรชอัตโนมัติเมื่อเปิดหน้าไว้
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="mt-4 flex flex-wrap gap-2">
          <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={BarChart3} label="Overview" />
          <TabButton active={activeTab === 'ingredients'} onClick={() => setActiveTab('ingredients')} icon={FlaskConical} label="Ingredients" />
          <TabButton active={activeTab === 'recipes'} onClick={() => setActiveTab('recipes')} icon={ChefHat} label="Menu CRUD" />
          {refreshing ? (
            <span className="inline-flex items-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
              กำลังอัปเดตข้อมูล...
            </span>
          ) : null}
        </div>

        <main className="mt-6 grid gap-6">
          {activeTab === 'overview' ? (
            <>
              <section className="grid gap-5 xl:grid-cols-3">
                <StatCard
                  title="จำนวนผู้ใช้งานทั้งหมด"
                  value={formatCount(snapshot?.totals?.users)}
                  description="จำนวนบัญชีที่มีอยู่จริงในระบบ"
                  icon={Users}
                  accent="sky"
                />
                <StatCard
                  title="จำนวนการค้นหาเมนูทั้งหมด"
                  value={formatCount(snapshot?.totals?.searches)}
                  description="รวมคำค้นวัตถุดิบทั้งหมดจากผู้ใช้"
                  icon={Search}
                  accent="orange"
                />
                <StatCard
                  title="จำนวนเมนูทั้งหมด"
                  value={formatCount(snapshot?.totals?.recipes)}
                  description="เมนูที่มีอยู่ในฐานข้อมูลจริง"
                  icon={BookOpen}
                  accent="emerald"
                />
                <StatCard
                  title="จำนวนวัตถุดิบทั้งหมด"
                  value={formatCount(snapshot?.totals?.ingredients)}
                  description="วัตถุดิบหลักที่ระบบรู้จัก"
                  icon={UtensilsCrossed}
                  accent="sky"
                />
                <StatCard
                  title="จำนวน alias"
                  value={formatCount(snapshot?.totals?.aliases)}
                  description="คำเรียกอื่นของวัตถุดิบ"
                  icon={Tag}
                  accent="orange"
                />
                <StatCard
                  title="เวลาเฉลี่ยในการทำ"
                  value={formatAverageCookingTime(snapshot?.averages?.cookingTime)}
                  description="คำนวณจาก recipe จริงทั้งหมด"
                  icon={TimerReset}
                  accent="emerald"
                />
              </section>

              {analyticsStatus.hasError ? (
                <div className="rounded-3xl border border-amber-400/20 bg-amber-400/10 px-5 py-4 text-sm text-amber-100">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="mt-0.5 h-4 w-4" />
                    <p>{error}</p>
                  </div>
                </div>
              ) : null}

              {loading ? (
                <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-8 text-slate-300 shadow-glow backdrop-blur-xl">
                  กำลังโหลดสถิติจริงจากฐานข้อมูล...
                </div>
              ) : (
                <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                  <IngredientTable rows={snapshot?.topIngredients || []} />

                  <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-glow backdrop-blur-xl">
                    <div className="mb-5">
                      <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-sm text-emerald-200">
                        <TrendingUp className="h-4 w-4" />
                        Search Insights
                      </div>
                      <h2 className="mt-4 text-xl font-semibold text-white">สรุปคำค้นและรูปแบบเมนูจริง</h2>
                      <p className="mt-1 text-sm text-slate-400">
                        สถิติด้านล่างรีเฟรชจากฐานข้อมูลจริงอัตโนมัติทุก 60 วินาที
                      </p>
                    </div>

                    <div className="space-y-4">
                      {(snapshot?.recipeTypes || []).map((row) => (
                        <div key={row.type} className="rounded-2xl border border-white/[0.08] bg-slate-950/50 p-4">
                          <div className="mb-2 flex items-center justify-between text-sm">
                            <span className="font-medium text-white">{formatRecipeType(row.type)}</span>
                            <span className="text-slate-400">{row.count.toLocaleString()}</span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-800">
                            <div
                              className="h-2 rounded-full bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-300"
                              style={{ width: `${getBarWidth(row.count, snapshot?.recipeTypes || [])}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                      <p className="text-sm text-slate-300">คำค้นที่ยังไม่ match บ่อยที่สุด:</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(snapshot?.unmatchedSearchTerms || []).length ? (
                          snapshot.unmatchedSearchTerms.map((item) => (
                            <span
                              key={item.name}
                              className="rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1 text-sm text-red-100"
                            >
                              {item.name} · {item.count}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-slate-500">ยังไม่พบคำค้นที่ match ไม่ได้</span>
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              )}
            </>
          ) : activeTab === 'ingredients' ? (
            <IngredientManager />
          ) : (
            <RecipeManager />
          )}
        </main>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium transition ${
        active
          ? 'border-orange-400/30 bg-orange-400/10 text-orange-200'
          : 'border-white/10 bg-white/5 text-slate-200 hover:border-white/20 hover:bg-white/10'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

export default AdminDashboard;

function formatCount(value) {
  return Number.isFinite(value) ? Number(value).toLocaleString() : '0';
}

function formatAverageCookingTime(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return '0 นาที';
  }

  return `${value.toFixed(1)} นาที`;
}

function formatRecipeType(type) {
  if (type === 'HEALTHY') return 'สุขภาพ';
  if (type === 'VEGETARIAN') return 'มังสวิรัติ';
  return 'ทั่วไป';
}

function getBarWidth(value, rows) {
  const maxValue = Math.max(...rows.map((row) => row.count), 1);
  return Math.round((value / maxValue) * 100);
}
