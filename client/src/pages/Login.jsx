import React, { useState } from 'react';
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { Link, useLocation } from 'react-router-dom';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const location = useLocation();
  const isSignUp = location.pathname === '/signup';

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      console.log('Authenticated user:', result.user);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log('Signed in user:', result.user);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 shadow-md rounded px-8 pt-6 pb-8 mb-4">
          <div className="mb-4">
            <ul className="flex border-b">
              <li className="-mb-px mr-1">
                <Link to="/login" className={`bg-white dark:bg-gray-800 inline-block border-l border-t border-r rounded-t py-2 px-4 text-blue-700 dark:text-blue-300 font-semibold ${!isSignUp ? 'active' : ''}`}>
                  Login
                </Link>
              </li>
              <li className="mr-1">
                <Link to="/signup" className={`bg-white dark:bg-gray-800 inline-block py-2 px-4 text-blue-500 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-500 font-semibold ${isSignUp ? 'active' : ''}`}>
                  Sign Up
                </Link>
              </li>
            </ul>
          </div>
          {error && <div className="bg-red-100 dark:bg-red-200 border border-red-400 text-red-700 dark:text-red-800 px-4 py-3 rounded relative mb-4">{error}</div>}
          <form onSubmit={handleEmailAuth}>
            <div className="mb-4">
              <label htmlFor="email" className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Email address</label>
              <input
                type="email"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 leading-tight focus:outline-none focus:shadow-outline"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="mb-6">
              <label htmlFor="password" className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Password</label>
              <input
                type="password"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 mb-3 leading-tight focus:outline-none focus:shadow-outline"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="flex items-center justify-between">
              <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </button>
              <Link to="/forgot-password" className="inline-block align-baseline font-bold text-sm text-blue-500 hover:text-blue-800">
                Forgot Password?
              </Link>
            </div>
          </form>
          <div className="text-center mt-4">
            <button className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline" onClick={handleGoogleAuth} disabled={loading}>
              {loading ? 'Signing in...' : 'Continue using Google'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;