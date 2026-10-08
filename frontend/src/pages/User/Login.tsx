import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { Leaf } from 'lucide-react';
import { useOwnerAuth } from '../../contexts/AuthContext';
import { API_BASE_URL, API_ENDPOINTS } from '../../api/config';

export default function UserLogin() {
  const navigate = useNavigate();
  const { login } = useOwnerAuth();
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
          role: 'user'
        }),
      });

      if (!response.ok) {
        throw new Error('Authentication failed');
      }

      const data = await response.json();
      
      console.log('Login response:', data); // Debug log
      
      // Store the auth token and user info
      login(data.access_token, {
        user_id: data.user_id,
        email: data.email,
        name: data.name,
        role: data.role
      });

      console.log('Login successful, redirecting...'); // Debug log

      // If new user, redirect to registration
      if (data.is_new_user) {
        console.log('New user, redirecting to register'); // Debug log
        navigate('/register');
      } else {
        // Existing user, go to reservations page
        console.log('Existing user, redirecting to reservations'); // Debug log
        navigate('/reservations');
      }
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

  return (
    <div className="flex items-center justify-center min-h-screen px-4 py-12 bg-gradient-to-br from-emerald-50 via-teal-50 to-sky-50">
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <Leaf className="w-12 h-12 text-emerald-600" />
            <span className="text-4xl font-bold text-gray-900">BloomNet</span>
          </Link>
          <h1 className="mb-3 text-3xl font-bold text-gray-900">Welcome Back!</h1>
          <p className="text-lg text-gray-600">Sign in to manage your plant care bookings</p>
        </div>

        {/* Login Card */}
        <div className="p-10 bg-white border shadow-xl rounded-2xl border-emerald-100">
          {/* Error Message */}
          {error && (
            <div className="p-4 mb-6 text-sm text-red-600 border border-red-200 bg-red-50 rounded-xl">
              {error}
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="p-4 mb-6 text-center border border-blue-200 bg-blue-50 rounded-xl">
              <div className="flex items-center justify-center gap-3">
                <div className="w-5 h-5 border-2 rounded-full border-emerald-600 border-t-transparent animate-spin"></div>
                <span className="text-sm text-gray-700">Signing you in...</span>
              </div>
            </div>
          )}

          {/* Google Sign In */}
          <div className="flex flex-col items-center gap-4">
            <p className="mb-2 text-sm text-gray-600">
              Sign in with your Google account to continue
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

          {/* Divider */}
<div className="mt-8 pt-6 border-t border-gray-200 text-center">
  <p className="text-sm text-gray-600">
    Want to join as a plant sitter?{' '}
    <Link to="/sitter-portal" className="font-semibold text-emerald-600 hover:text-emerald-700">
      Become a Sitter
    </Link>
  </p>
</div>


        </div>

        {/* Back to Home */}
        <div className="mt-6 text-center">
          <Link
            to="/"
            className="text-sm text-gray-600 transition-colors hover:text-emerald-600"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
