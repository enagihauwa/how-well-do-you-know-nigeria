import type { ComponentProps } from "react";

type ButtonProps = ComponentProps<"button"> & {
  variant?: "primary" | "secondary";
};

const variants = {
  primary:
    "bg-brand px-6 text-lg text-white shadow-lg shadow-brand/30 hover:bg-brand-dark hover:shadow-xl sm:px-10",
  secondary:
    "border-2 border-brand bg-surface px-6 text-base text-brand-ink hover:bg-brand-soft sm:px-10 sm:text-lg",
};

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-14 items-center justify-center gap-2 rounded-xl py-3 text-center font-bold tracking-wide transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
