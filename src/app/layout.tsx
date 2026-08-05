import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import { ThemeProvider, type Theme } from "@/components/theme/theme-provider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Trivo",
    template: "%s · Trivo",
  },
  description:
    "Trivo is a personal triathlon training companion — swim, bike, run, and strength progress, body tracking, and generated training plans.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Trivo",
  },
};

export async function generateViewport(): Promise<Viewport> {
  const cookieStore = await cookies();
  const theme = cookieStore.get("theme")?.value === "light" ? "light" : "dark";

  return {
    themeColor: theme === "light" ? "#f6f8f5" : "#0a0c0b",
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    // Required for `env(safe-area-inset-*)` to resolve to real values —
    // without it iOS reports 0 for all of them, so the notch/status-bar and
    // home-indicator padding below silently does nothing when the app is
    // added to the home screen (statusBarStyle "black-translucent" draws
    // content under the status bar, which is exactly when this matters).
    viewportFit: "cover",
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const theme: Theme = cookieStore.get("theme")?.value === "light" ? "light" : "dark";

  return (
    <html
      lang="en"
      data-theme={theme}
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        <ThemeProvider initialTheme={theme}>{children}</ThemeProvider>
      </body>
    </html>
  );
}
