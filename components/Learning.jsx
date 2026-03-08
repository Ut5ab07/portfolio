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
            height: 320px;
            max-width: 600px;
            margin: 2rem auto 0;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .center-node {
            position: absolute;
            z-index: 10;
            padding: 12px 24px;
            background: rgba(168, 85, 247, 0.15); /* Purple tint */
            border: 1px solid rgba(168, 85, 247, 0.4);
            border-radius: 9999px;
            font-weight: 700;
            color: #fff;
            text-align: center;
            backdrop-filter: blur(8px);
            box-shadow: 0 0 20px rgba(168, 85, 247, 0.2);
          }

          .orbit-node {
            position: absolute;
            padding: 8px 16px;
            background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 9999px;
            font-size: 0.875rem;
            color: #e2e8f0;
            font-weight: 500;
            backdrop-filter: blur(8px);
            transition: all 0.3s ease;
            white-space: nowrap;
          }

          .orbit-node:hover {
            border-color: rgba(34, 211, 238, 0.4); /* Cyan highlight on hover */
            background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%);
            box-shadow: 0 0 15px rgba(34, 211, 238, 0.2);
          }

          /* Connection lines */
          .orbit-line {
            position: absolute;
            top: 50%;
            left: 50%;
            height: 1px;
            background: linear-gradient(90deg, rgba(168, 85, 247, 0.4) 0%, transparent 100%);
            transform-origin: 0 0;
            z-index: 1;
          }

          @keyframes float {
            0%, 100% { transform: translate(-50%, -50%) translateY(0px); }
            50% { transform: translate(-50%, -50%) translateY(-10px); }
          }
          
          @keyframes pulse-glow {
            0%, 100% { box-shadow: 0 0 20px rgba(168, 85, 247, 0.2); }
            50% { box-shadow: 0 0 35px rgba(168, 85, 247, 0.5); }
          }

          .center-node {
             animation: pulse-glow 4s ease-in-out infinite;
          }

          /* Positioning nodes via polar coordinates mapping manually */
          .node-1 { animation: float 6s ease-in-out infinite; top: 15%; left: 50%; }
          .node-2 { animation: float 7s ease-in-out infinite 1s; top: 35%; left: 15%; }
          .node-3 { animation: float 6.5s ease-in-out infinite 0.5s; top: 35%; left: 85%; }
          .node-4 { animation: float 7.5s ease-in-out infinite 1.5s; top: 85%; left: 30%; }
          .node-5 { animation: float 6s ease-in-out infinite 2s; top: 85%; left: 70%; }
          
          /* Corresponding lines */
          .line-1 { width: 110px; transform: rotate(-90deg); }
          .line-2 { width: 140px; transform: rotate(-160deg); }
          .line-3 { width: 140px; transform: rotate(-20deg); }
          .line-4 { width: 130px; transform: rotate(115deg); }
          .line-5 { width: 130px; transform: rotate(65deg); }

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
              AI & Data Science
            </div>

            {/* Connection Lines */}
            <div className="orbit-line line-1" />
            <div className="orbit-line line-2" />
            <div className="orbit-line line-3" />
            <div className="orbit-line line-4" />
            <div className="orbit-line line-5" />

            <div className="orbit-node node-1">Reinforcement Learning</div>
            <div className="orbit-node node-2">Computer Vision</div>
            <div className="orbit-node node-3">Generative AI</div>
            <div className="orbit-node node-4">Advanced ML</div>
            <div className="orbit-node node-5">Data Science</div>
          </div>
        </div>
      </GlassCard>
    </SectionWrapper>
  );
}
