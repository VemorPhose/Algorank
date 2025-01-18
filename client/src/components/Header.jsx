import { Link } from "react-router-dom";
import { auth } from "../firebase";
import { useAuthState } from "react-firebase-hooks/auth";

import SignIn from "./SignIn";
import SignOut from "./SignOut";

function Header() {
  const [user] = useAuthState(auth);

  return (
    <div className="flex flex-row justify-around items-center w-full h-16 bg-dark px-10">
      <div className="flex flex-col items-center">
        <Link
          to="/"
          className="text-2xl font-bold text-decoration-none text-white"
        >
          AlgoRank
        </Link>
      </div>
      <div></div>
      <div></div>
      <div className="flex flex-row items-center">
        <Link to="/problems" className="text-white text-decoration-none mx-2">
          Problems
        </Link>
        <Link to="/contests" className="text-white text-decoration-none mx-3">
          Contests
        </Link>
        <div className="border-l-2 border-gray-600 mx-2 h-10"></div>
        {user ? <SignOut/ > : <SignIn/ >} 
      </div>
    </div>
  );
}

export default Header;
