import React from 'react';

export function Card({ className = '', children }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-[28px] border-0 bg-white shadow-sm ${className}`}>{children}</div>;
}

export function CardContent({ className = '', children }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={className}>{children}</div>;
}

export function CardHeader({ className = '', children }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={className}>{children}</div>;
}

export function CardTitle({ className = '', children }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={`text-xl font-bold ${className}`}>{children}</h3>;
}

export function Button({ className = '', children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function OutlineButton({ className = '', children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none ${props.className ?? ''}`} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none ${props.className ?? ''}`} />;
}
