"use client";
import { useState } from "react";
import SectionWrapper from "./ui/SectionWrapper";
import GlassCard from "./ui/GlassCard";
import MagneticButton from "./ui/MagneticButton";
import { Send, FileDown, Github, Linkedin, Mail, Instagram } from "lucide-react";
import ContactModal from "./ContactModal";

export default function Contact() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <section id="contact" className="relative z-10 w-full max-w-4xl px-6 py-24 mx-auto">
      <SectionWrapper>
        <GlassCard className="p-10 text-center md:p-16 border-white/10">
          <div className="flex items-center w-full mb-6 cursor-pointer">
            <div className="flex-grow h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-white px-6 whitespace-nowrap">
              Let&apos;s Build Something<span className="text-cyan-400">.</span>
            </h2>
            <div className="flex-grow h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
          </div>
          
          <p className="max-w-xl mx-auto text-lg text-gray-300 mb-10 leading-relaxed">
            I&apos;m always open to discussing product design work, collaborations on data science projects, or partnering to build intelligent systems.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-12">
            <MagneticButton 
              className="flex items-center gap-2 bg-white text-slate-900 border border-transparent shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:bg-gray-100 cursor-pointer"
              onClick={() => setIsModalOpen(true)}
            >
              <Send className="w-4 h-4" />
              Send Message
            </MagneticButton>
            
            <MagneticButton className="flex items-center gap-2 border border-white/20 bg-white/5 hover:bg-white/10 text-white">
              <FileDown className="w-4 h-4" />
              Download Resume
            </MagneticButton>
          </div>

          <div className="flex items-center justify-center gap-8 border-t border-white/10 pt-8 mt-4">
            <a href="mailto:acharyautsab68@gmail.com" className="text-[#A8B2D1] hover:text-white transition-colors p-2 rounded-full hover:bg-white/5">
              <Mail className="w-6 h-6" />
              <span className="sr-only">Email</span>
            </a>
            <a href="https://github.com/Ut5ab07" target="_blank" rel="noopener noreferrer" className="text-[#A8B2D1] hover:text-white transition-colors p-2 rounded-full hover:bg-white/5">
              <Github className="w-6 h-6" />
              <span className="sr-only">GitHub</span>
            </a>
            <a href="https://linkedin.com/in/utsab-raj-acharya" target="_blank" rel="noopener noreferrer" className="text-[#A8B2D1] hover:text-white transition-colors p-2 rounded-full hover:bg-white/5">
              <Linkedin className="w-6 h-6" />
              <span className="sr-only">LinkedIn</span>
            </a>
            <a href="https://instagram.com/utsab.acharya.7" target="_blank" rel="noopener noreferrer" className="text-[#A8B2D1] hover:text-white transition-colors p-2 rounded-full hover:bg-white/5">
              <Instagram className="w-6 h-6" />
              <span className="sr-only">Instagram</span>
            </a>
            <a href="https://x.com/acharyautsab7" target="_blank" rel="noopener noreferrer" className="text-[#A8B2D1] hover:text-white transition-colors p-2 rounded-full hover:bg-white/5">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span className="sr-only">X (Twitter)</span>
            </a>
          </div>
        </GlassCard>
      </SectionWrapper>

      <ContactModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </section>
  );
}
