import * as React from "react";

export function Input({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`w-full border border-slate-300 bg-white px-3 py-2 text-sm ${className}`} {...props} />;
}
