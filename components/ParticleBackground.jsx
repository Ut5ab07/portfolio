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
        fpsLimit: 120,
        particles: {
          color: {
            value: "#fbbf24", // Warm amber-yellow
          },
          links: {
            enable: false, // Remove connecting lines
          },
          move: {
            enable: true,
            speed: { min: 0.1, max: 0.4 }, // Slow motion
            direction: "none",
            random: true,
            straight: false,
            outModes: {
              default: "out", // Particles float out and wrap/respawn
            },
          },
          number: {
            density: {
              enable: true,
              area: 800,
            },
            value: 80, // Lower count for elegant, sparse fireflies
          },
          opacity: {
            value: { min: 0.1, max: 0.8 },
            animation: {
              enable: true,
              speed: 1, // Glowing speed
              minimumValue: 0.1,
              sync: false, // Blinking independently
            },
          },
          shape: {
            type: "circle",
          },
          size: {
            value: { min: 1, max: 4 },
            animation: {
              enable: true,
              speed: 1.5,
              minimumValue: 1,
              sync: false,
            },
          },
        },
        interactivity: {
          events: {
            onHover: {
              enable: true,
              mode: "repulse", // Fireflies scatter when cursor approaches
            },
            resize: true,
          },
          modes: {
            repulse: {
              distance: 120,
              duration: 0.5,
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
