const DIVIDERS = ['\u00A0', ' ', '\n', '\r'];

export function isNicknameInProgress(prev: string, current: string): boolean {
  const prevText = prev.replaceAll('\n', ' ');
  const currentText = current.replaceAll('\n', ' ');

  const addedCharIndex = findDifferentIndex(prevText, currentText);
  const addedChar = findAddedCharacter(prevText, currentText);

  if (addedChar === '@') {
    if (addedCharIndex === -1) return false;

    const charBeforeAt = addedCharIndex > 0 ? currentText[addedCharIndex - 1] : null;
    const charAfterAt = addedCharIndex < currentText.length - 1 ? currentText[addedCharIndex + 1] : null;
    const isValidAtPosition =
      (addedCharIndex === 0 && DIVIDERS.includes(charAfterAt!)) ||
      (addedCharIndex === 0 && addedCharIndex === currentText.length - 1) ||
      (addedCharIndex === currentText.length - 1 && DIVIDERS.includes(charBeforeAt!)) ||
      (DIVIDERS.includes(charBeforeAt!) && DIVIDERS.includes(charAfterAt!));

    return isValidAtPosition;
  } else {
    for (let i = addedCharIndex; i >= 0; i--) {
      if (DIVIDERS.includes(current[i])) return false;
      if (current[i] === '@') return true;
    }
    return false;
  }
}

function findAddedCharacter(prev: string, current: string): string | null {
  if (current.length === prev.length + 1 && current.startsWith(prev)) {
    return current[current.length - 1];
  }

  const diffIndex = findDifferentIndex(prev, current);
  if (diffIndex !== -1) {
    if (current.length >= prev.length && diffIndex < current.length) {
      return current[diffIndex];
    }
  }

  return null;
}

function findDifferentIndex(str1: string, str2: string): number {
  const minLength = Math.min(str1.length, str2.length);

  for (let i = 0; i < minLength; i++) {
    if (str1[i] !== str2[i] && (!DIVIDERS.includes(str1[i]) || !DIVIDERS.includes(str2[i]))) {
      return i;
    }
  }
  return minLength;
}
