'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { startAuthentication } from '@simplewebauthn/browser';
import { authApi, passkeyApi, setAccessToken, type User, type OrgMembership } from '@/lib/api';

interface AuthState {
  user: User | null;
  organizations: OrgMembership[];
  currentOrg: OrgMembership | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithPasskey: (email?: string) => Promise<void>;
  loginWithToken: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  switchOrg: (orgId: string) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organizations, setOrganizations] = useState<OrgMembership[]>([]);
  const [currentOrg, setCurrentOrg] = useState<OrgMembership | null>(null);
  const [loading, setLoading] = useState(true);

  const applySession = useCallback((userData: User, orgs: OrgMembership[]) => {
    setUser(userData);
    setOrganizations(orgs);
    const lastOrgId = typeof window !== 'undefined' ? localStorage.getItem('lastOrgId') : null;
    const org = orgs.find((o) => o.id === lastOrgId) || orgs[0] || null;
    setCurrentOrg(org);
    if (typeof window !== 'undefined') {
      localStorage.setItem('userOrgs', JSON.stringify(orgs));
    }
  }, []);

  // Restore session on mount via refresh token cookie
  useEffect(() => {
    authApi
      .refresh()
      .then((res) => {
        setAccessToken(res.data.accessToken);
        return authApi.me();
      })
      .then((res) => {
        applySession(res.data.user, res.data.organizations);
      })
      .catch(() => {
        setAccessToken(null);
      })
      .finally(() => setLoading(false));
  }, [applySession]);

  /** Standard email + password login */
  const login = async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    setAccessToken(res.data.accessToken);
    applySession(res.data.user, res.data.organizations);
  };

  /**
   * Passkey login using WebAuthn.
   * If email is supplied, shows only that user's registered passkeys.
   * If omitted, the browser presents all resident (discoverable) passkeys.
   */
  const loginWithPasskey = async (email?: string) => {
    // 1. Get authentication challenge from server
    const optionsRes = await passkeyApi.authOptions(email);
    const options = optionsRes.data;

    // 2. Trigger platform authenticator (Face ID, Touch ID, Windows Hello, etc.)
    const credential = await startAuthentication(options);

    // 3. Verify with server — returns same shape as email/password login
    const verifyRes = await passkeyApi.authVerify(credential);
    setAccessToken(verifyRes.data.accessToken);
    applySession(verifyRes.data.user, verifyRes.data.organizations);
  };

  /**
   * Called by the OAuth callback page after the backend redirects back with a token.
   * Sets the access token and fetches user + orgs from /auth/me.
   */
  const loginWithToken = async (token: string) => {
    setAccessToken(token);
    const res = await authApi.me();
    applySession(res.data.user, res.data.organizations);
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
    <AuthContext.Provider
      value={{ user, organizations, currentOrg, loading, login, loginWithPasskey, loginWithToken, logout, switchOrg }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
