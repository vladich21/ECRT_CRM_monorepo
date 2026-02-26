import { User } from '../../types/user';
import { loginClient } from '../clients';

interface LoginDTO {
  login: string;
  pass: string;
}

interface AuthResponse {
  data: User[];
  JWT: string;
}

export const authApi = {
  login: async (credentials: LoginDTO): Promise<AuthResponse> => {
    if (import.meta.env.DEV) {
      console.log('[authApi.login] URL:', loginClient.defaults.baseURL, 'login:', credentials.login);
    }
    try {
      const response = await loginClient.post('/auth', credentials);
      if (import.meta.env.DEV) {
        console.log('[authApi.login] success, JWT:', !!response.data?.JWT);
      }
      return response.data;
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[authApi.login] failed:', err);
      }
      throw err;
    }
  },
};
