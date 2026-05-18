export function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.trim()
    .replace(/[<>&"']/g, (char) => ({
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      '"': '&quot;',
      "'": '&#x27;',
    }[char]));
}

export function isValid(str) {
  return typeof str === 'string' && str.trim().length > 0;
}

const levelRank = [
  { pattern: /^nursery\s*(\d+)/i, rank: 0 },
  { pattern: /^(?:kg|kindergarten)\s*(\d+)/i, rank: 1 },
  { pattern: /^creche/i, rank: 0 },
  { pattern: /^primary\s*(\d+)/i, rank: 2 },
  { pattern: /^jhs?\s*(\d+)/i, rank: 3 },
];

function parseClass(name) {
  if (!name) return { level: 999, number: 0 };
  const lower = name.toLowerCase().trim();
  for (const { pattern, rank } of levelRank) {
    const match = lower.match(pattern);
    if (match) {
      const num = match[1] ? parseInt(match[1], 10) : 1;
      return { level: rank, number: num };
    }
  }
  return { level: 999, number: 0 };
}

export function sortClasses(classes) {
  return [...classes].sort((a, b) => {
    const pa = parseClass(a.name);
    const pb = parseClass(b.name);
    if (pa.level !== pb.level) return pa.level - pb.level;
    return pa.number - pb.number;
  });
}
