import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// In-memory access token (not localStorage — XSS protection)
let accessToken: string | null = null;
let refreshPromise: Promise<void> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

const api: AxiosInstance = axios.create({
  baseURL: `${API_URL}/api/v1`,
  withCredentials: true, // Send httpOnly refresh token cookie
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach access token
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Response interceptor — handle 401 → refresh token
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      if (!refreshPromise) {
        refreshPromise = axios
          .post(`${API_URL}/api/v1/auth/refresh`, {}, { withCredentials: true })
          .then((res) => {
            setAccessToken(res.data.accessToken);
          })
          .catch(() => {
            setAccessToken(null);
            window.location.href = '/login';
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      await refreshPromise;

      if (accessToken) {
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      }
    }

    return Promise.reject(error);
  },
);

// Typed API helpers
export const authApi = {
  register: (data: { email: string; password: string; firstName: string; lastName: string; organizationName: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post<{ accessToken: string; user: User; organizations: OrgMembership[] }>('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  refresh: () => api.post<{ accessToken: string }>('/auth/refresh'),
  me: () => api.get<{ user: User }>('/auth/me'),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) => api.post('/auth/reset-password', { token, password }),
};

export function orgApi(orgId: string) {
  const base = `/orgs/${orgId}`;
  return {
    // Contacts
    contacts: {
      list: (params?: Record<string, unknown>) => api.get(`${base}/contacts`, { params }),
      create: (data: unknown) => api.post(`${base}/contacts`, data),
      get: (id: string) => api.get(`${base}/contacts/${id}`),
      update: (id: string, data: unknown) => api.patch(`${base}/contacts/${id}`, data),
      delete: (id: string) => api.delete(`${base}/contacts/${id}`),
      stats: () => api.get(`${base}/contacts/stats`),
      import: (formData: FormData) => api.post(`${base}/contacts/import`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
      importStatus: (jobId: string) => api.get(`${base}/contacts/import/${jobId}`),
    },
    // Lists
    lists: {
      list: () => api.get(`${base}/lists`),
      create: (data: unknown) => api.post(`${base}/lists`, data),
      get: (id: string) => api.get(`${base}/lists/${id}`),
      update: (id: string, data: unknown) => api.patch(`${base}/lists/${id}`, data),
      delete: (id: string) => api.delete(`${base}/lists/${id}`),
      contacts: (id: string, params?: unknown) => api.get(`${base}/lists/${id}/contacts`, { params }),
    },
    // Segments
    segments: {
      list: () => api.get(`${base}/segments`),
      create: (data: unknown) => api.post(`${base}/segments`, data),
      get: (id: string) => api.get(`${base}/segments/${id}`),
      update: (id: string, data: unknown) => api.patch(`${base}/segments/${id}`, data),
      delete: (id: string) => api.delete(`${base}/segments/${id}`),
      count: (id: string) => api.get(`${base}/segments/${id}/count`),
    },
    // Campaigns
    campaigns: {
      list: (params?: unknown) => api.get(`${base}/campaigns`, { params }),
      create: (data: unknown) => api.post(`${base}/campaigns`, data),
      get: (id: string) => api.get(`${base}/campaigns/${id}`),
      update: (id: string, data: unknown) => api.patch(`${base}/campaigns/${id}`, data),
      delete: (id: string) => api.delete(`${base}/campaigns/${id}`),
      send: (id: string) => api.post(`${base}/campaigns/${id}/send`),
      schedule: (id: string, scheduledAt: string) => api.post(`${base}/campaigns/${id}/schedule`, { scheduledAt }),
      duplicate: (id: string) => api.post(`${base}/campaigns/${id}/duplicate`),
      stats: (id: string) => api.get(`${base}/campaigns/${id}/stats`),
    },
    // Templates
    templates: {
      list: () => api.get(`${base}/templates`),
      create: (data: unknown) => api.post(`${base}/templates`, data),
      get: (id: string) => api.get(`${base}/templates/${id}`),
      update: (id: string, data: unknown) => api.patch(`${base}/templates/${id}`, data),
      delete: (id: string) => api.delete(`${base}/templates/${id}`),
      duplicate: (id: string) => api.post(`${base}/templates/${id}/duplicate`),
    },
    // Analytics
    analytics: {
      overview: () => api.get(`${base}/analytics/overview`),
      sends: (days?: number) => api.get(`${base}/analytics/sends`, { params: { days } }),
      opens: (days?: number) => api.get(`${base}/analytics/opens`, { params: { days } }),
      clicks: (days?: number) => api.get(`${base}/analytics/clicks`, { params: { days } }),
      topCampaigns: () => api.get(`${base}/analytics/top-campaigns`),
      subscribers: (days?: number) => api.get(`${base}/analytics/subscribers`, { params: { days } }),
    },
    // Billing
    billing: {
      plans: () => api.get(`${base}/billing/plans`),
      usage: () => api.get(`${base}/billing/usage`),
      checkout: (planId: string) => api.post(`${base}/billing/checkout`, { planId }),
      portal: () => api.post(`${base}/billing/portal`),
    },
    // Senders
    senders: {
      list: () => api.get(`${base}/senders`),
      create: (data: unknown) => api.post(`${base}/senders`, data),
      update: (id: string, data: unknown) => api.patch(`${base}/senders/${id}`, data),
      delete: (id: string) => api.delete(`${base}/senders/${id}`),
      verify: (id: string) => api.post(`${base}/senders/${id}/verify`),
    },
    // Automations
    automations: {
      list: () => api.get(`${base}/automations`),
      create: (data: unknown) => api.post(`${base}/automations`, data),
      get: (id: string) => api.get(`${base}/automations/${id}`),
      update: (id: string, data: unknown) => api.patch(`${base}/automations/${id}`, data),
      delete: (id: string) => api.delete(`${base}/automations/${id}`),
      activate: (id: string) => api.post(`${base}/automations/${id}/activate`),
      pause: (id: string) => api.post(`${base}/automations/${id}/pause`),
      steps: {
        list: (automationId: string) => api.get(`${base}/automations/${automationId}/steps`),
        create: (automationId: string, data: unknown) => api.post(`${base}/automations/${automationId}/steps`, data),
        update: (automationId: string, stepId: string, data: unknown) => api.patch(`${base}/automations/${automationId}/steps/${stepId}`, data),
        delete: (automationId: string, stepId: string) => api.delete(`${base}/automations/${automationId}/steps/${stepId}`),
      },
    },
    // API Keys
    apiKeys: {
      list: () => api.get(`${base}/api-keys`),
      create: (name: string) => api.post(`${base}/api-keys`, { name }),
      delete: (id: string) => api.delete(`${base}/api-keys/${id}`),
    },
    // Webhooks
    webhooks: {
      list: () => api.get(`${base}/webhooks`),
      create: (data: unknown) => api.post(`${base}/webhooks`, data),
      update: (id: string, data: unknown) => api.patch(`${base}/webhooks/${id}`, data),
      delete: (id: string) => api.delete(`${base}/webhooks/${id}`),
      test: (id: string) => api.post(`${base}/webhooks/${id}/test`),
      deliveries: (id: string) => api.get(`${base}/webhooks/${id}/deliveries`),
    },
  };
}

// Type exports
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  emailVerified: boolean;
  avatarUrl?: string;
}

export interface OrgMembership {
  id: string;
  name: string;
  slug: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
}

export default api;
