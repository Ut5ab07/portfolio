"use client";
import { Mountain, MapPin } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-white/10 bg-neutral-900/50 backdrop-blur-md py-8 relative z-10">
      <div className="mx-auto max-w-7xl px-6 flex flex-col items-center justify-between gap-6 sm:flex-row">
        
        <div className="flex flex-col items-center sm:items-start gap-1">
          <span className="text-lg font-bold tracking-tight text-white gap-2 flex items-center">
            Utsab Raj Acharya<span className="text-emerald-400">.</span>
          </span>
          <p className="text-gray-400 text-sm">
            &copy; {currentYear} Utsab Raj Acharya. All rights reserved.
          </p>
        </div>

        <div className="text-sm text-[#A8B2D1] text-center sm:text-right flex flex-col items-center sm:items-end gap-1.5 mt-6 sm:mt-0">
          <p className="flex items-center gap-1.5">
            <Mountain className="w-4 h-4 text-emerald-400" />
            From Pokhara, Nepal
          </p>
          <p className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-emerald-400" />
            Currently in Bangalore, India
          </p>
        </div>
      </div>
    </footer>
  );
}
