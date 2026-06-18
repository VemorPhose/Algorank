import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "../lib/cn";

export function badgeClass(tone = "bg-ink text-lemon") {
  return cn(
    "inline-flex items-center gap-1 rounded-lg border-[3px] border-ink px-2.5 py-1 text-xs font-black uppercase leading-none shadow-block-sm",
    tone,
  );
}

export function Badge({ children, tone, className }: { children: ReactNode; tone?: string; className?: string }) {
  return <span className={cn(badgeClass(tone), className)}>{children}</span>;
}

type ButtonVariant = "primary" | "secondary" | "plain" | "danger" | "ghost";

export function buttonClass(variant: ButtonVariant = "primary", className?: string) {
  const variants: Record<ButtonVariant, string> = {
    primary: "bg-coral text-lemon hover:-translate-y-0.5",
    secondary: "bg-aqua text-lemon hover:-translate-y-0.5",
    plain: "bg-panel text-ink hover:-translate-y-0.5",
    danger: "bg-ink text-lemon hover:-translate-y-0.5",
    ghost: "border-transparent bg-transparent text-ink shadow-none hover:bg-panel/60",
  };
  return cn(
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border-[3px] border-ink px-4 py-2 text-sm font-black transition disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50",
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
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-lg border-[3px] border-ink p-5 shadow-block transition duration-200",
        "after:pointer-events-none after:absolute after:right-3 after:top-3 after:h-5 after:w-5 after:bg-coral after:[clip-path:polygon(50%_0,100%_100%,0_100%)]",
        accent,
        className,
      )}
    >
      {children}
    </section>
  );
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
    <div className="atlas-enter flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl flex flex-col">
        {eyebrow ? (
          <div className="inline-flex w-fit rounded-lg border-[3px] border-ink bg-coral px-3 py-1 font-mono text-xs font-black uppercase text-lemon shadow-block-sm">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="block max-w-5xl rounded-lg border-[3px] border-ink bg-panel px-3 pb-2 pt-1 text-4xl font-black leading-none text-ink shadow-block md:text-6xl mt-3">
          {title}
        </h1>
        {children ? <div className="mt-4 max-w-3xl text-base font-bold leading-7 text-ink">{children}</div> : null}
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
  "min-h-11 w-full rounded-lg border-[3px] border-ink bg-panel px-3 py-2 text-sm font-bold text-ink outline-none shadow-block-sm transition placeholder:text-ink/50 focus:-translate-y-0.5 focus:shadow-block";

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
    <div className="rounded-lg border-[3px] border-dashed border-ink bg-panel/80 p-8 text-center shadow-block-sm">
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
  return <div className={cn("rounded-lg border-[3px] border-ink p-3 text-sm font-bold text-ink shadow-block-sm", tone, className)}>{children}</div>;
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 font-black text-ink">
      <span className="h-4 w-4 animate-spin rounded-full border-[3px] border-ink border-t-transparent" />
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
    <div className={cn("relative overflow-hidden rounded-lg border-[3px] border-ink p-4 shadow-block-sm", tone)}>
      <div className="font-mono text-xs font-black uppercase text-current opacity-75">{label}</div>
      <div className="mt-2 text-3xl font-black leading-none text-current">{value}</div>
    </div>
  );
}
