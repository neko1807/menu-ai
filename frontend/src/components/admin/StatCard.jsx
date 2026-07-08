function StatCard({ title, value, description, icon: Icon, accent = 'orange' }) {
  const accentClass =
    accent === 'emerald'
      ? 'from-emerald-400/20 to-emerald-300/5 border-emerald-400/20 text-emerald-200'
      : accent === 'sky'
        ? 'from-sky-400/20 to-sky-300/5 border-sky-400/20 text-sky-200'
        : 'from-orange-400/20 to-orange-300/5 border-orange-400/20 text-orange-200';

  return (
    <article className={`rounded-3xl border bg-gradient-to-br p-5 shadow-glow ${accentClass}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-300">{title}</p>
          <h3 className="mt-2 text-3xl font-semibold text-white">{value}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-white">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </article>
  );
}

export default StatCard;
