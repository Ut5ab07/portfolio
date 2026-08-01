import Hero from "@/components/Hero";
import About from "@/components/About";
import Skills from "@/components/Skills";
import Projects from "@/components/Projects";
import GithubActivity from "@/components/GithubActivity";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="flex flex-col min-h-screen relative w-full items-center">
      
      {/* Scrollable Content */}
      <div className="flex-grow w-full flex flex-col items-center">
        <Hero />
        <About />
        <Skills />
        <Projects />
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex justify-center relative z-10">
          <GithubActivity />
        </div>
        <Contact />
      </div>

      <Footer />
    </main>
  );
}
