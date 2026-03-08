"use client";
/* eslint-disable @next/next/no-img-element */
import SectionWrapper from "./ui/SectionWrapper";
import TiltCard from "./ui/TiltCard";

import { 
  Brain, Network, Eye
} from "lucide-react";

const skillsData = [
  {
    category: "Languages",
    skills: [
      { name: "Python", icon: <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/python/python-original.svg" alt="Python" className="w-8 h-8 md:w-10 md:h-10" /> },
      { name: "Java", icon: <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/java/java-original.svg" alt="Java" className="w-8 h-8 md:w-10 md:h-10" /> },
      { name: "JavaScript", icon: <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/javascript/javascript-original.svg" alt="JavaScript" className="w-8 h-8 md:w-10 md:h-10 rounded-sm" /> },
      { name: "HTML", icon: <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/html5/html5-original.svg" alt="HTML" className="w-8 h-8 md:w-10 md:h-10" /> },
      { name: "CSS", icon: <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/css3/css3-original.svg" alt="CSS" className="w-8 h-8 md:w-10 md:h-10" /> }
    ]
  },
  {
    category: "Backend & DataBase",
    skills: [
      { name: "Flask", icon: <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/flask/flask-original.svg" alt="Flask" className="w-8 h-8 md:w-10 md:h-10 bg-white rounded p-1 object-contain" /> },
      { name: "PostgreSQL", icon: <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/postgresql/postgresql-original.svg" alt="PostgreSQL" className="w-8 h-8 md:w-10 md:h-10" /> }
    ]
  },
  {
    category: "AI / ML",
    skills: [
      { name: "Pandas", icon: <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/pandas/pandas-original.svg" alt="Pandas" className="w-8 h-8 md:w-10 md:h-10 bg-white rounded flex p-1" /> },
      { name: "NumPy", icon: <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/numpy/numpy-original.svg" alt="NumPy" className="w-8 h-8 md:w-10 md:h-10 bg-white rounded flex p-1" /> },
      { name: "Matplotlib", icon: <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/matplotlib/matplotlib-original.svg" alt="Matplotlib" className="w-8 h-8 md:w-10 md:h-10 bg-white rounded p-1" /> },
      { name: "Scikit Learn", icon: <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/scikitlearn/scikitlearn-original.svg" alt="Scikit Learn" className="w-8 h-8 md:w-10 md:h-10 bg-white rounded flex p-1" /> },
      { name: "OpenCV", icon: <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/opencv/opencv-original.svg" alt="OpenCV" className="w-8 h-8 md:w-10 md:h-10 bg-white rounded flex p-1" /> }
    ]
  },
  {
    category: "Developer Tools",
    skills: [
      { name: "Git", icon: <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/git/git-original.svg" alt="Git" className="w-8 h-8 md:w-10 md:h-10" /> },
      { name: "Postman", icon: <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/postman/postman-original.svg" alt="Postman" className="w-8 h-8 md:w-10 md:h-10" /> },
      { name: "Jupyter", icon: <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/jupyter/jupyter-original.svg" alt="Jupyter Notebook" className="w-8 h-8 md:w-10 md:h-10" /> }
    ]
  }
];

export default function Skills() {
  return (
    <section id="skills" className="relative z-10 w-full max-w-7xl px-6 py-24">
      <SectionWrapper>
        <div className="mb-16 flex items-center w-full cursor-pointer">
          <div className="flex-grow h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-white px-6 whitespace-nowrap">
            Technical Skills<span className="text-purple-500">.</span>
          </h2>
          <div className="flex-grow h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
        </div>

        <div className="flex flex-col w-full">
          {skillsData.map((group) => (
            <div key={group.category} className="skill-category mt-[60px] text-center flex flex-col items-center">
              <h3 className="skill-category-title text-[12px] tracking-[3px] uppercase mb-[10px] opacity-70 text-white">
                {group.category}
              </h3>

              <div 
                className="skill-divider w-[80px] h-[2px] mx-auto mb-[30px] rounded-[2px]"
                style={{ background: 'linear-gradient(90deg, transparent, #5BC0BE, #7C5CFF, transparent)' }}
              ></div>

              <div className="skills-wrapper max-w-[700px] mx-auto w-full">
                <div className="skills-grid flex flex-wrap justify-center gap-[16px]">
                  {group.skills.map((skill) => (
                    <TiltCard key={skill.name} className="h-28 w-28 sm:w-32 lg:w-36">
                      <div className="group relative flex h-full w-full flex-col items-center justify-center rounded-xl border border-white/5 bg-white/5 p-4 backdrop-blur-md transition-colors hover:border-cyan-500/30 hover:bg-white/10 shadow-lg cursor-pointer">
                        {/* Icon Container - Fades out slightly or moves up on hover */}
                        <div className="flex flex-col items-center justify-center transition-all duration-300 group-hover:-translate-y-3 group-hover:scale-90 group-hover:opacity-40">
                          {skill.icon}
                        </div>

                        {/* Tooltip Text - Hidden by default, appears on hover */}
                        <div className="absolute bottom-4 opacity-0 translate-y-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                          <span className="text-center font-medium text-white text-xs sm:text-sm whitespace-nowrap drop-shadow-md">
                            {skill.name}
                          </span>
                        </div>
                      </div>
                    </TiltCard>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionWrapper>
    </section>
  );
}
