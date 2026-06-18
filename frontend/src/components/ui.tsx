import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "../lib/cn";

export function badgeClass(tone = "bg-ink text-white") {
  return cn(
    "inline-flex items-center gap-1 border-2 border-ink px-2.5 py-1 text-xs font-black uppercase leading-none shadow-block-sm",
    tone,
  );
}

export function Badge({ children, tone, className }: { children: ReactNode; tone?: string; className?: string }) {
  return <span className={cn(badgeClass(tone), className)}>{children}</span>;
}

type ButtonVariant = "primary" | "secondary" | "plain" | "danger" | "ghost";

export function buttonClass(variant: ButtonVariant = "primary", className?: string) {
  const variants: Record<ButtonVariant, string> = {
    primary: "bg-coral text-white hover:-translate-y-0.5",
    secondary: "bg-aqua text-ink hover:-translate-y-0.5",
    plain: "bg-panel text-ink hover:-translate-y-0.5",
    danger: "bg-ink text-white hover:-translate-y-0.5",
    ghost: "border-transparent bg-transparent text-ink shadow-none hover:bg-lemon/50",
  };
  return cn(
    "inline-flex min-h-10 items-center justify-center gap-2 border-2 border-ink px-4 py-2 text-sm font-black transition disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50",
    variant !== "ghost" && "shadow-block-sm active:translate-x-1 active:translate-y-1 active:shadow-none",
    variants[variant],
    className,
  );
}

export function Button({
  children,
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button className={buttonClass(variant, className)} {...props}>
      {children}
    </button>
  );
}

export function Panel({
  children,
  className,
  accent = "bg-panel",
}: {
  children: ReactNode;
  className?: string;
  accent?: string;
}) {
  return <section className={cn("border-2 border-ink p-5 shadow-block", accent, className)}>{children}</section>;
}

export function PageTitle({
  eyebrow,
  title,
  children,
  action,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        {eyebrow ? <div className="mb-2 font-mono text-xs font-black uppercase text-coral">{eyebrow}</div> : null}
        <h1 className="text-4xl font-black leading-tight text-ink md:text-5xl">{title}</h1>
        {children ? <div className="mt-3 text-base font-semibold text-ink/75">{children}</div> : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-black text-ink">{label}</span>
      {children}
      {hint ? <span className="text-xs font-semibold text-ink/60">{hint}</span> : null}
    </label>
  );
}

const controlClass =
  "min-h-11 w-full border-2 border-ink bg-white px-3 py-2 text-sm font-bold text-ink outline-none shadow-block-sm transition placeholder:text-ink/40 focus:-translate-y-0.5 focus:shadow-block";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlClass, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(controlClass, "min-h-32 resize-y", className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(controlClass, className)} {...props} />;
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="border-2 border-dashed border-ink bg-white/70 p-8 text-center">
      <div className="text-lg font-black text-ink">{title}</div>
      {children ? <div className="mt-2 text-sm font-semibold text-ink/65">{children}</div> : null}
    </div>
  );
}

export function Notice({
  children,
  tone = "bg-lemon",
  className,
}: {
  children: ReactNode;
  tone?: string;
  className?: string;
}) {
  return <div className={cn("border-2 border-ink p-3 text-sm font-bold text-ink shadow-block-sm", tone, className)}>{children}</div>;
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 font-black text-ink">
      <span className="h-4 w-4 animate-spin border-2 border-ink border-t-transparent" />
      <span>{label}</span>
    </div>
  );
}

export function Metric({
  label,
  value,
  tone = "bg-panel",
}: {
  label: string;
  value: ReactNode;
  tone?: string;
}) {
  return (
    <div className={cn("border-2 border-ink p-4 shadow-block-sm", tone)}>
      <div className="font-mono text-xs font-black uppercase text-ink/60">{label}</div>
      <div className="mt-1 text-2xl font-black text-ink">{value}</div>
    </div>
  );
}
