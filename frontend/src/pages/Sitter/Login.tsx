import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { Leaf, Sparkles } from 'lucide-react';
import { useSitterAuth } from '../../contexts/AuthContext';
import { API_BASE_URL, API_ENDPOINTS } from '../../api/config';

const DEV_SITTER_EMAIL = 'sittertest@jh.edu';
const DEV_SITTER_CODE = '222222';

export default function SitterLogin() {
  const navigate = useNavigate();
  const { login } = useSitterAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      setError('Failed to get credentials from Google');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.GOOGLE_AUTH}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credential: credentialResponse.credential,
          role: 'sitter'  // Important: sitter role
        }),
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(
            'Google authentication endpoint is unavailable. Try the demo sitter account below.'
          );
        }
        const payload = await response.text();
        throw new Error(
          payload
            ? `Authentication failed: ${payload}`
            : 'Authentication failed'
        );
      }

      const data = await response.json();
      
      // Store the auth token and user info
      login(data.access_token, {
        user_id: data.user_id,
        email: data.email,
        name: data.name,
        role: data.role
      });

      let needsProfile = true;

      try {
        const profileResponse = await fetch(`${API_BASE_URL}${API_ENDPOINTS.SITTER_PROFILE_ME}`, {
          headers: {
            'Authorization': `Bearer ${data.access_token}`,
          },
        });

        if (profileResponse.ok) {
          const profile = await profileResponse.json();
          needsProfile = !profile?.is_complete;
        } else if (profileResponse.status === 404) {
          needsProfile = true;
        }
      } catch (profileError) {
        console.warn('Unable to check sitter profile completion', profileError);
      }

      navigate(needsProfile ? '/sitter/register' : '/sitter/dashboard');
    } catch (err: any) {
      console.error('Google login error:', err);
      setError(err.message || 'Failed to login with Google');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google login failed. Please try again.');
  };

  const handleUseDemoAccount = async () => {
    setLoading(true);
    setError('');
    try {
      const devResponse = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.DEV_LOGIN}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: DEV_SITTER_EMAIL,
            password: DEV_SITTER_CODE,
          }),
        }
      );

      if (!devResponse.ok) {
        throw new Error('Unable to sign in with demo sitter account.');
      }

      const devData = await devResponse.json();
      const token = devData.token || devData.access_token;

      if (!token) {
        throw new Error('Demo login did not return an access token.');
      }

      // Fetch user info using the dev token
      const profileResponse = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.ME}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!profileResponse.ok) {
        throw new Error('Unable to load sitter profile for demo login.');
      }

      const profile = await profileResponse.json();
      login(token, {
        user_id: profile.id || profile._id || 'dev-sitter',
        email: profile.email || DEV_SITTER_EMAIL,
        name: profile.full_name || profile.name || 'Demo Sitter',
        role: 'sitter',
      });

      navigate('/sitter/dashboard');
    } catch (err: any) {
      console.error('Demo sitter login failed:', err);
      setError(err.message || 'Unable to use the demo sitter account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b shadow-sm backdrop-blur bg-white/80">
        <div className="max-w-6xl px-4 py-3 mx-auto flex items-center justify-between">
          <Link to="/sitter-portal" className="flex items-center gap-2">
            <Leaf className="w-6 h-6 text-amber-600"/>
            <span className="text-xl font-bold text-gray-900">BloomNet</span>
            <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-gradient-to-r from-amber-400 to-orange-400 text-white rounded-full">
              SITTER
            </span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">Sitter Sign In</h1>
            <p className="text-lg text-gray-600">Welcome back! Sign in to manage your sitter account</p>
          </div>

          {/* Login Card */}
          <div className="bg-white rounded-2xl shadow-xl border-2 border-amber-100 p-10">
            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
                <div className="flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm text-gray-700">Signing you in...</span>
                </div>
              </div>
            )}

            {/* Google Sign In */}
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm text-gray-600 mb-2 text-center">
                Sign in with your Google account to access your sitter dashboard
              </p>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                useOneTap
                theme="outline"
                size="large"
                text="signin_with"
                shape="rectangular"
                width="100%"
              />
            </div>

            <div className="mt-6 flex flex-col items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-amber-700">
                <Sparkles className="h-4 w-4" />
                <span>Just testing? Use our demo sitter account instead:</span>
              </div>
              <button
                type="button"
                onClick={handleUseDemoAccount}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-amber-300 bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-900 shadow-sm transition hover:bg-amber-200 disabled:opacity-60"
              >
                {loading ? 'Signing in…' : 'Sign in with demo sitter account'}
              </button>
              <p className="text-xs text-amber-700">
                Loads the pre-seeded sitter dashboard instantly (no Google login required).
              </p>
            </div>

         
          </div>

          {/* Back to Portal */}
          <div className="mt-6 text-center">
            <Link
              to="/sitter-portal"
              className="text-sm text-gray-600 hover:text-amber-600 transition-colors"
            >
              ← Back to Sitter Portal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
