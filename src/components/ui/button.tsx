import * as React from "react";

type Variant = "default" | "outline" | "secondary";

function variantClass(variant: Variant) {
  if (variant === "outline") return "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50";
  if (variant === "secondary") return "bg-slate-200 text-slate-900 hover:bg-slate-300";
  return "bg-slate-900 text-white hover:bg-slate-800";
}

export function Button({
  className = "",
  variant = "default",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={`inline-flex items-center justify-center px-4 py-2 text-sm font-medium transition ${variantClass(variant)} ${className}`} {...props} />;
}
