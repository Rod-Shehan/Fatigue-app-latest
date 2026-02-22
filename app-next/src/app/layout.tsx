import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { ThemeToggleInLayout } from "@/components/theme-toggle-in-layout";

export const metadata: Metadata = {
  title: "Driver Fatigue Log – WA",
  description: "WA Commercial Vehicle Fatigue Management",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <ThemeToggleInLayout />
          {children}
        </Providers>
      </body>
    </html>
  );
}
