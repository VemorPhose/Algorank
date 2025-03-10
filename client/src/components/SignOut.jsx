import { auth } from "../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";

function SignOut() {
  const [user] = useAuthState(auth);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      console.log("Signed out successfully");
    } catch (error) {
      console.error("Sign out error", error);
    }
  };

  const getFullName = () => user?.displayName || "User";

  const handleProfileClick = () => {
    navigate("/profile");
  };

  const toggleMenu = () => {
    setMenuOpen((prev) => !prev);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative ml-auto" ref={menuRef}>
      <button
        onClick={toggleMenu}
        className="btn btn-ghost normal-case flex items-center gap-2"
      >
        <div className="avatar flex items-center">
          <div className="ring-primary ring-offset-base-100 w-9 h-9 rounded-full ring ring-offset-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-9 w-9 p-1 text-base-content"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>
        </div>
      </button>
      
      {menuOpen && (
        <ul className="absolute right-0 top-full mt-1 menu p-2 shadow bg-base-100 rounded-box w-52 z-10 transition-opacity duration-300 ease-in-out">
          <li>
            <button 
              onClick={handleProfileClick} 
              className="text-sm font-bold text-base-content hover:bg-gray-300 hover:text-black w-full text-left"
            >
              {getFullName()}
            </button>
          </li>
          <li>
            <button 
              onClick={handleSignOut}
              className="text-sm text-base-content hover:bg-gray-300 hover:text-black w-full text-left"
            >
              Sign Out
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}

export default SignOut;
