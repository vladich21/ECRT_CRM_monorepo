export function getNicknameFromText(text: string): string | null {
  if (!text) return null;

  let lastMatch = null;

  const nicknamesArray = text.split('@');

  if (text[0] === '@') nicknamesArray.unshift('');
  if (text.at(-1) === '@') nicknamesArray.push('');

  if (nicknamesArray.length > 1) return (lastMatch = nicknamesArray.at(-1)?.split(' ')[0] || null);

  return lastMatch;
}
