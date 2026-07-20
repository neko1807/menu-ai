import { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock3, Loader2, Sparkles, UtensilsCrossed } from 'lucide-react';
import TopNav from '../components/layout/TopNav';
import { API_BASE_URL } from '../config/api';
import { parseJsonResponse } from '../lib/response';

const menuFlow = [
  {
    step: '01',
    title: 'ใส่วัตถุดิบที่มี',
    description: 'พิมพ์ของในตู้เย็นหรือของที่อยากใช้ แล้วให้ระบบแปลงเป็นรายการที่อ่านง่าย',
  },
  {
    step: '02',
    title: 'ตั้งเงื่อนไขเมนู',
    description: 'บอกเวลา งบประมาณ หรือสไตล์อาหารที่อยากได้ เพื่อให้ AI คัดเมนูที่ตรงขึ้น',
  },
  {
    step: '03',
    title: 'รับเมนูพร้อมวิธีทำ',
    description: 'menu-ai จะสรุปเมนูที่ทำได้จริง พร้อมวัตถุดิบที่ต้องซื้อเพิ่มและขั้นตอนทำ',
  },
];

const quickIngredientExamples = ['ไข่ไก่', 'หมูสับ', 'ข้าวสวย', 'เต้าหู้', 'หอมใหญ่', 'มะเขือเทศ'];

const starterStats = [
  { label: 'เมนูที่ตรงกับของที่มี', value: 'AI คัดให้' },
  { label: 'กำหนดเงื่อนไขที่ต้องการ', value: 'รสชาติ เวลา\nความยาก-ง่าย' },
  { label: 'สิ่งที่ต้องซื้อเพิ่ม', value: 'เห็นชัดก่อนซื้อ' },
];

function parseIngredients(text) {
  return text
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeIngredientName(item) {
  if (typeof item === 'string') {
    return item;
  }

  return item?.name ?? '';
}

function UserHome() {
  const [inputText, setInputText] = useState('ไข่ไก่, หมูสับ, หอมใหญ่, ข้าวสวย');
  const [aiNotes, setAiNotes] = useState('อยากได้เมนูง่าย ๆ ทำใน 15-20 นาที');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiRecipe, setAiRecipe] = useState(null);

  const ingredients = useMemo(() => parseIngredients(inputText), [inputText]);

  async function handleAiGenerate() {
    if (ingredients.length === 0) {
      setAiError('กรุณากรอกวัตถุดิบอย่างน้อย 1 รายการ');
      return;
    }

    setAiLoading(true);
    setAiError('');
    setAiRecipe(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/recipe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ingredients,
          notes: aiNotes,
        }),
      });

      const data = await parseJsonResponse(response);

      if (!response.ok || !data.recipeIdea) {
        throw new Error(data.message || 'ไม่สามารถสร้างเมนูจาก AI ได้');
      }

      setAiRecipe(data.recipeIdea);
    } catch (error) {
      setAiRecipe(null);
      setAiError(error.message || 'ไม่สามารถเชื่อมต่อ Gemini ได้ กรุณาลองใหม่');
    } finally {
      setAiLoading(false);
    }
  }

  const usedIngredients = (aiRecipe?.usedIngredients || []).map(normalizeIngredientName).filter(Boolean);
  const missingIngredients = (aiRecipe?.missingIngredients || []).map(normalizeIngredientName).filter(Boolean);
  const steps = aiRecipe?.steps || [];
  const tips = aiRecipe?.tips || [];

  return (
    <div id="top" className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(251,146,60,0.18),_transparent_24%),radial-gradient(circle_at_85%_0%,_rgba(217,119,6,0.18),_transparent_22%),linear-gradient(180deg,_#020617_0%,_#0f172a_44%,_#111827_100%)]">
      <TopNav />

      <main className="mx-auto flex max-w-[1200px] flex-col gap-6 px-6 py-8">
        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-glow backdrop-blur-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-400/25 bg-orange-400/10 px-3 py-1 text-sm text-orange-200">
              <Sparkles className="h-4 w-4" />
              menu-ai
            </div>
            <h1 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight text-white xl:text-5xl">
              มีวัตถุดิบอยู่แล้ว? ให้ menu-ai ช่วยจัดเมนูที่ทำได้จริงให้เลย
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 xl:text-base">
              พิมพ์ของที่มีในบ้าน แล้วระบบจะจับคู่เป็นเมนูที่เหมาะที่สุด พร้อมบอกว่าต้องซื้อเพิ่มอะไร ใช้เวลากี่นาที
              และควรเริ่มทำยังไง
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {starterStats.map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
                  <p className="mt-2 whitespace-pre-line text-lg font-semibold text-white">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <p className="text-sm font-medium text-slate-300">ตัวอย่างวัตถุดิบที่ใช้บ่อย</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {quickIngredientExamples.map((ingredient) => (
                  <span
                    key={ingredient}
                    className="rounded-full border border-orange-400/20 bg-orange-400/10 px-3 py-1 text-sm text-orange-100"
                  >
                    {ingredient}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/75 p-6 shadow-glow backdrop-blur-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-sm text-emerald-200">
              <UtensilsCrossed className="h-4 w-4" />
              How it works
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-white">เส้นทางจากของในตู้เย็นไปสู่เมนูพร้อมเสิร์ฟ</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              menu-ai ไม่ได้แค่สร้างเมนู แต่ช่วยตัดสินใจว่า “วันนี้ควรทำอะไร” จากของที่มีอยู่จริง
            </p>

            <div className="mt-5 space-y-3">
              {menuFlow.map((item) => (
                <div key={item.step} className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-400/10 text-sm font-semibold text-orange-200">
                      {item.step}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white">{item.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-400">{item.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="menu-builder"
          className="rounded-3xl border border-white/10 bg-slate-900/75 p-6 shadow-glow backdrop-blur-xl"
        >
          <div className="grid gap-4">
            <div className="inline-flex items-center gap-2 text-slate-200">
              <Sparkles className="h-4 w-4 text-orange-300" />
              <span className="text-sm font-medium">ตัวสร้างเมนู</span>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-white">กรอกวัตถุดิบแล้วให้ AI จัดเมนูให้</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                พิมพ์วัตถุดิบแบบคั่นด้วย comma หรือขึ้นบรรทัดใหม่ได้เลย แล้วบอกเงื่อนไขที่อยากได้เพิ่ม เช่น ทำง่าย ใช้เวลาน้อย หรืออยากได้เมนูสุขภาพ
              </p>
            </div>

            <div className="grid gap-4">
              <div>
                <label className="mb-2 block text-sm text-slate-400">วัตถุดิบที่มี</label>
                <textarea
                  value={inputText}
                  onChange={(event) => setInputText(event.target.value)}
                  rows={4}
                  placeholder="เช่น ไข่ไก่, หมูสับ, ข้าวสวย"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/20"
                />
                <p className="mt-2 text-xs text-slate-500">คั่นด้วย comma หรือกดขึ้นบรรทัดใหม่เพื่อเพิ่มหลายรายการได้</p>
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-400">เงื่อนไขเมนูเพิ่มเติม</label>
                <textarea
                  value={aiNotes}
                  onChange={(event) => setAiNotes(event.target.value)}
                  rows={3}
                  placeholder="เช่น อยากได้เมนูง่าย ๆ ทำใน 15 นาที"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/20"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <button
                type="button"
                onClick={handleAiGenerate}
                disabled={aiLoading}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-orange-400 px-6 py-3 font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {aiLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                {aiLoading ? 'กำลังขอเมนูจาก Gemini...' : 'สร้างเมนูด้วย Gemini'}
              </button>

              <div className="text-sm text-slate-400">
                วัตถุดิบที่กรอก: <span className="text-white">{ingredients.length}</span> รายการ
              </div>
            </div>

            {aiError ? (
              <div className="flex items-start gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{aiError}</span>
              </div>
            ) : null}
          </div>
        </section>

        {aiRecipe ? (
          <section className="rounded-3xl border border-white/10 bg-slate-900/75 p-6 shadow-glow backdrop-blur-xl">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-400/10 px-3 py-1 text-sm text-orange-200">
                  <CheckCircle2 className="h-4 w-4" />
                  ผลลัพธ์จาก menu-ai
                </div>
                <h2 className="mt-4 text-2xl font-semibold text-white">{aiRecipe.title}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{aiRecipe.summary}</p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200">
                <Clock3 className="h-4 w-4" />
                {aiRecipe.estimatedCookingTime} นาที • {aiRecipe.difficulty}
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <InfoCard
                icon={CheckCircle2}
                title="วัตถุดิบที่ใช้ได้"
                items={usedIngredients}
                emptyText="ยังไม่มีรายการ"
              />
              <InfoCard
                icon={AlertCircle}
                title="วัตถุดิบที่ยังต้องซื้อ"
                items={missingIngredients}
                emptyText="ไม่ต้องซื้อเพิ่ม"
                tone="warning"
              />
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
                <p className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-200">
                  <UtensilsCrossed className="h-4 w-4 text-orange-300" />
                  ขั้นตอนทำ
                </p>
                <ol className="space-y-2">
                  {steps.map((step, index) => (
                    <li
                      key={`${step}-${index}`}
                      className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm leading-6 text-slate-300"
                    >
                      <span className="mr-2 text-orange-300">{index + 1}.</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
                <p className="mb-3 text-sm font-medium text-slate-200">เคล็ดลับ</p>
                <div className="space-y-2">
                  {tips.map((tip) => (
                    <div key={tip} className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm leading-6 text-slate-300">
                      {tip}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <p className="mt-4 text-xs text-slate-500">แหล่งผลลัพธ์: Gemini</p>
          </section>
        ) : null}
      </main>
    </div>
  );
}

function InfoCard({ icon: Icon, title, items, emptyText, tone = 'default' }) {
  const toneClasses =
    tone === 'warning'
      ? 'border-amber-400/20 bg-amber-400/10 text-amber-100'
      : 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100';

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
      <p className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-200">
        <Icon className={`h-4 w-4 ${tone === 'warning' ? 'text-amber-300' : 'text-emerald-300'}`} />
        {title}
      </p>
      <div className="flex flex-wrap gap-2">
        {items.length ? (
          items.map((item) => (
            <span key={item} className={`rounded-full border px-3 py-1 text-sm ${toneClasses}`}>
              {item}
            </span>
          ))
        ) : (
          <span className="text-sm text-slate-500">{emptyText}</span>
        )}
      </div>
    </div>
  );
}

export default UserHome;
