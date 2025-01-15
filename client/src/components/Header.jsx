import { Link } from "react-router-dom";
import React from "react";
import { useState } from "react";

function Header() {
  const [theme, setTheme] = useState("dark");
  const handleThemeChange = (event) => {
    const newTheme = event.target.value;
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  return (
    <div className="flex flex-row justify-around items-center w-full h-16 bg-dark px-10">
      {" "}
      {/* Added padding to prevent overflow */}
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
        <div className="border-l-2 border-gray-600 mx-2 h-10"></div>{" "}
        {/* Changed min-h-10 to h-10 for consistent height */}
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

        <div className="dropdown mb-72">
          <div tabIndex={0} role="button" className="btn m-1">
            Theme
            <svg
              width="12px"
              height="12px"
              className="inline-block h-2 w-2 fill-current opacity-60"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 2048 2048"
            >
              <path d="M1799 349l242 241-1017 1017L7 590l242-241 775 775 775-775z"></path>
            </svg>
          </div>
          <ul
            tabIndex={0}
            className="dropdown-content bg-base-300 rounded-box z-[1] w-52 p-2 shadow-2xl"
          >
            <li>
              <input
                type="radio"
                name="theme-dropdown"
                className="theme-controller btn btn-sm btn-block btn-ghost justify-start"
                aria-label="Default"
                value="default"
                onChange={handleThemeChange}
              />
            </li>
            <li>
              <input
                type="radio"
                name="theme-dropdown"
                className="theme-controller btn btn-sm btn-block btn-ghost justify-start"
                aria-label="Retro"
                value="retro"
                onChange={handleThemeChange}
              />
            </li>
            <li>
              <input
                type="radio"
                name="theme-dropdown"
                className="theme-controller btn btn-sm btn-block btn-ghost justify-start"
                aria-label="Cyberpunk"
                value="cyberpunk"
                onChange={handleThemeChange}
              />
            </li>
            <li>
              <input
                type="radio"
                name="theme-dropdown"
                className="theme-controller btn btn-sm btn-block btn-ghost justify-start"
                aria-label="Valentine"
                value="valentine"
                onChange={handleThemeChange}
              />
            </li>
            <li>
              <input
                type="radio"
                name="theme-dropdown"
                className="theme-controller btn btn-sm btn-block btn-ghost justify-start"
                aria-label="Aqua"
                value="aqua"
                onChange={handleThemeChange}
              />
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Header;
