'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Mail, XCircle } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';

/**
 * OAuth callback landing page.
 * The backend redirects here after Google / Apple sign-in with:
 *   /auth/callback?token=<accessToken>
 *
 * This page:
 *  1. Reads the token from the URL
 *  2. Calls loginWithToken() → sets in-memory accessToken → fetches user+orgs from /auth/me
 *  3. Redirects to /dashboard
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginWithToken } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError(decodeURIComponent(errorParam).replace(/_/g, ' '));
      return;
    }

    if (!token) {
      setError('Authentication failed — no token received.');
      return;
    }

    loginWithToken(token)
      .then(() => router.replace('/dashboard'))
      .catch(() => setError('Failed to restore session. Please try signing in again.'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-2xl">TechyPark</span>
        </div>

        {error ? (
          <div className="space-y-3">
            <XCircle className="w-12 h-12 text-red-500 mx-auto" />
            <p className="text-slate-700 font-medium">Sign-in failed</p>
            <p className="text-sm text-slate-500 capitalize">{error}</p>
            <a href="/login" className="text-primary text-sm hover:underline">
              Back to sign in
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            <Loader2 className="w-10 h-10 text-primary mx-auto animate-spin" />
            <p className="text-slate-600">Completing sign-in&hellip;</p>
          </div>
        )}
      </div>
    </div>
  );
}
