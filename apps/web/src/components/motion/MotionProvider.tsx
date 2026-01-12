"use client";

import { MotionConfig, useReducedMotion } from "framer-motion";

interface MotionProviderProps {
  children: React.ReactNode;
}

export function MotionProvider({ children }: MotionProviderProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <MotionConfig
      reducedMotion={shouldReduceMotion ? "always" : "never"}
      transition={{
        type: "tween",
        ease: "easeOut",
        duration: shouldReduceMotion ? 0 : 0.2,
      }}
    >
      {children}
    </MotionConfig>
  );
}
