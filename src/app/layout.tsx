import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/components/providers";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "FitBook – Personal Trainer Management",
  description:
    "Book sessions, track workouts, and manage your fitness journey with FitBook.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Ensure tap targets work well on mobile
  minimumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} antialiased bg-gray-50 text-gray-900`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
