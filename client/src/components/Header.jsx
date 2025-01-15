import { Link } from "react-router-dom";

function Header() {
  return (
    <div className="flex flex-row justify-around items-center w-full h-16 bg-dark px-10"> {/* Added padding to prevent overflow */}
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
        <div className="border-l-2 border-gray-600 mx-2 h-10"></div> {/* Changed min-h-10 to h-10 for consistent height */}
        <button className="bg-blue-500 px-1 py-2 rounded-md mx-3">
          <Link to="/login" className="text-white text-decoration-none px-3">
            Login
          </Link>
        </button>
        <button className="border-2 border-blue-500 px-1 py-2 rounded-md mx-2">
          <Link
            to="/signup"
            className="text-blue-500 text-decoration-none px-2"
          >
            Sign Up
          </Link>
        </button>
      </div>
    </div>
  );
}

export default Header;