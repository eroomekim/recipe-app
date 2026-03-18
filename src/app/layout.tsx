import type { Metadata } from "next";
import { Playfair_Display, Libre_Baskerville, Inter } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/layout/Navbar";
import "./globals.css";

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

export const metadata: Metadata = {
  title: "Recipe Book",
  description: "Your personal recipe collection",
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
    <html lang="en">
      <body
        className={`${playfair.variable} ${libreBaskerville.variable} ${inter.variable}`}
      >
        <Navbar user={user ? { email: user.email! } : null} />
        {children}
      </body>
    </html>
  );
}
