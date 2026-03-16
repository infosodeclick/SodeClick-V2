import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'LoveBoard Production UI',
  description: 'Dating platform production UI prototype',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
