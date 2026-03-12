import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import ParticleBackground from "@/components/ParticleBackground";
import ScrollProgressBar from "@/components/ScrollProgressBar";
import CursorGlow from "@/components/CursorGlow";
import { Analytics } from "@vercel/analytics/react";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Utsab Raj Acharya",
  description: "Portfolio of Utsab Raj Acharya showcasing AI, machine learning, and data science projects.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen antialiased selection:bg-cyan-500/30`}>
        <ParticleBackground />
        <ScrollProgressBar />
        <CursorGlow />
        <Navbar />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
