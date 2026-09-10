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
  title: "Leashed.io · Digital Learning University",
  description: "Build, enroll, and learn on the Leashed Learning Framework — 4 levels, 20 modules, 120 hours, 12 IACET CEUs, and a live LeashGuide AI tutor on every lesson.",
  keywords: ["Leashed.io", "Leashed Learning Framework", "Digital Learning University", "AI tutor", "CEU", "IACET", "SCORM", "course builder"],
  authors: [{ name: "Leashed.io" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Leashed.io · Digital Learning University",
    description: "Uniform course builder + live AI tutoring on the Leashed Learning Framework.",
    siteName: "Leashed.io",
    type: "website",
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
