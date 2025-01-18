import { useState } from "react";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { auth } from "../firebase";

function SignIn() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const signInWithGoogle = async () => {
    setLoading(true);
    setError("");
    
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      // Add hosted domain restriction to the provider instead of checking after
      provider.setCustomParameters({
        hd: "iiitg.ac.in"
      });
      
      await signInWithPopup(auth, provider);
    } catch (error) {
      if (error.code === 'auth/popup-closed-by-user') {
        setError("Sign-in cancelled");
      } else if (error.code === 'auth/popup-blocked') {
        setError("Please allow popups for this website");
      } else if (error.code === 'auth/unauthorized-domain') {
        setError("Domain not authorized. Please check Firebase console settings.");
      } else {
        setError(error.message);
        console.error("Authentication error:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={signInWithGoogle}
        className="bg-blue-500 px-3 py-2 rounded-md mx-3 text-white text-decoration-none hover:bg-blue-600 transition-colors disabled:opacity-50"
        disabled={loading}
      >
        {loading ? 'Signing In...' : 'Sign In with Google'}
      </button>
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}

export default SignIn;