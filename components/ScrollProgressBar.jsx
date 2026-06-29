"use client";
import { motion, useScroll } from "framer-motion";

export default function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[3px] z-50 bg-gradient-to-r from-emerald-400 to-amber-500 origin-left"
      style={{ scaleX: scrollYProgress }}
    />
  );
}
