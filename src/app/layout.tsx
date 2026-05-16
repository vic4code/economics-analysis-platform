import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Fund Flow Dashboard | Global Capital Flow',
  description: 'Global capital flow analysis platform',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)',  color: '#060c18' },
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap"
        />
      </head>
      <body>
        <script dangerouslySetInnerHTML={{__html: `
          (function(){
            var t = localStorage.getItem('theme') || 'dark';
            document.documentElement.setAttribute('data-theme', t);
            var m = document.querySelector('meta[name="theme-color"]:not([media])') || document.createElement('meta');
            m.setAttribute('name', 'theme-color');
            m.setAttribute('content', t === 'light' ? '#ffffff' : '#060c18');
            if (!m.parentNode) document.head.appendChild(m);
          })();
        `}} />
        {children}
      </body>
    </html>
  );
}
