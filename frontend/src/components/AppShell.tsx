import { Activity, Code2, Crown, Home, LogOut, Menu, ScrollText, Shield, Trophy, UserRound, X } from "lucide-react";
import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { cn } from "../lib/cn";
import { roleTone } from "../lib/status";
import { Badge, buttonClass } from "./ui";

const navItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/contests", label: "Contests", icon: Trophy },
  { to: "/problems", label: "Problems", icon: Code2 },
  { to: "/submissions", label: "Submissions", icon: ScrollText },
];

function navClass({ isActive }: { isActive: boolean }) {
  return cn(
    "inline-flex min-h-11 items-center gap-2 rounded-lg border-[3px] px-3 py-2 text-sm font-black transition",
    isActive
      ? "border-ink bg-coral text-lemon shadow-block-sm"
      : "border-transparent text-ink hover:border-ink hover:bg-panel hover:text-coral",
  );
}

export function AppShell() {
  const { user, isAuthenticated, isPrivileged, logout } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="art-shape right-[-5rem] top-24 h-72 w-72 rotate-12 bg-coral" />
        <div className="art-shape bottom-24 left-[-6rem] h-40 w-80 bg-aqua [clip-path:polygon(0_0,100%_18%,82%_100%,12%_82%)]" />
        <div className="art-shape left-[7%] top-[48%] h-36 w-36 bg-panel [clip-path:polygon(50%_0,100%_50%,50%_100%,0_50%)]" />
        <div className="art-grid absolute inset-0" />
      </div>

      <header className="sticky top-0 z-40 border-b-[3px] border-ink bg-panel shadow-header">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="group flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-lg border-[3px] border-ink bg-coral text-sm font-black text-lemon shadow-block-sm transition group-hover:-translate-y-0.5">
              AR
            </span>
            <span>
              <span className="block text-xl font-black leading-tight text-ink">Algorank</span>
              <span className="hidden text-xs font-bold text-ink sm:block">Contest execution intelligence</span>
            </span>
          </Link>

          <div className="hidden items-center gap-2 lg:flex">
            <span className="inline-flex items-center gap-2 rounded-lg border-[3px] border-ink bg-aqua px-3 py-2 text-xs font-black text-lemon">
              <Activity className="h-4 w-4" />
              FastAPI + Judge0
            </span>
            {user ? (
              <>
                <Badge tone={roleTone(user.role)}>
                  <Crown className="h-3.5 w-3.5" />
                  {user.role}
                </Badge>
                <Link to="/profile" className={buttonClass("plain")}>
                  <UserRound className="h-4 w-4" />
                  {user.username}
                </Link>
                <button className={buttonClass("danger")} onClick={() => void logout()} type="button">
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className={buttonClass("plain")}>
                  Sign in
                </Link>
                <Link to="/register" className={buttonClass("primary")}>
                  Join
                </Link>
              </>
            )}
          </div>

          <button className={buttonClass("plain", "lg:hidden")} onClick={() => setOpen((value) => !value)} type="button">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <div className="mx-auto hidden max-w-[1440px] px-4 pb-2 lg:block">
          <nav className="flex flex-wrap items-center gap-2">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={navClass}>
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
            {isPrivileged ? (
              <NavLink to="/admin" className={navClass}>
                <Shield className="h-4 w-4" />
                Admin
              </NavLink>
            ) : null}
          </nav>
        </div>

        {open ? (
          <div className="border-t-[3px] border-ink bg-panel px-4 py-4 lg:hidden">
            <nav className="grid gap-2">
              {navItems.map((item) => (
                <NavLink key={item.to} to={item.to} className={navClass} onClick={() => setOpen(false)}>
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              ))}
              {isPrivileged ? (
                <NavLink to="/admin" className={navClass} onClick={() => setOpen(false)}>
                  <Shield className="h-4 w-4" />
                  Admin
                </NavLink>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-2">
                {isAuthenticated ? (
                  <>
                    <Link to="/profile" className={buttonClass("plain")} onClick={() => setOpen(false)}>
                      <UserRound className="h-4 w-4" />
                      Profile
                    </Link>
                    <button className={buttonClass("danger")} onClick={() => void logout()} type="button">
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className={buttonClass("plain")} onClick={() => setOpen(false)}>
                      Sign in
                    </Link>
                    <Link to="/register" className={buttonClass("primary")} onClick={() => setOpen(false)}>
                      Join
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        ) : null}
      </header>

      <main className="mx-auto min-h-[calc(100vh-9rem)] max-w-[1440px] px-4 py-8 md:py-10">
        <Outlet />
      </main>

      <footer className="border-t-[3px] border-ink bg-ink px-4 py-6 text-lemon">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-3 text-sm font-bold md:flex-row md:items-center md:justify-between">
          <span>Algorank v2</span>
          <span className="text-lemon/80">FastAPI, Redis, PostgreSQL, Judge0, React</span>
        </div>
      </footer>
    </div>
  );
}
