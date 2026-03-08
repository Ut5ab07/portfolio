"use client";
import { useState } from "react";
import SectionWrapper from "./ui/SectionWrapper";
import { Github, ExternalLink, ArrowRight } from "lucide-react";
import ProjectModal from "@/components/ProjectModal";

const PROJECTS_DATA = [
  {
    id: 1,
    title: "Semantic Movie Search Engine",
    description: "A semantic search engine that enables natural language movie discovery using transformer-based embeddings and vector similarity retrieval.",
    fullDescription: "A semantic search engine that allows users to discover movies using natural language queries instead of exact keywords. The system uses transformer-based sentence embeddings to capture the meaning of user queries and performs vector similarity search to retrieve the most relevant films. This enables intuitive discovery of movies based on themes, moods, or vague descriptions.",
    features: [
      "Natural language movie search using semantic embeddings",
      "Vector similarity search for context-aware recommendations",
      "Efficient movie retrieval using FAISS vector indexing",
      "Interactive user interface for exploring results",
      "Supports vague queries like “movies about friendship in space”"
    ],
    tech: ["Python", "SentenceTransformers", "FAISS", "Pandas"],
    githubLink: "https://github.com/Ut5ab07/semantic-movie-search-engine"
  },
  {
    id: 2,
    title: "Graph-Based Movie Recommendation System",
    description: "Movie recommendation system that models users and movies as a graph to discover similar users and suggest films based on shared viewing preferences",
    fullDescription: "A movie recommendation system that models relationships between users and movies using graph theory. Users and movies are represented as nodes in a bipartite graph, where edges indicate positively rated movies. By analyzing graph connectivity and shared preferences between users, the system identifies similar users and recommends movies that like-minded viewers have enjoyed. This approach enables discovery of new genres and personalized recommendations through network-based analysis.",
    features: [
      "Bipartite graph representation of users and movies",
      "Edge creation based on positively rated movies",
      "Graph traversal to identify similar users",
      "Recommendation generation through shared movie connections",
      "Exploration of hidden relationships between user preferences"
    ],
    tech: ["Python", "NetworkX", "Pandas", "Flask", "HTML", "CSS", "JavaScript"],
    githubLink: "https://github.com/Ut5ab07/Movie_recommendation"
  }
];

export default function Projects() {
  const [selectedProject, setSelectedProject] = useState(null);

  return (
    <section id="projects" className="relative z-10 w-full max-w-7xl px-6 py-24">
      <SectionWrapper>
        <div className="mb-14 flex items-center w-full cursor-pointer">
          <div className="flex-grow h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-white px-6 whitespace-nowrap">
            Featured Projects<span className="text-cyan-400">.</span>
          </h2>
          <div className="flex-grow h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {PROJECTS_DATA.map((project) => (
            <div
              key={project.id}
              onClick={() => setSelectedProject(project)}
              className="group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md transition-all duration-300 hover:-translate-y-2 hover:border-cyan-500/50 hover:bg-white/10 hover:shadow-[0_0_30px_rgba(91,192,190,0.2)]"
            >
              <h3 className="mb-2 text-xl font-bold text-white group-hover:text-cyan-400 transition-colors">
                {project.title}
              </h3>
              
              <p className="mb-6 flex-1 text-sm text-gray-300 leading-relaxed">
                {project.description}
              </p>

              <div className="mb-6 flex flex-wrap gap-2">
                {project.tech.slice(0, 3).map((tech, idx) => (
                  <span
                    key={idx}
                    className="rounded bg-white/5 px-2 py-1 text-xs font-medium text-gray-400"
                  >
                    {tech}
                  </span>
                ))}
                {project.tech.length > 3 && (
                  <span className="rounded bg-white/5 px-2 py-1 text-xs font-medium text-gray-400">
                    +{project.tech.length - 3}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-white/5 pt-4">
                <button 
                  className="flex items-center gap-2 text-sm font-medium text-gray-400 transition-colors hover:text-white"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Github className="h-4 w-4" />
                  Code
                </button>
                {/* 
                <button 
                  className="flex items-center gap-2 text-sm font-medium text-cyan-500 transition-colors hover:text-cyan-400"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-4 w-4" />
                  Demo
                </button>
                */}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 flex justify-center w-full">
          <a
            href="https://github.com/Ut5ab07?tab=repositories" 
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2 text-gray-300 hover:text-cyan-400 transition-colors font-medium text-lg bg-white/5 border border-white/10 px-6 py-3 rounded-full hover:bg-white/10 hover:border-cyan-500/30 backdrop-blur-sm"
          >
            <span>More Projects on GitHub</span>
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </a>
        </div>
      </SectionWrapper>

      <ProjectModal
        isOpen={!!selectedProject}
        onClose={() => setSelectedProject(null)}
        project={selectedProject}
      />
    </section>
  );
}
