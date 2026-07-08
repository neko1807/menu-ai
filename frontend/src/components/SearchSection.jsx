import { Search, Sparkles } from 'lucide-react';

function SearchSection({ value, onChange, onSearch, loading, error }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/75 p-5 shadow-glow backdrop-blur-xl xl:p-6">
      <div className="mb-4 flex items-center gap-2 text-slate-200">
        <Sparkles className="h-4 w-4 text-orange-300" />
        <span className="text-sm font-medium">ตัวสร้างเมนู</span>
      </div>

      <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
        <div className="flex-1">
          <label className="mb-2 block text-sm text-slate-400">วัตถุดิบที่มี</label>
          <textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            rows={4}
            placeholder="เช่น ไข่ไก่, หมูสับ, ต้นหอม"
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/20"
          />
          <p className="mt-2 text-xs text-slate-500">คั่นด้วย comma หรือขึ้นบรรทัดใหม่ได้</p>
        </div>

        <button
          type="button"
          onClick={onSearch}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-400 to-amber-300 px-6 py-4 font-semibold text-slate-950 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-950/30 border-t-slate-950" />
          ) : (
            <Search className="h-5 w-5" />
          )}
          {loading ? 'กำลังจัดเมนู...' : 'สร้างเมนูแนะนำ'}
        </button>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}
    </section>
  );
}

export default SearchSection;
