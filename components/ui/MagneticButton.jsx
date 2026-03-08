"use client";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

export default function MagneticButton({ children, className, ...props }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Range of movement: 10px in either direction
  const xSpring = useTransform(x, [-100, 100], [-10, 10]);
  const ySpring = useTransform(y, [-100, 100], [-10, 10]);

  function handleMouse(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set(event.clientX - centerX);
    y.set(event.clientY - centerY);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.button
      onMouseMove={handleMouse}
      onMouseLeave={handleMouseLeave}
      style={{
        x: xSpring,
        y: ySpring,
      }}
      transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }}
      className={cn(
        "relative rounded-full px-6 py-3 font-medium transition-colors hover:bg-white/10 active:scale-95 cursor-pointer flex items-center justify-center",
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
}
