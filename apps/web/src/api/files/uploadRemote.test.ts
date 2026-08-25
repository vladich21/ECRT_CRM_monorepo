import { describe, expect, it } from 'vitest';

import { parseUploadFormData } from './uploadRemote';

describe('parseUploadFormData', () => {
  it('читает файлы и метаданные из FormData', () => {
    const formData = new FormData();
    formData.append('file1', new File(['hello'], 'a.txt', { type: 'text/plain' }));
    formData.append('entityType', 'contract');
    formData.append('entityId', '11111111-1111-1111-1111-111111111111');
    formData.append('documentSection', 'requests');
    formData.append('responseRequired', 'true');
    formData.append('responseDeadline', '2026-08-20');

    const parsed = parseUploadFormData(formData);
    expect(parsed.files).toHaveLength(1);
    expect(parsed.files[0].name).toBe('a.txt');
    expect(parsed.meta).toEqual({
      entityType: 'contract',
      entityId: '11111111-1111-1111-1111-111111111111',
      documentSection: 'requests',
      responseRequired: true,
      responseDeadline: '2026-08-20',
    });
  });
});
