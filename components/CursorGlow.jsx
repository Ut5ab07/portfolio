"use client";
import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export default function CursorGlow() {
  const [mounted, setMounted] = useState(false);
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);

  const springConfig = { damping: 25, stiffness: 200, mass: 0.5 };
  const cursorXSpring = useSpring(cursorX, springConfig);
  const cursorYSpring = useSpring(cursorY, springConfig);

  useEffect(() => {
    setMounted(true);
    const moveCursor = (e) => {
      cursorX.set(e.clientX - 300); // offset by half width/height
      cursorY.set(e.clientY - 300);
    };

    window.addEventListener("mousemove", moveCursor);
    return () => {
      window.removeEventListener("mousemove", moveCursor);
    };
  }, [cursorX, cursorY]);

  if (!mounted) return null;

  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-0 h-[600px] w-[600px] rounded-full"
      style={{
        x: cursorXSpring,
        y: cursorYSpring,
        background: "radial-gradient(circle, rgba(251, 191, 36, 0.03) 0%, rgba(0, 0, 0, 0) 65%)",
      }}
    />
  );
}
