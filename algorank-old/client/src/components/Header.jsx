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
  const [theme, setTheme] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.theme === "dark" ||
        (!("theme" in localStorage) &&
          window.matchMedia("(prefers-color-scheme: dark)").matches)
        ? "dark"
        : "light";
    }
    return "light";
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      localStorage.theme = "dark";
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.theme = "light";
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo/Website Name */}
            <Link to="/" className="text-2xl font-sans text-foreground">
              AlgoRank
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              <Link
                to="/problems"
                className="text-sm font-medium text-foreground/60 hover:text-foreground/80"
              >
                Problems
              </Link>
              <Link
                to="/contests"
                className="text-sm font-medium text-foreground/60 hover:text-foreground/80"
              >
                Contests
              </Link>
              <Link
                to="/profile"
                className="text-sm font-medium text-foreground/60 hover:text-foreground/80"
              >
                Profile
              </Link>
            </nav>

            {/* Auth Section */}
            <div className="hidden md:flex items-center space-x-4">
              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="h-9 w-9 text-foreground"
              >
                <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
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
              className="md:hidden text-foreground"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="md:hidden py-4 space-y-4 bg-background border-b">
              <Link
                to="/problems"
                className="block py-2 text-sm font-medium text-foreground/60 hover:text-foreground/80"
                onClick={() => setIsMenuOpen(false)}
              >
                Problems
              </Link>
              <Link
                to="/contests"
                className="block py-2 text-sm font-medium text-foreground/60 hover:text-foreground/80"
                onClick={() => setIsMenuOpen(false)}
              >
                Contests
              </Link>
              <Link
                to="/leaderboard"
                className="block py-2 text-sm font-medium text-foreground/60 hover:text-foreground/80"
                onClick={() => setIsMenuOpen(false)}
              >
                Leaderboard
              </Link>
              <Link
                to="/profile"
                className="block py-2 text-sm font-medium text-foreground/60 hover:text-foreground/80"
                onClick={() => setIsMenuOpen(false)}
              >
                Profile
              </Link>

              {/* Mobile Auth Section */}
              {user ? (
                <div className="pt-4 border-t border-border">
                  <Link
                    to="/profile"
                    className="block py-2 text-sm font-medium text-foreground/60 hover:text-foreground/80"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Profile
                  </Link>
                  <Link
                    to="/settings"
                    className="block py-2 text-sm font-medium text-foreground/60 hover:text-foreground/80"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Settings
                  </Link>
                  <div className="block py-2 text-sm font-medium text-foreground/60 hover:text-foreground/80 w-full text-left">
                    <SignOut />
                  </div>
                </div>
              ) : (
                <div className="pt-4 border-t border-border flex flex-col space-y-2">
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
