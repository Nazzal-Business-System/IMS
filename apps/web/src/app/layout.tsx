import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Nazzal IMS Demo",
  description: "Inventory Management System Demo",
};

const themeInitScript = `
(function () {
  try {
    var raw = localStorage.getItem('ims_theme');
    if (!raw) return;
    var s = JSON.parse(raw);
    var mode = s.mode === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : s.mode;
    var root = document.documentElement;
    if (mode === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    root.classList.toggle('light', mode === 'light');
    var light = {
      teal: '#0d9488', blue: '#2563eb', purple: '#7c3aed', emerald: '#059669'
    };
    var dark = {
      teal: '#2dd4bf', blue: '#60a5fa', purple: '#a78bfa', emerald: '#34d399'
    };
    var map = mode === 'dark' ? dark : light;
    var accent = s.accent && map[s.accent] ? map[s.accent] : map.teal;
    root.style.setProperty('--accent', accent);
    if (s.density) root.dataset.density = s.density;
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
