"use client";

import { motion, useReducedMotion } from "framer-motion";
import { type ReactNode } from "react";

/**
 * Scroll-reveal-wrapper. Fader inn + glir opp når elementet kommer i view.
 * Bruker viewport-once så vi ikke re-trigger ved tilbake-scroll (føles
 * rolig istedenfor unødvendig).
 *
 * Respekterer prefers-reduced-motion — da deaktiveres animasjonen helt.
 */
interface RevealProps {
  children:   ReactNode;
  delay?:     number;     // sekunder
  y?:         number;     // hvor langt nedenfra (px)
  className?: string;
  /** Bruk false for at det skal være helt usynlig før reveal — true er bare opacity-fade */
  hideUntilVisible?: boolean;
}

export default function Reveal({
  children, delay = 0, y = 24, className, hideUntilVisible = true,
}: RevealProps) {
  const reduce = useReducedMotion();

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={hideUntilVisible ? { opacity: 0, y } : { opacity: 0.4 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px 0px -80px 0px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
