import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export default function Login() {
  const [formData, setFormData] = useState({
    organizationCode: '',
    username: '',
    password: '',
    rememberMe: false,
  });
  const [isSuperAdminLogin, setIsSuperAdminLogin] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if there's a success message from password reset
    if (location.state?.message) {
      setMessage(location.state.message);
    }
  }, [location]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(''); // Clear success message when user starts typing
    setFieldErrors({}); // Clear field errors
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const toggleSuperAdminLogin = () => {
    setIsSuperAdminLogin(!isSuperAdminLogin);
    setError('');
    setFieldErrors({});
    setFormData({
      ...formData,
      organizationCode: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    // Basic validation
    const errors: Record<string, string> = {};

    if (!isSuperAdminLogin && !formData.organizationCode.trim()) {
      errors.organizationCode = 'Organization code is required';
    }

    if (!formData.username.trim()) {
      errors.username = 'Username is required';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters long';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError('Please fix the errors below');
      return;
    }

    try {
      const orgCode = isSuperAdminLogin ? '' : formData.organizationCode;
      await login(orgCode, formData.username, formData.password);
      navigate('/dashboard');
    } catch (err: unknown) {
      interface ErrorResponse {
        response?: {
          data?: {
            error?: string;
          };
        };
      }
      const errorObj = err as ErrorResponse;
      setError(errorObj.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-primary-100">
            <svg className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isSuperAdminLogin ? 'Super Admin Login' : 'Sign in to CarePoint'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {isSuperAdminLogin 
              ? 'Access the platform administration dashboard'
              : 'Access your healthcare facility\'s patient management system'
            }
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {message && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              {message}
            </div>
          )}
          
          <div className="space-y-4">
            {!isSuperAdminLogin && (
              <div>
                <label htmlFor="organizationCode" className="block text-sm font-medium text-gray-700">
                  Organization Code
                </label>
                <div className="mt-1 relative">
                  <input
                    id="organizationCode"
                    name="organizationCode"
                    type="text"
                    required={!isSuperAdminLogin}
                    className={`appearance-none relative block w-full px-4 py-3 border placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 transition duration-200 ${
                      fieldErrors.organizationCode
                        ? 'border-red-300 focus:ring-red-500 focus:border-transparent'
                        : 'border-gray-300 focus:ring-primary-500 focus:border-transparent'
                    }`}
                    placeholder="Enter organization code"
                    value={formData.organizationCode}
                    onChange={handleChange}
                  />
                </div>
                {fieldErrors.organizationCode && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.organizationCode}</p>
                )}
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Username
              </label>
              <div className="mt-1 relative">
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  className={`appearance-none relative block w-full px-4 py-3 border placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 transition duration-200 ${
                    fieldErrors.username
                      ? 'border-red-300 focus:ring-red-500 focus:border-transparent'
                      : 'border-gray-300 focus:ring-primary-500 focus:border-transparent'
                  }`}
                  placeholder="Enter your username"
                  value={formData.username}
                  onChange={handleChange}
                />
              </div>
              {fieldErrors.username && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.username}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className={`appearance-none relative block w-full px-4 py-3 border placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 transition duration-200 ${
                    fieldErrors.password
                      ? 'border-red-300 focus:ring-red-500 focus:border-transparent'
                      : 'border-gray-300 focus:ring-primary-500 focus:border-transparent'
                  }`}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
              {fieldErrors.password && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="rememberMe"
                name="rememberMe"
                type="checkbox"
                checked={formData.rememberMe}
                onChange={handleChange}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-700">
                Remember me
              </label>
            </div>
            <div className="text-sm">
              <Link
                to="/forgot-password"
                className="font-medium text-primary-600 hover:text-primary-500"
              >
                Forgot your password?
              </Link>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200 transform hover:scale-[1.02]"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </div>
              ) : (
                'Sign in'
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link to="/register" className="font-medium text-primary-600 hover:text-primary-500">
                Sign up
              </Link>
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 text-center">
            <button
              type="button"
              onClick={toggleSuperAdminLogin}
              className="text-sm text-gray-500 hover:text-indigo-600 transition-colors"
            >
              {isSuperAdminLogin ? '← Back to Organization Login' : 'Super Admin Login →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}