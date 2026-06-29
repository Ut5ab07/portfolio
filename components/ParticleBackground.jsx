"use client";
import { useEffect, useState } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";

export default function ParticleBackground() {
  const [init, setInit] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setInit(true);
    });
  }, []);

  if (!init) return null;

  return (
    <Particles
      id="tsparticles"
      className="fixed inset-0 -z-10 w-full h-full"
      options={{
        fpsLimit: 60,
        particles: {
          color: {
            value: "#34d399",
          },
          links: {
            color: "#34d399",
            distance: 120,
            enable: true,
            opacity: 0.2,
            width: 1,
          },
          move: {
            enable: true,
            speed: 0.5,
            direction: "none",
            random: true,
            straight: false,
            outModes: {
              default: "bounce", // Keep them on screen
            },
          },
          number: {
            density: {
              enable: true,
              area: 400, // Reduced area increases density per square pixel
            },
            value: 300, // Significantly increased particle count
            limit: 400, // Increased hard limit
          },
          opacity: {
            value: 0.5,
          },
          shape: {
            type: "circle",
          },
          size: {
            value: { min: 1, max: 3 },
          },
        },
        interactivity: {
          events: {
            onHover: {
              enable: true,
              mode: "grab", // React slightly to cursor hover
            },
            resize: true,
          },
          modes: {
            grab: {
              distance: 150,
              links: {
                opacity: 0.3,
              },
            },
          },
        },
        detectRetina: true,
        background: {
          color: "transparent",
        },
      }}
    />
  );
}
