/**
 * Clean shop name according to specification rules:
 * - Remove spaces and punctuation
 * - Remove bracket contents e.g. (望京SOHO店)
 * - Remove company suffixes (e.g. 有限公司)
 * - Remove store suffixes (e.g. 总店, 分店, 旗舰店, 门店, 加盟店)
 * - Normalize case and unicode characters
 */
export function cleanShopName(
  name: string,
  userRegexPattern?: string
): string {
  if (!name) return '';

  let cleaned = name.trim();

  // Remove bracketed text: (xxx) or （xxx） or [xxx]
  cleaned = cleaned.replace(/\(.*?\)|（.*?）|\[.*?\]/g, '');

  // Default suffix regex if none provided
  const defaultSuffixes = /(总店|分店|有限公司|加盟店|旗舰店|门店|责任公司)$/gi;
  
  if (userRegexPattern) {
    try {
      const customRegex = new RegExp(userRegexPattern, 'gi');
      cleaned = cleaned.replace(customRegex, '');
    } catch {
      cleaned = cleaned.replace(defaultSuffixes, '');
    }
  } else {
    cleaned = cleaned.replace(defaultSuffixes, '');
  }

  // Remove punctuation, special characters, spaces
  cleaned = cleaned.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '');

  // Normalize case
  return cleaned.toLowerCase();
}

/**
 * Levenshtein distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          )
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Character set Jaccard similarity
 */
export function jaccardSimilarity(str1: string, str2: string): number {
  if (!str1 && !str2) return 1.0;
  if (!str1 || !str2) return 0.0;

  const set1 = new Set(str1.split(''));
  const set2 = new Set(str2.split(''));

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

/**
 * Combined similarity score combining Levenshtein ratio & Jaccard character similarity
 */
export function calculateNameSimilarity(name1: string, name2: string, regexPattern?: string): {
  similarity: number;
  cleaned1: string;
  cleaned2: string;
} {
  const cleaned1 = cleanShopName(name1, regexPattern);
  const cleaned2 = cleanShopName(name2, regexPattern);

  if (!cleaned1 && !cleaned2) return { similarity: 1, cleaned1, cleaned2 };
  if (!cleaned1 || !cleaned2) return { similarity: 0, cleaned1, cleaned2 };

  if (cleaned1 === cleaned2) return { similarity: 1, cleaned1, cleaned2 };

  const maxLen = Math.max(cleaned1.length, cleaned2.length);
  const dist = levenshteinDistance(cleaned1, cleaned2);
  const levRatio = 1 - dist / maxLen;

  const jaccard = jaccardSimilarity(cleaned1, cleaned2);

  // Weighted average: 60% Levenshtein ratio, 40% Jaccard character overlap
  const finalScore = levRatio * 0.6 + jaccard * 0.4;

  return {
    similarity: Math.round(finalScore * 100) / 100,
    cleaned1,
    cleaned2,
  };
}
