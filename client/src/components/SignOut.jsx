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

  const getFirstName = () => {
    if (!user?.email) return '';
    const name = user.email.split('.')[0];
    // Capitalize first letter
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  return (
    <details className="dropdown dropdown-end">
      <summary className="btn btn-ghost normal-case flex items-center gap-2 mt-2">
        <span className="text-white">Signed in as {getFirstName()}</span>
      </summary>
      <ul className="menu dropdown-content bg-base-100 rounded-box z-[1] w-40 p-2 shadow mt-2">
        <li>
          <a onClick={handleSignOut} className="text-base-content">Sign Out</a>
        </li>
      </ul>
    </details>
  );
}

export default SignOut;