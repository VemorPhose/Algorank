import { Link } from "react-router-dom";
import { auth } from "../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import SignIn from "./SignIn";
import SignOut from "./SignOut";

function Header() {
  const [user] = useAuthState(auth);
  const [theme, setTheme] = useState(
    localStorage.getItem("theme") || "synthwave"
  );
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === "synthwave" ? "nord" : "synthwave");
  };

  return (
    <>
      <header className="border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo/Website Name */}
            <Link to="/" className="text-2xl font-sans">
              AlgoRank
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              <Link
                to="/problems"
                className="text-sm font-medium hover:text-primary"
              >
                Problems
              </Link>
              <Link
                to="/contests"
                className="text-sm font-medium hover:text-primary"
              >
                Contests
              </Link>
              <Link
                to="/leaderboard"
                className="text-sm font-medium hover:text-primary"
              >
                Leaderboard
              </Link>
              <Link
                to="/profile"
                className="text-sm font-medium hover:text-primary"
              >
                Profile
              </Link>
            </nav>

            {/* Auth Section */}
            <div className="hidden md:flex items-center space-x-4">
              {/* Theme Toggle */}
              <label className="swap swap-rotate cursor-pointer">
                <input
                  type="checkbox"
                  className="hidden"
                  checked={theme === "synthwave"}
                  onChange={toggleTheme}
                />
                <svg
                  className="swap-off h-7 w-7 fill-current text-base-content"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                >
                  <path d="M5.64,17l-.71.71a1,1,0,0,0,0,1.41,1,1,0,0,0,1.41,0l.71-.71A1,1,0,0,0,5.64,17ZM5,12a1,1,0,0,0-1-1H3a1,1,0,0,0,0,2H4A1,1,0,0,0,5,12Zm7-7a1,1,0,0,0,1-1V3a1,1,0,0,0-2,0V4A1,1,0,0,0,12,5ZM5.64,7.05a1,1,0,0,0,.7.29,1,1,0,0,0,.71-.29,1,1,0,0,0,0-1.41l-.71-.71A1,1,0,0,0,4.93,6.34Zm12,.29a1,1,0,0,0,.7-.29l.71-.71a1,1,0,1,0-1.41-1.41L17,5.64a1,1,0,0,0,0,1.41A1,1,0,0,0,17.66,7.34ZM21,11H20a1,1,0,0,0,0,2h1a1,1,0,0,0,0-2Zm-9,8a1,1,0,0,0-1,1v1a1,1,0,0,0,2,0V20A1,1,0,0,0,12,19ZM18.36,17A1,1,0,0,0,17,18.36l.71.71a1,1,0,0,0,1.41,0,1,1,0,0,0,0-1.41ZM12,6.5A5.5,5.5,0,1,0,17.5,12,5.51,5.51,0,0,0,12,6.5Zm0,9A3.5,3.5,0,1,1,15.5,12,3.5,3.5,0,0,1,12,15.5Z" />
                </svg>
                <svg
                  className="swap-on h-7 w-7 fill-current text-base-content"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                >
                  <path d="M21.64,13a1,1,0,0,0-1.05-.14,8.05,8.05,0,0,1-3.37.73A8.15,8.15,0,0,1,9.08,5.49a8.59,8.59,0,0,1,.25-2A1,1,0,0,0,8,2.36,10.14,10.14,0,1,0,22,14.05,1,1,0,0,0,21.64,13Zm-9.5,6.69A8.14,8.14,0,0,1,7.08,5.22v.27A10.15,10.15,0,0,0,17.22,15.63a9.79,9.79,0,0,0,2.1-.22A8.11,8.11,0,0,1,12.14,19.73Z" />
                </svg>
              </label>

              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-8 w-8 rounded-full"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={
                            user.photoURL ||
                            "/placeholder.svg?height=32&width=32"
                          }
                          alt={user.displayName || user.email}
                        />
                        <AvatarFallback>
                          {(user.displayName || user.email || "U")
                            .slice(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <Link to="/profile" className="w-full">
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Link to="/settings" className="w-full">
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <SignOut />
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex items-center space-x-2">
                  <SignIn />
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="md:hidden py-4 space-y-4">
              <Link
                to="/problems"
                className="block py-2 text-sm font-medium hover:text-primary"
                onClick={() => setIsMenuOpen(false)}
              >
                Problems
              </Link>
              <Link
                to="/contests"
                className="block py-2 text-sm font-medium hover:text-primary"
                onClick={() => setIsMenuOpen(false)}
              >
                Contests
              </Link>
              <Link
                to="/leaderboard"
                className="block py-2 text-sm font-medium hover:text-primary"
                onClick={() => setIsMenuOpen(false)}
              >
                Leaderboard
              </Link>
              <Link
                to="/profile"
                className="block py-2 text-sm font-medium hover:text-primary"
                onClick={() => setIsMenuOpen(false)}
              >
                Profile
              </Link>

              {/* Mobile Auth Section */}
              {user ? (
                <div className="pt-4 border-t">
                  <Link
                    to="/profile"
                    className="block py-2 text-sm font-medium hover:text-primary"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Profile
                  </Link>
                  <Link
                    to="/settings"
                    className="block py-2 text-sm font-medium hover:text-primary"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Settings
                  </Link>
                  <div className="block py-2 text-sm font-medium hover:text-primary w-full text-left">
                    <SignOut />
                  </div>
                </div>
              ) : (
                <div className="pt-4 border-t flex flex-col space-y-2">
                  <SignIn />
                </div>
              )}
            </div>
          )}
        </div>
      </header>
    </>
  );
}

export default Header;
