import { Clock3, Salad, ShoppingCart } from 'lucide-react';

function RecipeCard({ recipe }) {
  const smartScore = recipe.recommendationScore ?? recipe.similarityScore ?? 0;

  return (
    <article className="group relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/55 p-5 shadow-glow transition hover:-translate-y-1 hover:border-orange-400/25">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-400 via-amber-300 to-emerald-300 opacity-70" />

      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200">
            <Salad className="h-3.5 w-3.5" />
            Menu Score {smartScore.toFixed(2)}
          </div>
          <h3 className="text-xl font-semibold text-white">{recipe.title}</h3>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3 text-sm text-slate-300">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1">
          <Clock3 className="h-4 w-4 text-orange-300" />
          {recipe.cookingTime} นาที
        </span>
        <span className="rounded-full bg-white/5 px-3 py-1">
          {recipe.type === 'HEALTHY' ? 'เมนูสุขภาพ' : recipe.type === 'VEGETARIAN' ? 'มังสวิรัติ' : 'ทั่วไป'}
        </span>
      </div>

      {recipe.rankingReasons?.length ? (
        <div className="mb-4 rounded-2xl border border-sky-400/15 bg-sky-400/10 p-4">
          <p className="mb-2 text-sm font-medium text-sky-100">ทำไมเมนูนี้ถึงขึ้นมา</p>
          <div className="flex flex-wrap gap-2">
            {recipe.rankingReasons.map((reason) => (
              <span
                key={reason}
                className="rounded-full border border-sky-300/20 bg-slate-950/40 px-3 py-1 text-xs text-sky-100"
              >
                {reason}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mb-4 rounded-2xl border border-white/10 bg-slate-900/70 p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-200">
          <ShoppingCart className="h-4 w-4 text-red-300" />
          วัตถุดิบที่ต้องซื้อเพิ่ม
        </div>
        {recipe.missingIngredients?.length ? (
          <div className="flex flex-wrap gap-2">
            {recipe.missingIngredients.map((ingredient) => (
              <span
                key={ingredient}
                className="rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1 text-sm font-medium text-red-200"
              >
                {ingredient}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-emerald-200">มีวัตถุดิบครบแล้ว</p>
        )}
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-slate-300">วัตถุดิบที่ตรงกับที่มีอยู่</p>
        <div className="flex flex-wrap gap-2">
          {recipe.matchedIngredients?.length ? (
            recipe.matchedIngredients.map((ingredient) => (
              <span
                key={ingredient}
                className="rounded-full border border-emerald-400/15 bg-emerald-400/10 px-3 py-1 text-sm text-emerald-100"
              >
                {ingredient}
              </span>
            ))
          ) : (
            <span className="text-sm text-slate-500">ยังไม่มีข้อมูลการจับคู่</span>
          )}
        </div>
      </div>
    </article>
  );
}

export default RecipeCard;
