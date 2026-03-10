import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import ParticleBackground from "@/components/ParticleBackground";
import ScrollProgressBar from "@/components/ScrollProgressBar";
import CursorGlow from "@/components/CursorGlow";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Utsab Raj Acharya",
  description: "AI Engineer & Data Science Enthusiast Portfolio",
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
      </body>
    </html>
  );
}
