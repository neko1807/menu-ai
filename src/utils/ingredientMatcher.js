const { normalizeIngredientName } = require('./normalizeIngredients');

function stripDiacritics(value) {
  return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}

function levenshteinDistance(left, right) {
  const a = String(left ?? '');
  const b = String(right ?? '');

  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const previousRow = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let rowIndex = 1; rowIndex <= a.length; rowIndex += 1) {
    let previousDiagonal = previousRow[0];
    previousRow[0] = rowIndex;

    for (let columnIndex = 1; columnIndex <= b.length; columnIndex += 1) {
      const savedValue = previousRow[columnIndex];
      const substitutionCost = a[rowIndex - 1] === b[columnIndex - 1] ? 0 : 1;
      previousRow[columnIndex] = Math.min(
        previousRow[columnIndex] + 1,
        previousRow[columnIndex - 1] + 1,
        previousDiagonal + substitutionCost,
      );
      previousDiagonal = savedValue;
    }
  }

  return previousRow[b.length];
}

function normalizeSearchTerm(value) {
  return normalizeIngredientName(stripDiacritics(value))
    .replace(/[^A-Za-z0-9\u0E00-\u0E7F\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function createIngredientMatcher(ingredients = []) {
  const exactNameMap = new Map();
  const exactAliasMap = new Map();
  const candidates = [];

  for (const ingredient of ingredients) {
    const normalizedName = normalizeSearchTerm(ingredient.name);
    const canonicalEntry = {
      ingredientId: ingredient.id,
      ingredientName: ingredient.name,
      normalizedLabel: normalizedName,
      source: 'ingredient',
    };

    if (normalizedName) {
      exactNameMap.set(normalizedName, canonicalEntry);
      candidates.push(canonicalEntry);
    }

    for (const aliasRecord of ingredient.aliases || []) {
      const aliasLabel = aliasRecord.alias || aliasRecord.normalizedAlias;
      const normalizedAlias = normalizeSearchTerm(aliasRecord.normalizedAlias || aliasLabel);
      const aliasEntry = {
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        normalizedLabel: normalizedAlias,
        source: 'alias',
        alias: aliasLabel,
      };

      if (!normalizedAlias) {
        continue;
      }

      exactAliasMap.set(normalizedAlias, aliasEntry);
      candidates.push(aliasEntry);
    }
  }

  return {
    exactAliasMap,
    exactNameMap,
    candidates,
  };
}

function scoreCandidate(input, candidate) {
  const normalizedInput = normalizeSearchTerm(input);
  const normalizedCandidate = candidate.normalizedLabel || normalizeSearchTerm(candidate.ingredientName);

  if (!normalizedInput || !normalizedCandidate) {
    return 0;
  }

  if (normalizedInput === normalizedCandidate) {
    return 1;
  }

  const distance = levenshteinDistance(normalizedInput, normalizedCandidate);
  const maxLength = Math.max(normalizedInput.length, normalizedCandidate.length);
  const similarity = 1 - distance / Math.max(1, maxLength);

  if (normalizedCandidate.includes(normalizedInput) || normalizedInput.includes(normalizedCandidate)) {
    return Math.max(similarity, 0.88);
  }

  if (distance <= 1 && maxLength <= 6) {
    return Math.max(similarity, 0.9);
  }

  if (distance <= 2 && maxLength <= 10) {
    return Math.max(similarity, 0.84);
  }

  return similarity;
}

function getBestIngredientMatch(input, matcher) {
  const normalizedInput = normalizeSearchTerm(input);

  if (!normalizedInput) {
    return null;
  }

  const directNameMatch = matcher.exactNameMap.get(normalizedInput);
  if (directNameMatch) {
    return { ...directNameMatch, matchedBy: 'name', score: 1 };
  }

  const directAliasMatch = matcher.exactAliasMap.get(normalizedInput);
  if (directAliasMatch) {
    return { ...directAliasMatch, matchedBy: 'alias', score: 1 };
  }

  let bestMatch = null;

  for (const candidate of matcher.candidates) {
    const score = scoreCandidate(normalizedInput, candidate);

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = {
        ...candidate,
        matchedBy: candidate.source,
        score,
      };
    }
  }

  if (!bestMatch) {
    return null;
  }

  const length = normalizedInput.length;
  const threshold = length <= 4 ? 0.6 : length <= 8 ? 0.68 : 0.75;

  if (bestMatch.score < threshold) {
    return null;
  }

  return bestMatch;
}

function resolveIngredientInputs(rawInputs, matcher) {
  const normalizedSeen = new Set();
  const resolvedIngredients = [];
  const unresolvedIngredients = [];
  const matchDetails = [];

  for (const rawInput of Array.isArray(rawInputs) ? rawInputs : []) {
    const original = String(rawInput ?? '').trim();
    const normalized = normalizeSearchTerm(original);

    if (!normalized || normalizedSeen.has(normalized)) {
      continue;
    }

    normalizedSeen.add(normalized);

    const bestMatch = getBestIngredientMatch(original, matcher);

    if (!bestMatch) {
      unresolvedIngredients.push(original);
      continue;
    }

    if (!resolvedIngredients.some((item) => item.id === bestMatch.ingredientId)) {
      resolvedIngredients.push({
        id: bestMatch.ingredientId,
        name: bestMatch.ingredientName,
      });
    }

    matchDetails.push({
      input: original,
      ingredientId: bestMatch.ingredientId,
      ingredientName: bestMatch.ingredientName,
      matchedBy: bestMatch.matchedBy,
      score: Number(bestMatch.score.toFixed(3)),
    });
  }

  return {
    resolvedIngredients,
    unresolvedIngredients,
    matchDetails,
  };
}

module.exports = {
  createIngredientMatcher,
  getBestIngredientMatch,
  levenshteinDistance,
  normalizeSearchTerm,
  resolveIngredientInputs,
};
