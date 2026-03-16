import * as React from "react";

export function Textarea({ className = "", ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`w-full border border-slate-300 bg-white px-3 py-2 text-sm ${className}`} {...props} />;
}
