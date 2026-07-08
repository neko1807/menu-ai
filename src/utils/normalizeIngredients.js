function normalizeIngredientName(value) {
  return String(value ?? '')
    .trim()
    .toLocaleLowerCase('en-US')
    .replace(/\s+/g, ' ');
}

function toUniqueNormalizedSet(values) {
  return new Set(
    (Array.isArray(values) ? values : [])
      .map(normalizeIngredientName)
      .filter(Boolean),
  );
}

module.exports = {
  normalizeIngredientName,
  toUniqueNormalizedSet,
};
