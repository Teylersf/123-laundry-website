import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

export function Section({
  children,
  className = "",
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`py-12 md:py-20 ${className}`}>
      <div className="mx-auto max-w-7xl px-4 md:px-6">{children}</div>
    </section>
  );
}

export function SectionEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand">
      {children}
    </p>
  );
}

export function SectionHeading({
  level = 2,
  children,
  className = "",
}: {
  level?: 1 | 2 | 3;
  children: ReactNode;
  className?: string;
}) {
  const Tag = (`h${level}` as unknown) as "h1" | "h2" | "h3";
  const sizes = {
    1: "text-4xl sm:text-5xl md:text-6xl",
    2: "text-3xl md:text-4xl",
    3: "text-2xl md:text-3xl",
  } as const;
  return (
    <Tag className={`font-bold tracking-tight ${sizes[level]} ${className}`}>
      {children}
    </Tag>
  );
}

type ButtonProps = {
  href: string;
  variant?: "primary" | "secondary" | "ghost";
  external?: boolean;
  children: ReactNode;
  className?: string;
} & Omit<ComponentPropsWithoutRef<"a">, "href" | "children" | "className">;

export function Button({
  href,
  variant = "primary",
  external,
  children,
  className = "",
  ...rest
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm md:text-base font-semibold transition";
  const styles = {
    primary: "bg-brand text-white hover:bg-brand-600 shadow-sm shadow-brand-500/30",
    secondary: "bg-ink text-white hover:bg-ink-soft",
    ghost: "border border-line text-ink hover:border-brand hover:text-brand",
  }[variant];

  const finalClass = `${base} ${styles} ${className}`;

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={finalClass}
        {...rest}
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={finalClass}>
      {children}
    </Link>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-line bg-paper p-6 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
      {children}
    </span>
  );
}

export function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="font-display text-3xl font-extrabold text-brand-200 drop-shadow-md md:text-4xl">
        {value}
      </div>
      <div className="mt-1 text-sm font-medium opacity-90">{label}</div>
    </div>
  );
}

export function Breadcrumbs({
  trail,
}: {
  trail: { label: string; href?: string }[];
}) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-ink/60">
      <ol className="flex flex-wrap items-center gap-1">
        {trail.map((node, idx) => {
          const isLast = idx === trail.length - 1;
          return (
            <li key={`${node.label}-${idx}`} className="flex items-center gap-1">
              {idx > 0 && <span aria-hidden="true">/</span>}
              {node.href && !isLast ? (
                <Link href={node.href} className="hover:text-brand">
                  {node.label}
                </Link>
              ) : (
                <span aria-current={isLast ? "page" : undefined}>
                  {node.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
