import { User } from '../../types/user';
import type { SectionPermission } from '../../shared/permissions';
import { apiClient } from '../clients';

interface CheckLoginResponse {
  tempCodeSent?: boolean;
  hasPassword?: boolean;
  email?: string;
}

interface AuthResponse {
  success?: boolean;
  user?: User;
  awaiting2FA?: boolean;
  mustChangePassword?: boolean;
  email?: string;
}

type ResendCodeStep = 'temp-code' | '2fa-code';

export const authApi = {
  checkEmail: async (email: string): Promise<CheckLoginResponse> => {
    const res = await apiClient.post<CheckLoginResponse>('/auth/check', { email });
    return res.data;
  },

  verifyPassword: async (email: string, password: string): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/auth/login', { email, password });
    return res.data;
  },

  verifyTempCode: async (email: string, code: string): Promise<{ mustChangePassword: boolean }> => {
    const res = await apiClient.post<{ mustChangePassword: boolean }>('/auth/verify-temp-code', { email, code });
    return res.data;
  },

  verify2fa: async (email: string, code: string): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/auth/verify-2fa', { email, code });
    return res.data;
  },

  resendCode: async (email: string, type: ResendCodeStep): Promise<{ success: boolean; email?: string }> => {
    const res = await apiClient.post<{ success: boolean; email?: string }>('/auth/resend-code', { email, type });
    return res.data;
  },

  setPassword: async (email: string, password: string, confirmPassword: string): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/auth/set-password', { email, password, confirmPassword });
    return res.data;
  },

  getMe: async (): Promise<{ user: User; sectionPermissions: SectionPermission[] }> => {
    const res = await apiClient.get<{ user: User; sectionPermissions?: SectionPermission[] }>('/auth/me');
    return {
      user: res.data.user,
      sectionPermissions: res.data.sectionPermissions ?? [],
    };
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },
};
