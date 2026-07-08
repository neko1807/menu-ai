import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Sprout, Search } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { API_BASE_URL } from '../../auth/authConfig';
import { parseJsonResponse } from '../../lib/response';

function IngredientManager() {
  const { authFetch } = useAuth();
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [query, setQuery] = useState('');
  const [name, setName] = useState('');

  const loadIngredients = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await authFetch(`${API_BASE_URL}/api/admin/ingredients`);
      if (!response.ok) {
        throw new Error('Failed to load ingredients');
      }

      const data = await parseJsonResponse(response);
      setIngredients(data.ingredients || []);
    } catch {
      setError('ไม่สามารถโหลดรายการวัตถุดิบได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIngredients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredIngredients = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return ingredients;
    }

    return ingredients.filter((ingredient) => ingredient.name.toLowerCase().includes(normalizedQuery));
  }, [ingredients, query]);

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError('กรุณากรอกชื่อวัตถุดิบ');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await authFetch(`${API_BASE_URL}/api/admin/ingredients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: trimmedName }),
      });

      const data = await safeJson(response);

      if (!response.ok) {
        throw new Error(data.message || 'ไม่สามารถเพิ่มวัตถุดิบได้');
      }

      setName('');
      setSuccess(`เพิ่มวัตถุดิบ ${data.ingredient?.name || trimmedName} สำเร็จ`);
      await loadIngredients();
    } catch (submitError) {
      setError(submitError.message || 'ไม่สามารถเพิ่มวัตถุดิบได้');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-glow backdrop-blur-xl">
        <div className="mb-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-sm text-emerald-200">
            <Sprout className="h-4 w-4" />
            Ingredient Management
          </div>
          <h2 className="mt-4 text-xl font-semibold text-white">เพิ่มวัตถุดิบเข้าในระบบ</h2>
          <p className="mt-1 text-sm text-slate-400">เพิ่มชื่อวัตถุดิบหลักเพื่อใช้กับ recipe และระบบ matching</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm text-slate-300">ชื่อวัตถุดิบ</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/20"
              placeholder="เช่น ข้าวโพดหวาน"
            />
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
              {success}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-400 to-amber-300 px-5 py-3 font-semibold text-slate-950 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            เพิ่มวัตถุดิบ
          </button>
        </form>
      </div>

      <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-glow backdrop-blur-xl">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">รายการวัตถุดิบในระบบ</h2>
            <p className="mt-1 text-sm text-slate-400">ค้นหาและตรวจสอบรายการที่มีอยู่แล้ว</p>
          </div>
          <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-sm text-emerald-200">
            {ingredients.length} รายการ
          </div>
        </div>

        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full bg-transparent text-slate-100 outline-none placeholder:text-slate-500"
            placeholder="ค้นหาวัตถุดิบ..."
          />
        </div>

        {loading ? (
          <div className="rounded-3xl border border-dashed border-white/15 bg-slate-950/30 p-10 text-center text-slate-400">
            กำลังโหลดวัตถุดิบ...
          </div>
        ) : filteredIngredients.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {filteredIngredients.map((ingredient) => (
              <div key={ingredient.id} className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-slate-200">
                {ingredient.name}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-white/15 bg-slate-950/30 p-10 text-center text-slate-400">
            ไม่พบวัตถุดิบที่ตรงกับคำค้น
          </div>
        )}
      </div>
    </section>
  );
}

async function safeJson(response) {
  return parseJsonResponse(response);
}

export default IngredientManager;
