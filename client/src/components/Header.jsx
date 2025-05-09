import { Link } from "react-router-dom";
import { auth } from "../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useEffect, useState } from "react";
import { Menu, X, Sun, Moon } from "lucide-react";
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
                to="/profile"
                className="text-sm font-medium hover:text-primary"
              >
                Profile
              </Link>
            </nav>

            {/* Auth Section */}
            <div className="hidden md:flex items-center space-x-4">
              {/* Theme Toggle */}
              <button
                className="rounded-full p-2 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none"
                aria-label="Toggle theme"
                onClick={toggleTheme}
              >
                {theme === "synthwave" ? (
                  <Moon className="h-6 w-6 text-gray-800 dark:text-gray-200" />
                ) : (
                  <Sun className="h-6 w-6 text-yellow-500" />
                )}
              </button>
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
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="w-full">
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/settings" className="w-full">
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <button
                        className="w-full text-left"
                        onClick={() => auth.signOut()}
                      >
                        Sign out
                      </button>
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
