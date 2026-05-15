import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Fund Flow Dashboard | Global Capital Flow',
  description: 'Global capital flow analysis platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" media="print" />
      </head>
      <body>
        <script dangerouslySetInnerHTML={{__html: `
          (function(){
            var t = localStorage.getItem('theme') || 'dark';
            document.documentElement.setAttribute('data-theme', t);
          })();
        `}} />
        {children}
      </body>
    </html>
  );
}
