import Hero from "@/components/Hero";
import About from "@/components/About";
import Skills from "@/components/Skills";
import Projects from "@/components/Projects";
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

        <Contact />
      </div>

      <Footer />
    </main>
  );
}
