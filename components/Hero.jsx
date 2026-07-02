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
          <GlassCard className="flex flex-col items-center p-6 sm:p-10 text-center md:p-16">
            <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-7xl cursor-pointer hover:scale-105 transition-transform duration-300">
              Utsab Raj Acharya
            </h1>

            <h2 className="mb-6 text-lg font-medium text-emerald-400 sm:text-xl md:text-2xl cursor-pointer hover:text-emerald-300 transition-colors duration-300">
              AI  &bull; Data Science Enthusiast &bull; Developer
            </h2>

            <p className="max-w-xl text-base leading-relaxed text-gray-300 sm:text-lg">
              Building intelligent systems with data and algorithms. Specializing in
              machine learning, AI based systems and crafting engaging user experiences.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
              <a href="#projects" className="w-full sm:w-auto">
                <MagneticButton className="flex w-full items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:from-emerald-500 hover:to-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.3)]">
                  View Projects
                  <ArrowRight className="h-4 w-4" />
                </MagneticButton>
              </a>

              <a href="/utsab_resume.pdf" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
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
