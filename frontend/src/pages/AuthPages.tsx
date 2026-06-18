import { LogIn, UserPlus } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import type { UserRole } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { Button, Field, Input, Notice, PageTitle, Panel, Select } from "../components/ui";

function destinationFromState(state: unknown): string {
  if (state && typeof state === "object" && "from" in state) {
    const from = (state as { from?: { pathname?: string } }).from;
    if (from?.pathname) {
      return from.pathname;
    }
  }
  return "/";
}

export function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to={destinationFromState(location.state)} replace />;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login({ email, password });
      navigate(destinationFromState(location.state), { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sign in failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-xl gap-6">
      <PageTitle eyebrow="Account" title="Sign In" />
      <Panel>
        <form className="grid gap-4" onSubmit={onSubmit}>
          {error ? <Notice tone="bg-coral text-lemon">{error}</Notice> : null}
          <Field label="Email">
            <Input type="email" value={email} autoComplete="email" onChange={(event) => setEmail(event.target.value)} required />
          </Field>
          <Field label="Password">
            <Input type="password" value={password} autoComplete="current-password" onChange={(event) => setPassword(event.target.value)} required />
          </Field>
          <Button type="submit" disabled={submitting}>
            <LogIn className="h-4 w-4" />
            {submitting ? "Signing in" : "Sign in"}
          </Button>
        </form>
      </Panel>
      <div className="text-center text-sm font-bold text-ink/70">
        New here?{" "}
        <Link className="font-black text-coral underline decoration-2 underline-offset-4" to="/register">
          Create an account
        </Link>
      </div>
    </div>
  );
}

export function RegisterPage() {
  const { isAuthenticated, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("user");
  const [bootstrapToken, setBootstrapToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to={destinationFromState(location.state)} replace />;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register({ email, username, password, role }, bootstrapToken || undefined);
      navigate(destinationFromState(location.state), { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-xl gap-6">
      <PageTitle eyebrow="Account" title="Join Algorank" />
      <Panel>
        <form className="grid gap-4" onSubmit={onSubmit}>
          {error ? <Notice tone="bg-coral text-lemon">{error}</Notice> : null}
          <Field label="Email">
            <Input type="email" value={email} autoComplete="email" onChange={(event) => setEmail(event.target.value)} required />
          </Field>
          <Field label="Username">
            <Input value={username} autoComplete="username" minLength={3} maxLength={80} onChange={(event) => setUsername(event.target.value)} required />
          </Field>
          <Field label="Password" hint="Minimum 8 characters.">
            <Input type="password" value={password} autoComplete="new-password" minLength={8} maxLength={128} onChange={(event) => setPassword(event.target.value)} required />
          </Field>
          <Field label="Role">
            <Select value={role} onChange={(event) => setRole(event.target.value as UserRole)}>
              <option value="user">User</option>
              <option value="organizer">Organizer</option>
              <option value="admin">Admin</option>
            </Select>
          </Field>
          {role !== "user" ? (
            <Field label="Bootstrap token">
              <Input value={bootstrapToken} onChange={(event) => setBootstrapToken(event.target.value)} />
            </Field>
          ) : null}
          <Button type="submit" disabled={submitting}>
            <UserPlus className="h-4 w-4" />
            {submitting ? "Creating account" : "Create account"}
          </Button>
        </form>
      </Panel>
      <div className="text-center text-sm font-bold text-ink/70">
        Already registered?{" "}
        <Link className="font-black text-coral underline decoration-2 underline-offset-4" to="/login">
          Sign in
        </Link>
      </div>
    </div>
  );
}
