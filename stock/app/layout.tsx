import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Taiwan Stock Market Monitor',
  description: 'Taiwan stock market dashboard with candlestick chart, technical indicators, and recommendation insights.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
