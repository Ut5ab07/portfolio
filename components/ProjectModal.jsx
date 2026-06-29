"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Github, ExternalLink } from "lucide-react";
import GlassCard from "./ui/GlassCard";

export default function ProjectModal({ isOpen, onClose, project }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && project && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 py-8 pointer-events-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-3xl pointer-events-auto"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative z-10 w-full max-w-3xl pointer-events-auto max-h-[90vh] flex flex-col"
          >
            <GlassCard className="flex flex-col overflow-hidden max-h-[90vh] bg-neutral-900/80 mt-16 md:mt-0">
              <div className="flex items-center justify-between border-b border-white/10 p-4 md:p-6 bg-neutral-900/50">
                <h3 className="text-xl md:text-2xl font-bold text-white pr-8">{project.title}</h3>
                <button
                  onClick={onClose}
                  className="rounded-full p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white shrink-0 absolute top-4 right-4 md:static"
                >
                  <X className="h-5 w-5 md:h-6 md:w-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/20">
                <p className="mb-6 md:mb-8 text-base md:text-lg text-gray-300">
                  {project.fullDescription || project.description}
                </p>

                <div className="space-y-6">
                  <div>
                    <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-emerald-400">
                      Features
                    </h4>
                    <ul className="list-inside list-disc space-y-2 text-sm md:text-base text-gray-300">
                      {project.features?.map((feature, idx) => (
                        <li key={idx}>{feature}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-amber-400">
                      Tech Stack
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {project.tech.map((tech, idx) => (
                        <span
                          key={idx}
                          className="rounded-md bg-white/10 px-3 py-1 text-xs md:text-sm text-gray-200 border border-white/5"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-end gap-3 border-t border-white/10 bg-black/40 p-4 md:p-6">
                <a
                  href={project.githubLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 font-medium text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <Github className="h-4 w-4" />
                  Source Code
                </a>
                {/*
                <a
                  href={project.demoLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 font-medium text-white shadow-lg transition-colors hover:bg-emerald-500 hover:shadow-emerald-500/25"
                >
                  <ExternalLink className="h-4 w-4" />
                  Live Demo
                </a>
                */}
              </div>
            </GlassCard>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
