import type { ComponentProps } from "react";

type Variant = "primary" | "secondary";

type ButtonProps = ComponentProps<"button"> & {
  variant?: Variant;
};

const variants = {
  primary: "bg-brand px-6 text-on-brand hover:bg-brand-hover sm:px-10",
  secondary: "border border-line bg-surface px-6 text-brand-ink hover:border-brand hover:bg-brand-soft sm:px-10",
};

/** Button styling, also used for links that should look like buttons. */
export function buttonClasses(variant: Variant = "primary", className = "") {
  return `inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl py-3 text-center text-base font-semibold sm:text-lg transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`;
}

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, className)} {...props} />;
}
