"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef, type ReactNode } from "react";

/**
 * Subtil parallax-wrapper for mock-skjermbilder i landing-seksjoner.
 * Når scrollet inn i view glir mock-en litt opp og roterer marginalt
 * for "popping out of page"-effekt. Veldig dempet — vi ønsker ikke
 * disorientation.
 */
export default function ParallaxMock({
  children, intensity = 1,
}: {
  children:   ReactNode;
  /** 0.5 = subtilt, 1 = normalt, 2 = mer markert. Default 1. */
  intensity?: number;
}) {
  const ref     = useRef<HTMLDivElement>(null);
  const reduce  = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // Glir 30px opp totalt over scroll-strekket (skalert med intensity)
  const y         = useTransform(scrollYProgress, [0, 1], [40 * intensity, -40 * intensity]);
  // Mikro-rotasjon for subtle "tilt"
  const rotate    = useTransform(scrollYProgress, [0, 0.5, 1], [1.5 * intensity, 0, -1.5 * intensity]);

  if (reduce) return <div ref={ref}>{children}</div>;

  return (
    <motion.div ref={ref} style={{ y, rotate, transformPerspective: 1000 }}>
      {children}
    </motion.div>
  );
}
