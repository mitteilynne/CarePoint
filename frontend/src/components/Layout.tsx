import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <Link
                to="/"
                className="flex-shrink-0 flex items-center text-2xl font-bold text-primary-600"
              >
                CarePoint
              </Link>
            </div>
            
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  <Link
                    to="/dashboard"
                    className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Dashboard
                  </Link>
                  <span className="text-gray-700 text-sm">
                    Hello, {user?.first_name}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-2 px-4 rounded"
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main>{children}</main>
    </div>
  );
}