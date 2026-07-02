import React from 'react';
import { BookOpenCheck, ShieldAlert } from 'lucide-react';

interface LoginViewProps {
  onLogin: () => void;
  isLoggingIn: boolean;
  error: string | null;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin, isLoggingIn, error }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col items-center">
          <div className="h-12 w-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white mb-4">
            <BookOpenCheck className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900 text-center">
            Lesson Plan Monitoring
          </h2>
          <p className="mt-2 text-sm text-gray-500 text-center">
            Sign in with Google to access and monitor Google Drive lesson plan documents.
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4 border border-red-100 flex items-start space-x-3">
            <ShieldAlert className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div className="text-xs text-red-700 leading-relaxed">{error}</div>
          </div>
        )}

        <div className="flex flex-col items-center justify-center pt-2">
          <button
            onClick={onLogin}
            disabled={isLoggingIn}
            className="group relative w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors cursor-pointer disabled:opacity-50"
            id="gsi-login-btn"
          >
            <div className="flex items-center space-x-3">
              <svg className="h-5 w-5" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              </svg>
              <span>{isLoggingIn ? 'Connecting...' : 'Sign in with Google'}</span>
            </div>
          </button>
        </div>

        <div className="text-center text-xs text-gray-400">
          Lesson Plan Monitoring System &bull; Phase 1 MVP
        </div>
      </div>
    </div>
  );
};
