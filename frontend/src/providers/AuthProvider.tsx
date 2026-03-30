'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, setAccessToken, type User, type OrgMembership } from '@/lib/api';

interface AuthState {
  user: User | null;
  organizations: OrgMembership[];
  currentOrg: OrgMembership | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  switchOrg: (orgId: string) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organizations, setOrganizations] = useState<OrgMembership[]>([]);
  const [currentOrg, setCurrentOrg] = useState<OrgMembership | null>(null);
  const [loading, setLoading] = useState(true);

  const setAuthState = useCallback((userData: User, orgs: OrgMembership[]) => {
    setUser(userData);
    setOrganizations(orgs);
    // Restore last selected org from localStorage
    const lastOrgId = typeof window !== 'undefined' ? localStorage.getItem('lastOrgId') : null;
    const org = orgs.find((o) => o.id === lastOrgId) || orgs[0] || null;
    setCurrentOrg(org);
  }, []);

  // Restore session on mount
  useEffect(() => {
    authApi.refresh()
      .then((res) => {
        setAccessToken(res.data.accessToken);
        return authApi.me();
      })
      .then((res) => {
        // me() only returns user — re-fetch login to get orgs
        // We'll use a separate stored orgs approach
        const storedOrgs = typeof window !== 'undefined' ? localStorage.getItem('userOrgs') : null;
        const orgs: OrgMembership[] = storedOrgs ? JSON.parse(storedOrgs) : [];
        setAuthState(res.data.user, orgs);
      })
      .catch(() => {
        setAccessToken(null);
      })
      .finally(() => setLoading(false));
  }, [setAuthState]);

  const login = async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    setAccessToken(res.data.accessToken);
    if (typeof window !== 'undefined') {
      localStorage.setItem('userOrgs', JSON.stringify(res.data.organizations));
    }
    setAuthState(res.data.user, res.data.organizations);
  };

  const logout = async () => {
    await authApi.logout().catch(() => {});
    setAccessToken(null);
    setUser(null);
    setOrganizations([]);
    setCurrentOrg(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('userOrgs');
      localStorage.removeItem('lastOrgId');
    }
  };

  const switchOrg = (orgId: string) => {
    const org = organizations.find((o) => o.id === orgId);
    if (org) {
      setCurrentOrg(org);
      if (typeof window !== 'undefined') {
        localStorage.setItem('lastOrgId', orgId);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, organizations, currentOrg, loading, login, logout, switchOrg }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
