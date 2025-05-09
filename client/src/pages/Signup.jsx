import React, { useState } from "react";
import {
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "../firebase";
import { Link, useLocation } from "react-router-dom";

const Signup = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const location = useLocation();
  const isSignUp = location.pathname === "/signup";

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError("");
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      console.log("Authenticated user:", result.user);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      console.log("Signed up user:", result.user);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-md">
        <div className="bg-card shadow-md rounded px-8 pt-6 pb-8 mb-4">
          <div className="mb-4">
            <ul className="flex border-b border-border">
              <li className="-mb-px mr-1">
                <Link
                  to="/login"
                  className={`bg-card inline-block border-l border-t border-r border-border rounded-t py-2 px-4 text-primary font-semibold ${
                    !isSignUp ? "active" : ""
                  }`}
                >
                  Login
                </Link>
              </li>
              <li className="mr-1">
                <Link
                  to="/signup"
                  className={`bg-card inline-block py-2 px-4 text-primary hover:text-primary/80 font-semibold ${
                    isSignUp ? "active" : ""
                  }`}
                >
                  Sign Up
                </Link>
              </li>
            </ul>
          </div>
          {error && (
            <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded relative mb-4">
              {error}
            </div>
          )}
          <form onSubmit={handleEmailAuth}>
            <div className="mb-4">
              <label
                htmlFor="email"
                className="block text-foreground text-sm font-bold mb-2"
              >
                Email address
              </label>
              <input
                type="email"
                className="shadow appearance-none border border-border rounded w-full py-2 px-3 bg-background text-foreground leading-tight focus:outline-none focus:shadow-outline"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="mb-6">
              <label
                htmlFor="password"
                className="block text-foreground text-sm font-bold mb-2"
              >
                Password
              </label>
              <input
                type="password"
                className="shadow appearance-none border border-border rounded w-full py-2 px-3 bg-background text-foreground mb-3 leading-tight focus:outline-none focus:shadow-outline"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="flex items-center justify-between">
              <button
                type="submit"
                className="bg-primary hover:bg-primary/80 text-primary-foreground font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                disabled={loading}
              >
                {loading ? "Signing up..." : "Sign Up"}
              </button>
            </div>
          </form>
          <div className="text-center mt-4">
            <button
              className="bg-primary hover:bg-primary/80 text-primary-foreground font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              onClick={handleGoogleAuth}
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign up with Google"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
