"use client";
import { motion } from "framer-motion";
import GlassCard from "./ui/GlassCard";
import MagneticButton from "./ui/MagneticButton";
import SectionWrapper from "./ui/SectionWrapper";
import { Github, FileText, ArrowRight, FileDown } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative flex min-h-screen w-full flex-col items-center justify-center px-6 pt-20">
      <SectionWrapper delay={0.2} className="z-10 w-full max-w-4xl">
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        >
          <GlassCard className="flex flex-col items-center p-10 text-center md:p-16">
            <h1 className="mb-4 bg-gradient-to-r from-white via-cyan-100 to-purple-200 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent sm:text-7xl cursor-pointer hover:scale-105 transition-transform duration-300">
              Utsab Raj Acharya
            </h1>

            <h2 className="mb-6 text-xl font-medium text-cyan-400 sm:text-2xl cursor-pointer hover:text-cyan-300 transition-colors duration-300">
              AI Engineer &bull; Data Science Enthusiast
            </h2>

            <p className="max-w-xl text-base leading-relaxed text-gray-300 sm:text-lg">
              Building intelligent systems with data and algorithms. Specialized in
              machine learning, backend systems, and crafting engaging user experiences.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
              <a href="#projects" className="w-full sm:w-auto">
                <MagneticButton className="flex w-full items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 to-cyan-500 text-white hover:from-cyan-500 hover:to-cyan-400 shadow-[0_0_20px_rgba(91,192,190,0.3)]">
                  View Projects
                  <ArrowRight className="h-4 w-4" />
                </MagneticButton>
              </a>

              <a href="/resume.pdf" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
                <MagneticButton className="flex w-full items-center justify-center gap-2 border border-white/20 bg-white/5 hover:bg-white/10 text-white">
                  <FileDown className="h-4 w-4" />
                  Resume
                </MagneticButton>
              </a>

              <a href="https://github.com/Ut5ab07" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
                <MagneticButton className="flex w-full items-center justify-center gap-2 border border-white/10 bg-white/5 hover:bg-white/10 text-white">
                  <Github className="h-4 w-4" />
                  GitHub
                </MagneticButton>
              </a>
            </div>
          </GlassCard>
        </motion.div>
      </SectionWrapper>
    </section>
  );
}
