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
  it('logs out only on /auth/me 401', () => {
    expect(shouldTerminateSessionOn401(err(401, '/auth/me'))).toBe(true);
    expect(shouldTerminateSessionOn401(err(401, '/contract_states'))).toBe(false);
    expect(shouldTerminateSessionOn401(err(401, '/files/abc'))).toBe(false);
  });
});
