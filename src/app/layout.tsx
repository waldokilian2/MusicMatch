import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MusicMatch - Fall in love with music again",
  description: "Discover new music through swipe-based matching. Fall in love with music again with MusicMatch - the Tinder for music lovers.",
  keywords: ["MusicMatch", "music discovery", "Tinder for music", "music matching", "swipe music", "music app", "music recommendations"],
  authors: [{ name: "MusicMatch Team" }],
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon.svg", type: "image/svg+xml" }
    ],
    apple: [{ url: "/icon.svg", sizes: "any" }],
  },
  openGraph: {
    title: "MusicMatch - Fall in love with music again",
    description: "Discover new music through swipe-based matching. The Tinder for music lovers.",
    url: "https://musicmatch.app",
    siteName: "MusicMatch",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MusicMatch - Fall in love with music again",
    description: "Discover new music through swipe-based matching. The Tinder for music lovers.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
