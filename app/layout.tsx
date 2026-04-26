import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SyncroTable Demo',
  description: 'Local-first split billing MVP',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
