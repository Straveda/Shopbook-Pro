import { useState, useEffect } from 'react';
import { Eye, EyeOff, Lock, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';

export default function ResetPasswordForm() {
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [tokenValid, setTokenValid] = useState(null);

  // Get token from URL
  const getTokenFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('token');
  };

  // Verify token on page load
  useEffect(() => {
    const verifyToken = async () => {
      const token = getTokenFromUrl();
      
      if (!token) {
        setTokenValid(false);
        setMessageType('error');
        setMessage('Invalid or missing reset token. Please request a new password reset.');
        return;
      }

      try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/verify-reset-token`, {
        method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        if (response.ok) {
          setTokenValid(true);
          console.log('✅ Reset token is valid');
        } else {
          setTokenValid(false);
          setMessageType('error');
          setMessage('Reset link has expired. Please request a new one.');
        }
      } catch (error) {
        console.error('Token verification error:', error);
        setTokenValid(false);
        setMessageType('error');
        setMessage('Connection error. Please try again later.');
      }
    };

    verifyToken();
  }, []);

  const validateForm = () => {
    if (!formData.password || !formData.confirmPassword) {
      setMessageType('error');
      setMessage('Please fill in all fields');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setMessageType('error');
      setMessage('Passwords do not match');
      return false;
    }

    if (formData.password.length < 6) {
      setMessageType('error');
      setMessage('Password must be at least 6 characters');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setMessage('');

    try {
      const token = getTokenFromUrl();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessageType('success');
        setMessage('✅ Password reset successful! Redirecting to login...');
        
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else {
        setMessageType('error');
        setMessage(data.message || 'Failed to reset password. Please try again.');
      }
    } catch (error) {
      setMessageType('error');
      setMessage('Connection error. Make sure backend is running on port 5000.');
      console.error('Reset password error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

      <div className="w-full max-w-md bg-white shadow-2xl border-0 relative z-10 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="space-y-2 text-center pb-4 bg-white p-6">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-teal-600 to-teal-700 rounded-lg flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-xl">S</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Reset Password</h1>
          <p className="text-sm text-gray-600">
            {tokenValid === null ? 'Verifying reset link...' : 'Enter your new password'}
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {message && (
            <div className={`mb-4 p-3 rounded-lg flex items-start gap-2 ${
              messageType === 'success' 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              {messageType === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <p className={`text-sm ${messageType === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                {message}
              </p>
            </div>
          )}

          {/* Loading state - token verification in progress */}
          {tokenValid === null && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mb-3"></div>
              <p className="text-sm text-gray-600">Verifying your reset link...</p>
            </div>
          )}

          {/* Token is valid - show password reset form */}
          {tokenValid === true && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter new password"
                    className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200 transition duration-200 hover:bg-gray-100"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">At least 6 characters</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm new password"
                    className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200 transition duration-200 hover:bg-gray-100"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full py-2.5 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white font-semibold rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Resetting Password...
                  </>
                ) : (
                  'Reset Password'
                )}
              </button>
            </div>
          )}

          {/* Token is invalid - show error and request new link button */}
          {tokenValid === false && (
            <div className="space-y-4">
              <button
                onClick={() => window.location.href = '/forgot-password'}
                className="w-full py-2.5 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white font-semibold rounded-lg transition duration-200 shadow-lg hover:shadow-xl"
              >
                Request New Reset Link
              </button>
            </div>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={() => window.location.href = '/login'}
              className="text-sm text-teal-600 hover:text-teal-700 font-medium transition inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}