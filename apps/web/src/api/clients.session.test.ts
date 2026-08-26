import { type AxiosError } from 'axios';
import { describe, expect, it } from 'vitest';

import { shouldTerminateSessionOn401 } from './clients';

function err(status: number, url: string, baseURL = 'http://192.0.2.19:3002/api'): AxiosError {
  return {
    isAxiosError: true,
    response: { status, data: {}, statusText: 'Unauthorized', headers: {}, config: {} },
    config: { url, baseURL },
    name: 'AxiosError',
    message: '401',
    toJSON: () => ({}),
  } as AxiosError;
}

describe('shouldTerminateSessionOn401', () => {
  it('logs out only on same-origin /auth/me 401', () => {
    expect(shouldTerminateSessionOn401(err(401, '/auth/me'))).toBe(true);
  });

  it('does not log out on contracts 401', () => {
    expect(shouldTerminateSessionOn401(err(401, '/contract_states'))).toBe(false);
  });

  it('does not log out on files-service 401', () => {
    expect(
      shouldTerminateSessionOn401(
        err(401, 'http://192.0.2.19:3080/api/v1/files/e352a262-0b45-47e3-890f-c8c827c029ff'),
      ),
    ).toBe(false);
  });

  it('does not log out on pmdb /files/{id} 401', () => {
    expect(shouldTerminateSessionOn401(err(401, '/files/e352a262-0b45-47e3-890f-c8c827c029ff'))).toBe(
      false,
    );
  });
});
