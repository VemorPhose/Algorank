import { auth } from "../firebase";
import { useAuthState } from "react-firebase-hooks/auth";

function SignOut() {
  const [user] = useAuthState(auth);

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      console.log("Signed out successfully");
    } catch (error) {
      console.error("Sign out error", error);
    }
  };

  const getFullName = () => user?.displayName || "User";

  return (
    <div className="relative ml-auto group">
      <div className="btn btn-ghost normal-case flex items-center gap-2">
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
      </div>
      
      <ul className="absolute right-0 top-full mt-1 hidden group-hover:block menu p-2 shadow bg-base-100 rounded-box w-52 z-10">
        <li>
          <div className="text-sm font-bold text-base-content">{getFullName()}</div>
        </li>
        <li>
          <button 
            onClick={handleSignOut}
            className="text-sm text-base-content hover:bg-gray-100 w-full text-left"
          >
            Sign Out
          </button>
        </li>
      </ul>
    </div>
  );
}

export default SignOut;
