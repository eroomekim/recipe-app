import type { Metadata, Viewport } from "next";
import { Playfair_Display, Libre_Baskerville, Inter, Geist } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/layout/Navbar";
import ThemeProvider from "@/components/ThemeProvider";
import "./globals.css";
import { cn } from "@/lib/utils";

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

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
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
    <html lang="en" suppressHydrationWarning className={cn("font-sans", geist.variable)}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        suppressHydrationWarning
        className={`${playfair.variable} ${libreBaskerville.variable} ${geist.variable}`}
      >
        <ThemeProvider />
        <Navbar user={user ? { email: user.email! } : null} />
        {children}
      </body>
    </html>
  );
}
