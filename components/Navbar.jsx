"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { name: "Home", href: "#" },
  { name: "About", href: "#about" },
  { name: "Skills", href: "#skills" },
  { name: "Projects", href: "#projects" },
  { name: "Contact", href: "#contact" },
];

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Toggle darker background when scrolled down past 50 pixels
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-40 px-6 py-4"
    >
      {/* Top blur mask for the gap above the navbar */}
      <div 
        className={`absolute top-0 left-0 w-full h-12 pointer-events-none transition-all duration-300 -z-10 ${
          isScrolled ? "bg-[#0c0d0f]/80 backdrop-blur-md" : "opacity-0"
        }`}
        style={{
          maskImage: 'linear-gradient(to bottom, black 60%, transparent)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 60%, transparent)'
        }}
      />
      <div className="mx-auto max-w-7xl">
        <div 
          className={`glass-panel mx-auto flex items-center justify-between px-6 py-3 transition-all duration-300 ${
            isScrolled ? "bg-neutral-950/95 backdrop-blur-3xl border-emerald-500/30 shadow-[0_4px_30px_rgba(0,0,0,0.8)] py-4" : "bg-transparent shadow-none"
          }`}
        >
          <div className="text-xl font-bold tracking-tighter text-emerald-400">
            URA<span className="text-amber-500">.</span>
          </div>

          <nav className="hidden items-center space-x-8 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-sm font-medium text-gray-300 transition-colors hover:text-white"
              >
                {link.name}
              </a>
            ))}
          </nav>
          
          
          {/* Mobile Menu Toggle Button */}
          <button 
            className="md:hidden text-gray-300 hover:text-white relative z-50 p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="md:hidden absolute top-24 left-6 right-6 p-6 rounded-2xl glass-panel border border-white/10 shadow-2xl z-40 bg-neutral-900/95 backdrop-blur-xl"
          >
            <nav className="flex flex-col space-y-4">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-lg font-medium text-gray-300 transition-colors hover:text-emerald-400 border-b border-white/5 pb-2"
                >
                  {link.name}
                </a>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
