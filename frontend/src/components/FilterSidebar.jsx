import { Filter } from 'lucide-react';

function FilterSidebar({ options, selected, onSelect }) {
  return (
    <aside className="rounded-3xl border border-white/10 bg-slate-900/75 p-5 shadow-glow backdrop-blur-xl">
      <div className="mb-5 flex items-center gap-2">
        <Filter className="h-4 w-4 text-orange-300" />
        <h2 className="text-lg font-semibold text-white">Filter Sidebar</h2>
      </div>

      <div className="space-y-2">
        {options.map((option) => {
          const Icon = option.icon;
          const active = selected === option.key;

          return (
            <button
              key={option.key}
              type="button"
              onClick={() => onSelect(option.key)}
              className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                active
                  ? 'border-orange-400/40 bg-orange-400/10 text-orange-200'
                  : 'border-white/10 bg-slate-950/40 text-slate-300 hover:border-white/20 hover:bg-white/5'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="font-medium">{option.label}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

export default FilterSidebar;
