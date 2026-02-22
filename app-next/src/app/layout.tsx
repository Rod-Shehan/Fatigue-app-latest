import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { ThemeToggleInLayout } from "@/components/theme-toggle-in-layout";

export const metadata: Metadata = {
  title: "Driver Fatigue Log – WA",
  description: "WA Commercial Vehicle Fatigue Management",
};

const themeScript = `
(function() {
  var key = 'fatigue-theme';
  var stored = localStorage.getItem(key);
  var system = window.matchMedia('(prefers-color-scheme: dark)').matches;
  var dark = stored === 'dark' || (stored !== 'light' && system);
  if (dark) document.documentElement.classList.add('dark');
  else document.documentElement.classList.remove('dark');
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>
          <ThemeToggleInLayout />
          {children}
        </Providers>
      </body>
    </html>
  );
}
