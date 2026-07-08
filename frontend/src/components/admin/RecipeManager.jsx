import { useEffect, useMemo, useState } from 'react';
import { Loader2, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { API_BASE_URL } from '../../auth/authConfig';
import { parseJsonResponse } from '../../lib/response';

const emptyIngredientRow = () => ({
  ingredientId: '',
  quantity: '',
  unit: '',
});

const initialForm = () => ({
  title: '',
  instruction: '',
  cookingTime: '',
  type: 'GENERAL',
  ingredients: [emptyIngredientRow()],
});

function RecipeManager() {
  const { authFetch } = useAuth();
  const [recipes, setRecipes] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [editingRecipeId, setEditingRecipeId] = useState('');
  const [form, setForm] = useState(initialForm);

  const ingredientMap = useMemo(
    () => new Map(ingredients.map((ingredient) => [ingredient.id, ingredient.name])),
    [ingredients],
  );

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      const [recipesResponse, ingredientsResponse] = await Promise.all([
        authFetch(`${API_BASE_URL}/api/admin/recipes`),
        authFetch(`${API_BASE_URL}/api/admin/ingredients`),
      ]);

      if (!recipesResponse.ok) {
        throw new Error('Failed to load recipes');
      }

      if (!ingredientsResponse.ok) {
        throw new Error('Failed to load ingredients');
      }

      const recipesData = await parseJsonResponse(recipesResponse);
      const ingredientsData = await parseJsonResponse(ingredientsResponse);

      setRecipes(recipesData.recipes || []);
      setIngredients(ingredientsData.ingredients || []);
    } catch (loadError) {
      setError(loadError.message || 'ไม่สามารถโหลดข้อมูลเมนูได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetForm() {
    setEditingRecipeId('');
    setForm(initialForm());
    setFormError('');
  }

  function editRecipe(recipe) {
    setEditingRecipeId(recipe.id);
    setForm({
      title: recipe.title,
      instruction: recipe.instruction,
      cookingTime: String(recipe.cookingTime),
      type: recipe.type,
      ingredients:
        recipe.ingredients?.length > 0
          ? recipe.ingredients.map((ingredient) => ({
              ingredientId: ingredient.ingredientId,
              quantity: String(ingredient.quantity),
              unit: ingredient.unit,
            }))
          : [emptyIngredientRow()],
    });
    setFormError('');
  }

  function updateFormField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateIngredientRow(index, field, value) {
    setForm((current) => ({
      ...current,
      ingredients: current.ingredients.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row,
      ),
    }));
  }

  function addIngredientRow() {
    setForm((current) => ({
      ...current,
      ingredients: [...current.ingredients, emptyIngredientRow()],
    }));
  }

  function removeIngredientRow(index) {
    setForm((current) => {
      const nextIngredients = current.ingredients.filter((_, rowIndex) => rowIndex !== index);
      return {
        ...current,
        ingredients: nextIngredients.length ? nextIngredients : [emptyIngredientRow()],
      };
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');

    const title = form.title.trim();
    const instruction = form.instruction.trim();
    const cookingTime = Number.parseInt(form.cookingTime, 10);
    const ingredientsPayload = form.ingredients
      .map((row) => ({
        ingredientId: row.ingredientId,
        quantity: Number(row.quantity),
        unit: row.unit.trim(),
      }))
      .filter((row) => row.ingredientId && row.unit && Number.isFinite(row.quantity) && row.quantity > 0);

    if (!title || !instruction || !form.type || !Number.isFinite(cookingTime)) {
      setFormError('กรุณากรอกชื่อเมนู, วิธีทำ, เวลาทำอาหาร และประเภทเมนูให้ครบ');
      return;
    }

    if (!ingredientsPayload.length) {
      setFormError('กรุณาใส่วัตถุดิบอย่างน้อย 1 รายการ');
      return;
    }

    setSaving(true);

    try {
      const response = await authFetch(
        `${API_BASE_URL}/api/admin/recipes${editingRecipeId ? `/${editingRecipeId}` : ''}`,
        {
          method: editingRecipeId ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title,
            instruction,
            cookingTime,
            type: form.type,
            ingredients: ingredientsPayload,
          }),
        },
      );

      const data = await safeJson(response);

      if (!response.ok) {
        throw new Error(data.message || 'ไม่สามารถบันทึกเมนูได้');
      }

      await loadData();
      resetForm();
    } catch (submitError) {
      setFormError(submitError.message || 'ไม่สามารถบันทึกเมนูได้');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(recipeId) {
    const confirmed = window.confirm('ต้องการลบเมนูนี้ใช่ไหม?');
    if (!confirmed) {
      return;
    }

    try {
      const response = await authFetch(
        `${API_BASE_URL}/api/admin/recipes/${recipeId}`,
        {
          method: 'DELETE',
        },
      );

      if (!response.ok && response.status !== 204) {
        const data = await safeJson(response);
        throw new Error(data.message || 'ไม่สามารถลบเมนูได้');
      }

      if (editingRecipeId === recipeId) {
        resetForm();
      }

      await loadData();
    } catch (deleteError) {
      setError(deleteError.message || 'ไม่สามารถลบเมนูได้');
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-glow backdrop-blur-xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Menu CRUD</h2>
            <p className="mt-1 text-sm text-slate-400">เพิ่ม แก้ไข และลบเมนูอาหาร พร้อมจัดการวัตถุดิบในฟอร์มเดียว</p>
          </div>
          <button
            type="button"
            onClick={resetForm}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:border-white/20 hover:bg-white/10"
          >
            <Plus className="h-4 w-4" />
            เพิ่มใหม่
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm text-slate-300">ชื่อเมนู</label>
            <input
              value={form.title}
              onChange={(event) => updateFormField('title', event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/20"
              placeholder="เช่น ไข่เจียวหมูสับ"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">วิธีทำ / คำอธิบาย</label>
            <textarea
              value={form.instruction}
              onChange={(event) => updateFormField('instruction', event.target.value)}
              rows={5}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/20"
              placeholder="อธิบายขั้นตอนทำอาหารแบบเข้าใจง่าย"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-slate-300">เวลาทำอาหาร (นาที)</label>
              <input
                type="number"
                min="1"
                value={form.cookingTime}
                onChange={(event) => updateFormField('cookingTime', event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/20"
                placeholder="15"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">ประเภทเมนู</label>
              <select
                value={form.type}
                onChange={(event) => updateFormField('type', event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/20"
              >
                <option value="GENERAL">ทั่วไป</option>
                <option value="HEALTHY">สุขภาพ</option>
                <option value="VEGETARIAN">มังสวิรัติ</option>
              </select>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-white">วัตถุดิบ</h3>
                <p className="text-sm text-slate-400">เลือกวัตถุดิบและระบุปริมาณกับหน่วย</p>
              </div>
              <button
                type="button"
                onClick={addIngredientRow}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:border-white/20 hover:bg-white/10"
              >
                <Plus className="h-4 w-4" />
                เพิ่มวัตถุดิบ
              </button>
            </div>

            <div className="space-y-3">
              {form.ingredients.map((row, index) => (
                <div key={`${index}-${row.ingredientId || 'empty'}`} className="grid gap-3 xl:grid-cols-[1.3fr_0.5fr_0.5fr_auto]">
                  <select
                    value={row.ingredientId}
                    onChange={(event) => updateIngredientRow(index, 'ingredientId', event.target.value)}
                    className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/20"
                  >
                    <option value="">เลือกวัตถุดิบ</option>
                    {ingredients.map((ingredient) => (
                      <option key={ingredient.id} value={ingredient.id}>
                        {ingredient.name}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={row.quantity}
                    onChange={(event) => updateIngredientRow(index, 'quantity', event.target.value)}
                    className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/20"
                    placeholder="2"
                  />

                  <input
                    value={row.unit}
                    onChange={(event) => updateIngredientRow(index, 'unit', event.target.value)}
                    className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/20"
                    placeholder="ฟอง"
                  />

                  <button
                    type="button"
                    onClick={() => removeIngredientRow(index)}
                    className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-slate-300 transition hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-200"
                    aria-label="Remove ingredient"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {formError ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {formError}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-400 to-amber-300 px-5 py-3 font-semibold text-slate-950 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {editingRecipeId ? 'บันทึกการแก้ไข' : 'สร้างเมนู'}
            </button>

            {editingRecipeId ? (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/10"
              >
                ยกเลิกการแก้ไข
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-glow backdrop-blur-xl">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">รายการเมนู</h2>
            <p className="mt-1 text-sm text-slate-400">กดแก้ไขเพื่อโหลดข้อมูลกลับเข้าฟอร์ม</p>
          </div>
          <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-sm text-emerald-200">
            {recipes.length} เมนู
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-3xl border border-dashed border-white/15 bg-slate-950/30 p-10 text-center text-slate-400">
            กำลังโหลดข้อมูลเมนู...
          </div>
        ) : recipes.length ? (
          <div className="space-y-4">
            {recipes.map((recipe) => (
              <article key={recipe.id} className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{recipe.title}</h3>
                    <p className="mt-1 text-sm text-slate-400">
                      {recipe.cookingTime} นาที • {formatRecipeType(recipe.type)} • {recipe.ingredients.length} วัตถุดิบ
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => editRecipe(recipe)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-sky-400/20 bg-sky-400/10 px-3 py-2 text-sm text-sky-100 transition hover:bg-sky-400/20"
                    >
                      <Pencil className="h-4 w-4" />
                      แก้ไข
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(recipe.id)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-100 transition hover:bg-red-500/20"
                    >
                      <Trash2 className="h-4 w-4" />
                      ลบ
                    </button>
                  </div>
                </div>

                <p className="text-sm leading-6 text-slate-300">{recipe.instruction}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {recipe.ingredients.map((ingredient) => (
                    <span
                      key={`${recipe.id}-${ingredient.ingredientId}`}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-200"
                    >
                      {ingredient.ingredientName} · {ingredient.quantity} {ingredient.unit}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-white/15 bg-slate-950/30 p-10 text-center text-slate-400">
            ยังไม่มีเมนูในระบบ
          </div>
        )}
      </section>
    </div>
  );
}

async function safeJson(response) {
  return parseJsonResponse(response);
}

function formatRecipeType(type) {
  if (type === 'HEALTHY') return 'สุขภาพ';
  if (type === 'VEGETARIAN') return 'มังสวิรัติ';
  return 'ทั่วไป';
}

export default RecipeManager;
