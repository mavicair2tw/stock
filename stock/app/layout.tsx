import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Taiwan ETF Discipline Monitor',
  description: 'Production-style Taiwan ETF monitoring dashboard with category-specific signal logic and market-aware decision support.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
