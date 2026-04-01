import type { Metadata, Viewport } from "next";
import { Playfair_Display, Libre_Baskerville, Inter } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/layout/Navbar";
import ThemeProvider from "@/components/ThemeProvider";
import "./globals.css";

const themeScript = `(function(){var t=localStorage.getItem("theme-resolved");if(t==="dark")document.documentElement.classList.add("dark")})();`;

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const libreBaskerville = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#FFFFFF",
};

export const metadata: Metadata = {
  title: "Recipe Book",
  description: "Your personal recipe collection",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Recipe Book",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/apple-touch-icon.png",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        suppressHydrationWarning
        className={`${playfair.variable} ${libreBaskerville.variable} ${inter.variable}`}
      >
        <ThemeProvider />
        <Navbar user={user ? { email: user.email! } : null} />
        {children}
      </body>
    </html>
  );
}
