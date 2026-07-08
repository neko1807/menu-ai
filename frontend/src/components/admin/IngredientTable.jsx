function IngredientTable({ rows }) {
  const maxCount = Math.max(...rows.map((row) => row.count), 1);

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-glow backdrop-blur-xl">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">5 อันดับวัตถุดิบที่ถูกค้นหาบ่อยที่สุด</h2>
          <p className="mt-1 text-sm text-slate-400">
            ใช้ประเมินวัตถุดิบที่ผู้ใช้มักเหลือในตู้เย็น และช่วยวางแผนลด Food Waste
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {rows.map((row, index) => {
          const percentage = Math.round((row.count / maxCount) * 100);

          return (
            <div key={row.name} className="rounded-2xl border border-white/[0.08] bg-slate-950/50 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-sm font-semibold text-orange-200">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium text-white">{row.name}</p>
                    <p className="text-sm text-slate-400">{row.note}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-white">{row.count.toLocaleString()}</p>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">searches</p>
                </div>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-orange-400 to-amber-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default IngredientTable;
