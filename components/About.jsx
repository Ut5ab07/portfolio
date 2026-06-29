"use client";
import SectionWrapper from "./ui/SectionWrapper";
import GlassCard from "./ui/GlassCard";
import Image from "next/image";
import profilePic from "../public/profile.jpg";

export default function About() {
  return (
    <section id="about" className="relative z-10 w-full max-w-7xl px-4 sm:px-6 py-16 sm:py-24">
      <SectionWrapper>
        <GlassCard className="p-6 sm:p-8 md:p-12">
          <div className="flex flex-col gap-12 md:flex-row md:items-center">
            {/* Left Side: Photo Placeholder */}
            <div className="w-full md:w-1/3 flex justify-center">
              <div className="relative group cursor-pointer h-64 w-64 md:h-80 md:w-80 overflow-hidden rounded-2xl border border-white/20 shadow-[0_0_30px_rgba(52,211,153,0.1)] hover:shadow-[0_0_50px_rgba(52,211,153,0.5)] hover:border-emerald-400/60 transition-all duration-500 ease-in-out bg-zinc-800/50">
                {/* Fallback pattern since profile.jpg might not exist initially */}
                <div className="absolute inset-0 flex items-center justify-center text-zinc-500 text-sm italic">
                  Image Placeholder
                </div>
                <Image
                  src={profilePic}
                  alt="Utsab"
                  fill
                  className="object-cover z-10 opacity-0 filter grayscale hover:grayscale-0 transform transition-all duration-500 ease-in-out group-hover:scale-110"
                  onLoadingComplete={(img) => img.classList.remove("opacity-0")}
                />
              </div>
            </div>

            {/* Right Side: Text */}
            <div className="w-full md:w-2/3 space-y-6 text-gray-300 leading-relaxed text-lg">
              <div className="flex items-center w-full mb-6 cursor-pointer">
                <div className="flex-grow h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight md:text-4xl px-4 sm:px-6 whitespace-normal sm:whitespace-nowrap text-center">
                  About Me<span className="text-emerald-400">.</span>
                </h2>
                <div className="flex-grow h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
              </div>

              <p>
                Hello! I&apos;m Utsab, an aspiring AI and Data Science enthusiast with
                a strong curiosity for understanding complex systems and uncovering patterns within data. I&apos;m particularly interested in machine learning, semantic search, and recommendation systems,
                and I enjoy exploring how intelligent algorithms can be applied to solve real-world problems.
              </p>

              <p>
                I like working on projects that combine analytical thinking with practical
                implementation, allowing me to experiment with models, data, and different
                technologies. Along with the technical side of AI, I also enjoy building
                clean and intuitive applications
                that make complex technologies more accessible and user-friendly.
              </p>

              <p>
                Beyond my projects, I&apos;m always interested in learning about new developments in
                artificial intelligence and emerging technologies. In my free time,
                I enjoy watching movies and following sports,
                which helps me relax and stay inspired.
              </p>

            </div>
          </div>
        </GlassCard>
      </SectionWrapper>
    </section>
  );
}
