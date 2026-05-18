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
