import { ChefHat } from 'lucide-react';

const portfolioUrl =
  import.meta.env.VITE_PORTFOLIO_URL?.trim() || 'https://neko1807.github.io/My-First-Portfolio/';

function TopNav() {
  return (
    <div className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/75 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-6 py-4">
        <a href="#top" className="flex items-center gap-3 text-white transition hover:opacity-90">
          <div className="rounded-2xl bg-orange-400/10 p-2 text-orange-300">
            <ChefHat className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold leading-5">menu-ai</p>
            <p className="text-xs text-slate-400">วัตถุดิบ → เมนูที่ทำได้จริง</p>
          </div>
        </a>

        <div className="flex items-center gap-3">
          <a
            href={portfolioUrl}
            className="inline-flex items-center rounded-full border border-orange-400/20 bg-orange-400/10 px-4 py-2 text-xs font-medium text-orange-100 transition hover:bg-orange-400/15 hover:text-white"
          >
            กลับ Portfolio
          </a>
          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-300 md:inline-flex">
            <span className="h-2 w-2 rounded-full bg-emerald-300" />
            พร้อมจัดเมนูจากสิ่งที่มี
          </div>
        </div>
      </div>
    </div>
  );
}

export default TopNav;
