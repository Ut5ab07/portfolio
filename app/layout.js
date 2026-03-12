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
 openGraph: {
    title: "Utsab Raj Acharya | AI & Data Science Portfolio",
    description:
      "AI • Data Science Enthusiast • Developer. Building intelligent systems with machine learning, data science, and modern AI technologies.",
    url: "https://www.utsabrajacharya.com.np",
    siteName: "Utsab Portfolio",
    images: [
      {
        url: "/preview.png",
        width: 1200,
        height: 630,
        alt: "Utsab Raj Acharya AI Data Science Portfolio",
      },
    ],
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Utsab Raj Acharya | AI & Data Science Portfolio",
    description:
      "AI • Data Science Enthusiast • Developer building intelligent systems and data-driven applications.",
    images: ["/preview.png"],
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
