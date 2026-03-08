"use client";
import { useState, useEffect } from "react";
import SectionWrapper from "./ui/SectionWrapper";
import GlassCard from "./ui/GlassCard";
import { BookOpen, Users, Star, FileCode2 } from "lucide-react";

export default function GithubActivity() {
  const [stats, setStats] = useState({
    repos: "...",
    followers: "...",
    contributions: "...",
    gists: "...",
  });

  useEffect(() => {
    async function fetchGithubStats() {
      const username = "Ut5ab07";
      let fetchedStats = {
        repos: 14,
        followers: 11,
        contributions: 382,
        gists: 0,
      };

      try {
        const userRes = await fetch(`https://api.github.com/users/${username}`);
        if (userRes.ok) {
          const userData = await userRes.json();
          fetchedStats.repos = userData.public_repos ?? fetchedStats.repos;
          fetchedStats.followers = userData.followers ?? fetchedStats.followers;
          fetchedStats.gists = userData.public_gists ?? fetchedStats.gists;
        }
      } catch (e) {
        console.error("Failed to fetch GitHub user data", e);
      }

      try {
         const contribRes = await fetch(`/api/github?username=${username}`);
         if (contribRes.ok) {
           const contribData = await contribRes.json();
           fetchedStats.contributions = contribData.totalContributions ?? fetchedStats.contributions;
         }
      } catch (e) {
        console.error("Failed to fetch GitHub contributions proxy", e);
      }

      setStats({
        repos: fetchedStats.repos.toString(),
        followers: fetchedStats.followers.toString(),
        contributions: fetchedStats.contributions.toString(),
        gists: fetchedStats.gists.toString(),
      });
    }
    fetchGithubStats();
  }, []);

  return (
    <SectionWrapper>
      <GlassCard className="h-full p-8 relative overflow-hidden border-white/10 transition-colors duration-500">
        
        <div className="relative z-10">
          <div className="flex items-center w-full mb-8 cursor-pointer">
            <div className="flex-grow h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            <div className="flex items-center gap-3 px-6 text-white">
              <a href="https://github.com/Ut5ab07" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3">
                <GithubIcon />
                <h3 className="text-2xl font-bold tracking-tight whitespace-nowrap">GitHub Activity</h3>
              </a>
            </div>
            <div className="flex-grow h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <StatBox icon={<BookOpen className="text-[#66E0FF]" />} label="Repositories" value={stats.repos} />
            <StatBox icon={<Users className="text-purple-400" />} label="Followers" value={stats.followers} />
            <StatBox icon={<Star className="text-emerald-400" />} label="Contributions" value={stats.contributions} />
            
            <div className="bg-slate-900/50 rounded-xl p-4 border border-white/5 flex flex-col items-start justify-between backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-2 w-full">
                <div className="p-2 bg-white/5 rounded-lg border border-white/5">
                  <FileCode2 className="text-amber-400 w-6 h-6" />
                </div>
                <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">Top Languages</div>
              </div>
              <div className="flex flex-col gap-1 w-full mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">Python</span>
                  <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-400 w-[75%] rounded-full"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">SQL</span>
                  <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-400 w-[15%] rounded-full"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white whitespace-nowrap overflow-hidden text-ellipsis mr-2">JavaScript</span>
                  <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden shrink-0">
                    <div className="h-full bg-yellow-400 w-[10%] rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>
    </SectionWrapper>
  );
}

function StatBox({ icon, label, value }) {
  return (
    <div className="bg-slate-900/50 rounded-xl p-4 border border-white/5 flex flex-col items-start gap-2 backdrop-blur-sm">
      <div className="p-2 bg-white/5 rounded-lg border border-white/5">
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</div>
      </div>
    </div>
  );
}

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}
