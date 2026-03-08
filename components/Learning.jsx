"use client";
import SectionWrapper from "./ui/SectionWrapper";
import GlassCard from "./ui/GlassCard";
import { Sparkles } from "lucide-react";

const TOPICS = [
  "Reinforcement Learning",
  "Computer Vision",
  "Data Science",
  "Advanced ML",
  "Generative AI"
];

export default function Learning() {
  return (
    <SectionWrapper delay={0.2}>
      <GlassCard className="h-full p-8 border-white/10 hover:border-purple-500/30 transition-colors duration-500 relative overflow-hidden group min-h-[450px]">
        <style dangerouslySetInnerHTML={{__html: `
          .learning-orbit {
            position: relative;
            width: 100%;
            max-width: 600px;
            height: 340px; /* Reduced height to perfectly align with Github Activity */
            margin: 0 auto;
          }

          .center-node {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%); /* Keeps it exactly in the center */
            z-index: 10;
            width: 120px;  /* Slightly larger circle to prevent text spill */
            height: 120px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(168, 85, 247, 0.15); /* Purple tint */
            border: 1px solid rgba(168, 85, 247, 0.4);
            border-radius: 50%; /* Perfect circle */
            font-weight: 700;
            color: #fff;
            text-align: center;
            line-height: 1.3;
            font-size: 0.95rem;
            backdrop-filter: blur(8px);
            box-shadow: 0 0 20px rgba(168, 85, 247, 0.2);
            animation: pulse-glow 4s ease-in-out infinite;
            cursor: pointer;
            transition: all 0.3s ease;
          }

          .center-node:hover {
            border-color: rgba(168, 85, 247, 0.8);
            background: rgba(168, 85, 247, 0.25);
            box-shadow: 0 0 30px rgba(168, 85, 247, 0.6);
          }

          .orbit-node {
            position: absolute;
            padding: 8px 18px; /* Slightly tighter padding to fit the new layout */
            background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 9999px;
            font-size: 0.85rem;
            color: #e2e8f0;
            font-weight: 500;
            backdrop-filter: blur(8px);
            transition: all 0.3s ease;
            white-space: nowrap;
            cursor: pointer;
            z-index: 5;
          }

          .orbit-node:hover {
            border-color: rgba(34, 211, 238, 0.4); /* Cyan highlight on hover */
            background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%);
            box-shadow: 0 0 15px rgba(34, 211, 238, 0.2);
          }

          /* Floating Animations with embedded un-translated centering */
          @keyframes float-1 {
            0%, 100% { transform: translate(-50%, -50%) translateY(0px); }
            50% { transform: translate(-50%, -50%) translateY(-6px); }
          }
          @keyframes float-2 {
            0%, 100% { transform: translate(-50%, -50%) translateY(0px); }
            50% { transform: translate(-50%, -50%) translateY(-8px); }
          }
          
          @keyframes pulse-glow {
            0%, 100% { transform: translate(-50%, -50%) scale(1); box-shadow: 0 0 20px rgba(168, 85, 247, 0.2); }
            50% { transform: translate(-50%, -50%) scale(1.03); box-shadow: 0 0 35px rgba(168, 85, 247, 0.5); }
          }

          /* Perfect circle spacing adjusted for the tighter 340px height */
          .orbit-1 { top: 12%; left: 50%; animation: float-1 6s ease-in-out infinite; } 
          .orbit-2 { top: 38%; left: 20%; animation: float-2 7s ease-in-out infinite 1s; } 
          .orbit-3 { top: 38%; left: 80%; animation: float-2 6.5s ease-in-out infinite 0.5s; } 
          .orbit-4 { top: 80%; left: 32%; animation: float-2 7.5s ease-in-out infinite 1.5s; } 
          .orbit-5 { top: 80%; left: 68%; animation: float-2 6s ease-in-out infinite 2s; }

        `}} />
        <div className="absolute bottom-0 left-0 p-32 bg-purple-500/5 rounded-full blur-3xl -ml-16 -mb-16 group-hover:bg-purple-500/10 transition-colors duration-500" />

        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-center w-full mb-4 cursor-pointer">
            <div className="flex-grow h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            <div className="flex items-center gap-3 px-6 text-white">
              <Sparkles className="h-8 w-8 text-purple-400" />
              <h3 className="text-2xl font-bold tracking-tight whitespace-nowrap">Currently Learning</h3>
            </div>
            <div className="flex-grow h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
          </div>

          <p className="text-gray-300 text-center mb-2">
            Always pushing boundaries and exploring new technologies to build better, more efficient systems.
          </p>

          <div className="learning-orbit">
            <div className="center-node">
              AI & <br /> Data Science
            </div>

            <div className="orbit-node orbit-1">Reinforcement Learning</div>
            <div className="orbit-node orbit-2">Computer Vision</div>
            <div className="orbit-node orbit-3">Generative AI</div>
            <div className="orbit-node orbit-4">Advanced ML</div>
            <div className="orbit-node orbit-5">Data Science</div>
          </div>
        </div>
      </GlassCard>
    </SectionWrapper>
  );
}
