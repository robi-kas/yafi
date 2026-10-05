export function normalizeSymbol(original: string | null | undefined): { displaySymbol: string, confidence: string, method: string } {
  if (!original) return { displaySymbol: '', confidence: 'LOW', method: 'MISSING' };
  
  let norm = original.trim().toUpperCase();
  let confidence = 'HIGH';
  let method = 'EXACT';

  // Suffix stripping
  if (norm.endsWith('.X') || norm.endsWith('M') || norm.endsWith('.A') || norm.endsWith('.P') || norm.endsWith('.RAW')) {
    norm = norm.replace(/\.X$/, '').replace(/M$/, '').replace(/\.A$/, '').replace(/\.P$/, '').replace(/\.RAW$/, '');
    method = 'SUFFIX_STRIP';
  }

  // Index aliases
  const aliasMap: Record<string, string> = {
    'US100': 'NAS100',
    'USTEC': 'NAS100',
    'US30': 'DOW30',
    'DJ30': 'DOW30'
  };

  if (aliasMap[norm]) {
    norm = aliasMap[norm];
    method = 'INDEX_ALIAS';
  }

  return { displaySymbol: norm, confidence, method };
}
