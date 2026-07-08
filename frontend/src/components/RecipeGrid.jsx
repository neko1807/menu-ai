import RecipeCard from './RecipeCard';

function RecipeGrid({ recipes }) {
  if (!recipes.length) {
    return (
      <div className="rounded-3xl border border-dashed border-white/15 bg-slate-950/30 p-10 text-center text-slate-400">
        ไม่พบเมนูที่ตรงกับวัตถุดิบที่กรอก
      </div>
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-2 2xl:grid-cols-3">
      {recipes.map((recipe) => (
        <RecipeCard key={recipe.id} recipe={recipe} />
      ))}
    </div>
  );
}

export default RecipeGrid;
