"use client";

import { useEffect, useState, useRef } from "react";
import { useInView } from "framer-motion";
import { cn } from "@/lib/utils";

interface TypewriterNumberProps {
  value: string;
  suffix?: string;
  prefix?: string;
  className?: string;
  speed?: number;
  showCursor?: boolean;
  delay?: number;
}

/**
 * TypewriterNumber - Animated number display component
 *
 * Creates a typewriter effect for displaying numbers/values.
 * Perfect for metrics, balances, and key statistics.
 *
 * @example
 * <TypewriterNumber value="12,450" prefix="£" suffix=".00" />
 * <TypewriterNumber value="500" suffix="+" />
 */
export function TypewriterNumber({
  value,
  suffix = "",
  prefix = "",
  className,
  speed = 100,
  showCursor = true,
  delay = 0,
}: TypewriterNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [displayValue, setDisplayValue] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!isInView) return;

    // Reset state when value changes
    setDisplayValue("");
    setIsComplete(false);

    // Apply delay before starting animation
    const delayTimeout = setTimeout(() => {
      let i = 0;
      const interval = setInterval(() => {
        if (i <= value.length) {
          setDisplayValue(value.slice(0, i));
          i++;
        } else {
          clearInterval(interval);
          setIsComplete(true);
        }
      }, speed);

      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(delayTimeout);
  }, [isInView, value, speed, delay]);

  // Check for reduced motion preference
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  // If reduced motion is preferred, show full value immediately
  if (prefersReducedMotion) {
    return (
      <span ref={ref} className={cn("font-[family-name:var(--font-mono)]", className)}>
        {prefix}
        {value}
        {suffix}
      </span>
    );
  }

  return (
    <span ref={ref} className={cn("font-[family-name:var(--font-mono)]", className)}>
      {prefix}
      {displayValue}
      {isComplete && suffix}
      {showCursor && !isComplete && (
        <span className="typewriter-cursor" aria-hidden="true">|</span>
      )}
    </span>
  );
}

export default TypewriterNumber;
