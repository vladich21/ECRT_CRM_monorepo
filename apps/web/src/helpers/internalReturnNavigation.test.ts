import { describe, expect, it } from 'vitest';

import {
  getInternalReturnBackLabel,
  isSafeInternalReturnPath,
  resolveInternalReturnPath,
} from './internalReturnNavigation';

describe('internalReturnNavigation', () => {
  it('returns to patent grant detail with proper label', () => {
    const grantPath = '/patent-grants/9e05c330-74fc-4a9b-8ab6-ea63d8049aab';
    expect(resolveInternalReturnPath(grantPath, '/projects')).toBe(grantPath);
    expect(getInternalReturnBackLabel(grantPath, 'Проекты')).toBe('К охранному документу');
  });

  it('rejects unsafe return paths', () => {
    expect(isSafeInternalReturnPath('//evil.example')).toBe(false);
    expect(resolveInternalReturnPath('//evil.example', '/projects')).toBe('/projects');
  });
});
