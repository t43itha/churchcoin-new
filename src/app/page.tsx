"use client";

import {
  motion,
  useInView,
  useSpring,
  useTransform,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import {
  Wallet,
  Gift,
  FileText,
  Users,
  Check,
  ArrowRight,
  ChevronDown,
  Calculator,
  Menu,
  X,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { landingContent } from "@/components/landing/shared";
import Link from "next/link";

// ============================================================================
// ANIMATION TIMING SYSTEM - Swiss Ledger Precision
// ============================================================================
const TIMING = {
  eyebrow: 0.1,
  headline: 0.3,
  card: 0.4,
  subheadline: 0.5,
  shadow: 0.6,
  balance: 0.7,
  ctas: 0.7,
  indicator: 0.9,
  trustBadge: 0.9,
  progressBars: 1.0,
  stats: 1.5,
};

const EASING = {
  smooth: [0.16, 1, 0.3, 1] as const,
  snappy: [0.65, 0, 0.35, 1] as const,
};

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================
const eyebrowVariants: Variants = {
  hidden: {
    opacity: 0,
    clipPath: "inset(0 100% 0 0)",
  },
  visible: {
    opacity: 1,
    clipPath: "inset(0 0% 0 0)",
    transition: {
      duration: 0.6,
      ease: EASING.smooth,
      delay: TIMING.eyebrow,
    }
  }
};

const indicatorPulseVariants: Variants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      delay: TIMING.eyebrow + 0.3,
      type: "spring",
      stiffness: 400,
      damping: 15,
    }
  },
  pulse: {
    boxShadow: [
      "0 0 0 0 rgba(107, 142, 107, 0.6)",
      "0 0 0 8px rgba(107, 142, 107, 0)",
    ],
    transition: {
      duration: 1.8,
      repeat: Infinity,
      ease: "easeOut",
    }
  }
};

const headlineContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: TIMING.headline,
    }
  }
};

const wordVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 40,
    filter: "blur(8px)",
    rotateX: -15,
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    rotateX: 0,
    transition: {
      duration: 0.5,
      ease: EASING.smooth,
    }
  }
};

const ctaContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: TIMING.ctas,
    }
  }
};

const ctaVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: EASING.smooth }
  }
};

const cardVariants: Variants = {
  hidden: {
    opacity: 0,
    x: 80,
    rotateY: -12,
    scale: 0.92,
  },
  visible: {
    opacity: 1,
    x: 0,
    rotateY: 0,
    scale: 1,
    transition: {
      duration: 0.9,
      ease: EASING.smooth,
      delay: TIMING.card,
    }
  }
};

const shadowVariants: Variants = {
  hidden: {
    x: 0,
    y: 0,
    opacity: 0,
  },
  visible: {
    x: 8,
    y: 8,
    opacity: 1,
    transition: {
      delay: TIMING.shadow,
      duration: 0.7,
      ease: EASING.smooth,
    }
  }
};

const progressBarContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.18,
      delayChildren: TIMING.progressBars,
    }
  }
};

const statsContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
      delayChildren: TIMING.stats,
    }
  }
};

const statItemVariants: Variants = {
  hidden: { opacity: 0, y: 25 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: EASING.smooth,
    }
  }
};

const decorativeShapeVariants: Variants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: (delay: number) => ({
    scale: 1,
    opacity: 0.6,
    transition: {
      delay,
      duration: 1.2,
      ease: EASING.smooth,
    }
  }),
  breathing: (duration: number) => ({
    scale: [1, 1.08, 1],
    opacity: [0.5, 0.7, 0.5],
    transition: {
      duration,
      repeat: Infinity,
      ease: "easeInOut",
    }
  })
};

// ============================================================================
// ANIMATED BALANCE COMPONENT - Spring-based counting
// ============================================================================
function AnimatedBalance({
  value,
  prefix = "£",
  delay = 0,
}: {
  value: number;
  prefix?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  const shouldReduceMotion = useReducedMotion();

  const springValue = useSpring(0, {
    stiffness: 30,
    damping: 25,
    mass: 1,
  });

  const displayValue = useTransform(springValue, (latest) =>
    Math.floor(latest).toLocaleString()
  );

  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (isInView) {
      const timer = setTimeout(() => {
        if (shouldReduceMotion) {
          setDisplay(value.toLocaleString());
        } else {
          springValue.set(value);
        }
      }, delay * 1000);
      return () => clearTimeout(timer);
    }
  }, [isInView, value, delay, springValue, shouldReduceMotion]);

  useEffect(() => {
    if (!shouldReduceMotion) {
      return displayValue.on("change", (v) => setDisplay(v));
    }
  }, [displayValue, shouldReduceMotion]);

  return (
    <div ref={ref} className="text-4xl font-bold font-mono tabular-nums">
      <motion.span
        initial={{ opacity: 0, scale: 0.9 }}
        animate={isInView ? { opacity: 1, scale: 1 } : {}}
        transition={{ delay: delay, duration: 0.4, ease: EASING.smooth }}
      >
        {prefix}{display}
      </motion.span>
    </div>
  );
}

// ============================================================================
// ANIMATED STAT VALUE - For income/expenses/gift aid
// ============================================================================
function AnimatedStatValue({
  value,
  prefix = "",
  color = "inherit",
  delay = 0,
}: {
  value: number;
  prefix?: string;
  color?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  const shouldReduceMotion = useReducedMotion();

  const springValue = useSpring(0, {
    stiffness: 50,
    damping: 20,
  });

  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (isInView) {
      const timer = setTimeout(() => {
        if (shouldReduceMotion) {
          setDisplay(value.toLocaleString());
        } else {
          springValue.set(value);
        }
      }, delay * 1000);
      return () => clearTimeout(timer);
    }
  }, [isInView, value, delay, springValue, shouldReduceMotion]);

  useEffect(() => {
    if (!shouldReduceMotion) {
      return springValue.on("change", (v) =>
        setDisplay(Math.floor(v).toLocaleString())
      );
    }
  }, [springValue, shouldReduceMotion]);

  return (
    <div
      ref={ref}
      className="text-lg font-bold font-mono tabular-nums"
      style={{ color }}
    >
      {prefix}£{display}
    </div>
  );
}

// ============================================================================
// ANIMATED PROGRESS BAR
// ============================================================================
function AnimatedProgressBar({
  targetWidth,
  color,
  delay = 0,
}: {
  targetWidth: string;
  color: string;
  delay?: number;
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ width: 0, opacity: 0.5 }}
      animate={{
        width: targetWidth,
        opacity: 1,
      }}
      transition={{
        width: {
          duration: shouldReduceMotion ? 0.01 : 0.9,
          ease: EASING.smooth,
          delay: shouldReduceMotion ? 0 : delay,
        },
        opacity: {
          duration: 0.3,
          delay: shouldReduceMotion ? 0 : delay,
        }
      }}
      className="h-full"
      style={{ backgroundColor: color }}
    />
  );
}

// ============================================================================
// FLOATING CARD WRAPPER - Subtle breathing animation
// ============================================================================
function FloatingCard({ children }: { children: React.ReactNode }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      animate={shouldReduceMotion ? {} : {
        y: [0, -8, 0],
      }}
      transition={{
        duration: 5,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      whileHover={{
        y: -12,
        transition: { duration: 0.3, ease: EASING.snappy }
      }}
      className="relative"
    >
      {children}
    </motion.div>
  );
}

// ============================================================================
// LIVE PROGRESS BAR - Grows/shrinks to mimic live data
// ============================================================================
function LiveProgressBar({
  color,
  baseWidth,
  variance,
  duration,
  delay,
}: {
  color: string;
  baseWidth: number;
  variance: number;
  duration: number;
  delay: number;
}) {
  const shouldReduceMotion = useReducedMotion();
  const [currentPercent, setCurrentPercent] = useState(baseWidth);

  // Animate the percentage display to follow the bar
  useEffect(() => {
    if (shouldReduceMotion) {
      setCurrentPercent(baseWidth);
      return;
    }

    const startDelay = delay * 1000;
    let startTime: number;
    let animationId: number;

    const timeout = setTimeout(() => {
      startTime = Date.now();

      const tick = () => {
        const elapsed = Date.now() - startTime;
        const progress = (elapsed % (duration * 1000)) / (duration * 1000);

        // Sine wave oscillation
        const oscillation = Math.sin(progress * Math.PI * 2);
        const newPercent = baseWidth + (oscillation * variance);
        setCurrentPercent(Math.round(newPercent));

        animationId = requestAnimationFrame(tick);
      };

      animationId = requestAnimationFrame(tick);
    }, startDelay);

    return () => {
      clearTimeout(timeout);
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [baseWidth, variance, duration, delay, shouldReduceMotion]);

  // Generate keyframes for width animation
  const widthKeyframes = [
    `${baseWidth}%`,
    `${baseWidth + variance}%`,
    `${baseWidth}%`,
    `${baseWidth - variance}%`,
    `${baseWidth}%`,
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: EASING.smooth }}
      className="flex items-center gap-4 group cursor-pointer"
    >
      {/* Indicator dot */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{
          scale: 1.5,
          boxShadow: `0 0 8px ${color}`,
        }}
        transition={{
          delay,
          type: "spring",
          stiffness: 400,
        }}
        className="w-2 h-2"
        style={{ backgroundColor: color }}
      />

      {/* Progress bar container */}
      <div className="flex-1 h-2 bg-[#e5e5e5] overflow-hidden rounded-sm">
        <motion.div
          initial={{ width: 0 }}
          animate={{
            width: widthKeyframes,
          }}
          transition={{
            times: [0, 0.25, 0.5, 0.75, 1],
            duration: duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: delay,
          }}
          className="h-full"
          style={{ backgroundColor: color }}
        />
      </div>

      {/* Animated percentage label */}
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay + 0.3, duration: 0.3 }}
        className="text-sm font-mono tabular-nums w-12 text-right"
      >
        {currentPercent}%
      </motion.span>
    </motion.div>
  );
}

// Typewriter component for animated numbers
function TypewriterNumber({ value, suffix = "" }: { value: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const [displayValue, setDisplayValue] = useState("");

  useEffect(() => {
    if (isInView) {
      let i = 0;
      const interval = setInterval(() => {
        if (i <= value.length) {
          setDisplayValue(value.slice(0, i));
          i++;
        } else {
          clearInterval(interval);
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isInView, value]);

  return (
    <span ref={ref} className="font-[family-name:var(--font-mono)]">
      {displayValue}
      {displayValue.length === value.length && suffix}
      <span className="animate-pulse">|</span>
    </span>
  );
}

// Icon mapping
const iconMap: Record<string, React.ElementType> = {
  Wallet,
  Gift,
  FileText,
  Users,
};

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[#fafaf9] font-sans">
      {/* Grid background pattern */}
      <div className="fixed inset-0 pointer-events-none">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="ledger-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,0,0,0.03)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#ledger-grid)" />
        </svg>
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#fafaf9]/95 backdrop-blur-sm border-b border-black">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3">
              <div className="w-8 h-8 border-2 border-black flex items-center justify-center">
                <Calculator className="w-4 h-4 text-black" />
              </div>
              <span className="font-bold text-xl text-black tracking-tight">
                ChurchCoin
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-black hover:text-[#6b8e6b] transition-colors uppercase text-sm tracking-wider font-medium">
                Features
              </a>
              <a href="#pricing" className="text-black hover:text-[#6b8e6b] transition-colors uppercase text-sm tracking-wider font-medium">
                Pricing
              </a>
              <a href="#testimonials" className="text-black hover:text-[#6b8e6b] transition-colors uppercase text-sm tracking-wider font-medium">
                Testimonials
              </a>
              <a href="#faq" className="text-black hover:text-[#6b8e6b] transition-colors uppercase text-sm tracking-wider font-medium">
                FAQ
              </a>
            </div>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center gap-4">
              <Link
                href="/login"
                className="text-black hover:text-[#6b8e6b] transition-colors font-medium"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="bg-black text-white px-5 py-2.5 font-medium hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_#d4a574] transition-all"
              >
                Get Started
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 border border-black"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 text-black" />
              ) : (
                <Menu className="w-5 h-5 text-black" />
              )}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden pt-4 pb-6 space-y-4 border-t border-black mt-4"
            >
              <a href="#features" className="block text-black py-2 uppercase text-sm tracking-wider">
                Features
              </a>
              <a href="#pricing" className="block text-black py-2 uppercase text-sm tracking-wider">
                Pricing
              </a>
              <a href="#testimonials" className="block text-black py-2 uppercase text-sm tracking-wider">
                Testimonials
              </a>
              <a href="#faq" className="block text-black py-2 uppercase text-sm tracking-wider">
                FAQ
              </a>
              <div className="pt-4 space-y-3">
                <Link
                  href="/login"
                  className="block text-center text-black py-3 border border-black"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="block text-center bg-black text-white py-3 font-medium"
                >
                  Get Started
                </Link>
              </div>
            </motion.div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 min-h-[90vh] flex items-center overflow-hidden">
        {/* Decorative shapes with breathing animation */}
        <motion.div
          custom={0.2}
          initial="hidden"
          animate={["visible", "breathing"]}
          variants={decorativeShapeVariants}
          className="absolute top-40 right-20 w-32 h-32 rounded-full bg-[#e8f0e8]"
          style={{ willChange: "transform, opacity" }}
        />
        <motion.div
          custom={0.4}
          initial="hidden"
          animate={["visible", "breathing"]}
          variants={{
            ...decorativeShapeVariants,
            breathing: {
              scale: [1, 1.06, 1],
              opacity: [0.5, 0.65, 0.5],
              rotate: [0, 3, 0],
              transition: {
                duration: 7,
                repeat: Infinity,
                ease: "easeInOut",
              }
            }
          }}
          className="absolute bottom-40 left-10 w-20 h-20 bg-[#faefe6]"
          style={{ willChange: "transform, opacity" }}
        />
        {/* Additional subtle decorative element */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{
            opacity: [0.2, 0.35, 0.2],
            scale: [1, 1.1, 1],
          }}
          transition={{
            delay: 0.8,
            duration: 9,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-1/2 right-1/4 w-16 h-16 rounded-full border border-[#6b8e6b]/30"
        />

        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            {/* Text content - 7 columns */}
            <div className="lg:col-span-7">
              {/* Eyebrow with clip-path reveal */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={eyebrowVariants}
                className="mb-6"
              >
                <span className="inline-flex items-center gap-2 border border-black px-3 py-1 text-xs uppercase tracking-widest font-medium">
                  <motion.span
                    initial="hidden"
                    animate={["visible", "pulse"]}
                    variants={indicatorPulseVariants}
                    className="w-2 h-2 bg-[#6b8e6b]"
                  />
                  {landingContent.hero.eyebrow}
                </span>
              </motion.div>

              {/* Headline with staggered word reveal */}
              <motion.h1
                initial="hidden"
                animate="visible"
                variants={headlineContainerVariants}
                className="text-5xl md:text-6xl lg:text-7xl font-bold text-black leading-[1.05] mb-6 tracking-tight"
                style={{ perspective: "1000px" }}
              >
                {landingContent.hero.headline.split(" ").map((word, i) => (
                  <motion.span
                    key={i}
                    variants={wordVariants}
                    className="inline-block mr-[0.25em]"
                    style={{ transformOrigin: "center bottom" }}
                  >
                    {word}
                  </motion.span>
                ))}
                <motion.span
                  variants={{
                    hidden: {
                      opacity: 0,
                      y: 50,
                      filter: "blur(10px)",
                      scale: 0.9,
                    },
                    visible: {
                      opacity: 1,
                      y: 0,
                      filter: "blur(0px)",
                      scale: 1,
                      transition: {
                        duration: 0.7,
                        ease: EASING.smooth,
                      }
                    }
                  }}
                  className="inline-block text-[#6b8e6b]"
                >
                  {landingContent.hero.highlightedWord}
                </motion.span>
              </motion.h1>

              {/* Subheadline */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: TIMING.subheadline, duration: 0.6, ease: EASING.smooth }}
                className="text-xl text-[#1a1a1a] mb-8 leading-relaxed max-w-xl"
              >
                {landingContent.hero.subheadline}
              </motion.p>

              {/* CTAs with stagger and spring hover */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={ctaContainerVariants}
                className="flex flex-wrap gap-4 mb-8"
              >
                <motion.div variants={ctaVariants}>
                  <motion.div
                    whileHover={{
                      x: -3,
                      y: -3,
                      boxShadow: "6px 6px 0px #d4a574",
                    }}
                    whileTap={{
                      x: 0,
                      y: 0,
                      boxShadow: "0px 0px 0px #d4a574",
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  >
                    <Link
                      href="/register"
                      className="group bg-black text-white px-8 py-4 font-medium text-lg flex items-center gap-2"
                    >
                      {landingContent.hero.primaryCta}
                      <motion.span
                        initial={{ x: 0 }}
                        whileHover={{ x: 4 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      >
                        <ArrowRight className="w-5 h-5" />
                      </motion.span>
                    </Link>
                  </motion.div>
                </motion.div>
                <motion.div variants={ctaVariants}>
                  <motion.div
                    whileHover={{ backgroundColor: "#f0f0ed" }}
                    transition={{ duration: 0.2 }}
                  >
                    <Link
                      href="/demo"
                      className="border-2 border-black text-black px-8 py-4 font-medium text-lg block"
                    >
                      {landingContent.hero.secondaryCta}
                    </Link>
                  </motion.div>
                </motion.div>
              </motion.div>

              {/* Trust Badge */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: TIMING.trustBadge, duration: 0.5 }}
                className="text-sm text-[#666666] font-mono"
              >
                {landingContent.hero.trustBadge}
              </motion.p>
            </div>

            {/* Visual - 5 columns with 3D card entrance */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={cardVariants}
              className="lg:col-span-5 relative"
              style={{ perspective: "1200px", transformStyle: "preserve-3d" }}
            >
              <FloatingCard>
                {/* Balance Card */}
                <div className="relative aspect-square">
                  <motion.div
                    className="absolute inset-0 border-2 border-black p-8 bg-[#fafaf9]"
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  >
                    <div className="h-full flex flex-col justify-between">
                      {/* Header with balance */}
                      <div className="flex justify-between items-start">
                        <div>
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: TIMING.balance - 0.1, duration: 0.4 }}
                            className="text-xs uppercase tracking-widest text-[#666666] mb-1"
                          >
                            Total Balance
                          </motion.div>
                          <AnimatedBalance value={127450} delay={TIMING.balance} />
                        </div>
                        {/* Live indicator with pulse */}
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{
                            delay: TIMING.indicator,
                            type: "spring",
                            stiffness: 400,
                            damping: 15,
                          }}
                          className="relative"
                        >
                          <motion.div
                            animate={{
                              boxShadow: [
                                "0 0 0 0 rgba(107, 142, 107, 0.5)",
                                "0 0 0 10px rgba(107, 142, 107, 0)",
                              ],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "easeOut",
                              delay: TIMING.indicator + 0.5,
                            }}
                            className="w-8 h-8 bg-[#6b8e6b]"
                          />
                        </motion.div>
                      </div>

                      {/* Progress bars with live data animation */}
                      <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={progressBarContainerVariants}
                        className="space-y-4"
                      >
                        {[
                          { color: "#000000", baseWidth: 75, variance: 8, duration: 3 },
                          { color: "#6b8e6b", baseWidth: 50, variance: 12, duration: 4 },
                          { color: "#d4a574", baseWidth: 25, variance: 10, duration: 3.5 },
                        ].map((bar, index) => (
                          <LiveProgressBar
                            key={index}
                            color={bar.color}
                            baseWidth={bar.baseWidth}
                            variance={bar.variance}
                            duration={bar.duration}
                            delay={TIMING.progressBars + index * 0.18}
                          />
                        ))}
                      </motion.div>

                      {/* Bottom stats with staggered reveal and counting */}
                      <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={statsContainerVariants}
                        className="grid grid-cols-3 gap-4 pt-4 border-t border-[#e5e5e5]"
                      >
                        <motion.div variants={statItemVariants}>
                          <div className="text-xs uppercase tracking-widest text-[#666666]">Income</div>
                          <AnimatedStatValue value={8240} prefix="+" color="#6b8e6b" delay={TIMING.stats} />
                        </motion.div>
                        <motion.div variants={statItemVariants}>
                          <div className="text-xs uppercase tracking-widest text-[#666666]">Expenses</div>
                          <AnimatedStatValue value={3120} prefix="-" color="#000000" delay={TIMING.stats + 0.15} />
                        </motion.div>
                        <motion.div variants={statItemVariants}>
                          <div className="text-xs uppercase tracking-widest text-[#666666]">Gift Aid</div>
                          <AnimatedStatValue value={1240} prefix="" color="#d4a574" delay={TIMING.stats + 0.3} />
                        </motion.div>
                      </motion.div>
                    </div>
                  </motion.div>

                  {/* Animated hard shadow */}
                  <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={shadowVariants}
                    className="absolute inset-0 border-2 border-black -z-10 bg-[#fafaf9]"
                  />
                </div>
              </FloatingCard>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Trust Metrics */}
      <section className="py-16 bg-black">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {landingContent.trustMetrics.map((metric, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-white mb-2 font-mono">
                  <TypewriterNumber value={metric.value} />
                </div>
                <div className="text-[#999999] text-sm uppercase tracking-widest">{metric.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <div className="text-xs uppercase tracking-widest text-[#666666] mb-4">Testimonials</div>
            <h2 className="text-4xl md:text-5xl font-bold text-black tracking-tight mb-4">
              Trusted by churches<br />across the UK
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {landingContent.testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white p-8 border-2 border-black relative hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[8px_8px_0px_rgba(0,0,0,0.1)] transition-all"
              >
                {/* Quote */}
                <p className="text-[#1a1a1a] mb-6 leading-relaxed">&ldquo;{testimonial.quote}&rdquo;</p>

                {/* Result badge */}
                <div className="inline-block border border-[#6b8e6b] text-[#6b8e6b] px-3 py-1 text-xs uppercase tracking-widest font-medium font-mono mb-4">
                  {testimonial.result}
                </div>

                {/* Author */}
                <div className="border-t border-[#e5e5e5] pt-4">
                  <div className="font-bold text-black">{testimonial.author}</div>
                  <div className="text-sm text-[#666666]">
                    {testimonial.role}, {testimonial.church}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-24 bg-[#fafaf9]">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <div className="text-xs uppercase tracking-widest text-[#666666] mb-4">The Problem</div>
            <h2 className="text-4xl md:text-5xl font-bold text-black tracking-tight mb-4">
              Still wrestling with<br />spreadsheets?
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {landingContent.problems.map((problem, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="border-l-4 border-black pl-6"
              >
                <div className="text-5xl md:text-6xl font-bold text-[#cc3333] mb-4 font-mono">
                  {problem.stat}
                </div>
                <div className="text-xl font-bold text-black mb-2">
                  {problem.description}
                </div>
                <div className="text-[#666666]">{problem.impact}</div>
              </motion.div>
            ))}
          </div>

          {/* Transition */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-16 border-t-2 border-black pt-8"
          >
            <p className="text-2xl font-bold text-black">
              There&apos;s a better way.{" "}
              <span className="text-[#6b8e6b]">We built it.</span>
            </p>
          </motion.div>
        </div>
      </section>

      {/* Transformation Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <div className="text-xs uppercase tracking-widest text-[#666666] mb-4">The Journey</div>
            <h2 className="text-4xl md:text-5xl font-bold text-black tracking-tight mb-4">
              Your path to<br />financial clarity
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-6">
            {landingContent.transformation.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                {/* Step number */}
                <div className="absolute -top-4 -left-4 w-8 h-8 bg-black text-white flex items-center justify-center text-sm font-bold font-mono">
                  {String(index + 1).padStart(2, "0")}
                </div>

                <div className="border border-black p-6 pt-8 h-full hover:bg-[#f0f0ed] transition-colors">
                  <div className="text-xs uppercase tracking-widest text-[#d4a574] font-bold mb-2 font-mono">
                    {step.timeframe}
                  </div>
                  <h3 className="text-lg font-bold text-black mb-2">
                    {step.title}
                  </h3>
                  <p className="text-[#666666] text-sm">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-[#fafaf9]">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <div className="text-xs uppercase tracking-widest text-[#666666] mb-4">Features</div>
            <h2 className="text-4xl md:text-5xl font-bold text-black tracking-tight mb-4">
              Everything your<br />church needs
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {landingContent.features.map((feature, index) => {
              const Icon = iconMap[feature.icon] || Wallet;
              return (
                <motion.div
                  key={feature.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white p-6 border-2 border-black hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[8px_8px_0px_rgba(0,0,0,0.1)] transition-all group"
                >
                  {/* Icon */}
                  <div className="w-10 h-10 border-2 border-black flex items-center justify-center mb-6 group-hover:bg-[#e8f0e8] transition-colors">
                    <Icon className="w-5 h-5 text-black" strokeWidth={1.5} />
                  </div>

                  <h3 className="text-xl font-bold text-black mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-[#666666] mb-6 text-sm">{feature.description}</p>

                  {/* Benefits */}
                  <ul className="space-y-2">
                    {feature.benefits.map((benefit, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-[#1a1a1a]">
                        <Check className="w-4 h-4 text-[#6b8e6b] flex-shrink-0" strokeWidth={2} />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <div className="text-xs uppercase tracking-widest text-[#666666] mb-4">Pricing</div>
            <h2 className="text-4xl md:text-5xl font-bold text-black tracking-tight mb-4">
              Simple, transparent<br />pricing
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl">
            {landingContent.pricing.map((tier, index) => (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={`relative p-8 border-2 ${
                  tier.highlighted
                    ? "border-black bg-[#fafaf9] shadow-[8px_8px_0px_#d4a574]"
                    : "border-black bg-white"
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-4 left-6 bg-black text-white px-3 py-1 text-xs uppercase tracking-widest font-bold">
                    Most Popular
                  </div>
                )}

                <h3 className="text-2xl font-bold text-black mb-2">
                  {tier.name}
                </h3>
                <p className="text-[#666666] mb-4 text-sm">{tier.description}</p>

                <div className="mb-6">
                  <span className="text-5xl font-bold text-black font-mono">
                    £{tier.price}
                  </span>
                  <span className="text-[#666666]">/{tier.period}</span>
                </div>

                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-[#1a1a1a] text-sm">
                      <Check className="w-4 h-4 text-[#6b8e6b] flex-shrink-0" strokeWidth={2} />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/register"
                  className={`block text-center py-3 font-medium transition-all ${
                    tier.highlighted
                      ? "bg-black text-white hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_#d4a574]"
                      : "border-2 border-black text-black hover:bg-[#f0f0ed]"
                  }`}
                >
                  {tier.cta}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 bg-[#fafaf9]">
        <div className="max-w-3xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <div className="text-xs uppercase tracking-widest text-[#666666] mb-4">FAQ</div>
            <h2 className="text-4xl md:text-5xl font-bold text-black tracking-tight">
              Frequently asked<br />questions
            </h2>
          </motion.div>

          <div className="space-y-4">
            {landingContent.faq.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="bg-white border-2 border-black"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full flex items-center justify-between p-6 text-left"
                >
                  <span className="font-bold text-black pr-4">{item.question}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-black flex-shrink-0 transition-transform ${
                      openFaq === index ? "rotate-180" : ""
                    }`}
                    strokeWidth={2}
                  />
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-6 text-[#666666] border-t border-[#e5e5e5] pt-4">
                    {item.answer}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Secondary CTA */}
      <section className="py-24 bg-black">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
              Ready to give your treasurer their weekends back?
            </h2>
            <p className="text-xl text-[#999999] mb-8 max-w-2xl mx-auto">
              Join 500+ UK churches who&apos;ve already made the switch.
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/register"
                className="group bg-white text-black px-8 py-4 font-medium text-lg hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#d4a574] transition-all flex items-center gap-2"
              >
                Start Free 30-Day Trial
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/demo"
                className="border-2 border-white text-white px-8 py-4 font-medium text-lg hover:bg-white/10 transition-colors"
              >
                Book a Demo
              </Link>
            </div>

            <p className="text-sm text-[#666666] mt-6 font-mono">
              No credit card required • 10-minute setup • Cancel anytime
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0a0a0a] py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-5 gap-12 mb-12">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 border-2 border-white flex items-center justify-center">
                  <Calculator className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-xl text-white tracking-tight">
                  ChurchCoin
                </span>
              </div>
              <p className="text-[#666666] mb-4 text-sm">
                AI-powered financial management built specifically for UK churches.
              </p>
              <div className="flex gap-2 flex-wrap">
                <span className="text-xs border border-[#333333] text-[#666666] px-2 py-1 font-mono">
                  ICO REG
                </span>
                <span className="text-xs border border-[#333333] text-[#666666] px-2 py-1 font-mono">
                  GDPR
                </span>
                <span className="text-xs border border-[#333333] text-[#666666] px-2 py-1 font-mono">
                  UK DATA
                </span>
              </div>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-bold text-white mb-4 uppercase text-xs tracking-widest">Product</h4>
              <ul className="space-y-2 text-[#666666] text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><Link href="/demo" className="hover:text-white transition-colors">Demo</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white mb-4 uppercase text-xs tracking-widest">Resources</h4>
              <ul className="space-y-2 text-[#666666] text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Help Centre</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Guides</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white mb-4 uppercase text-xs tracking-widest">Company</h4>
              <ul className="space-y-2 text-[#666666] text-sm">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-[#1a1a1a] pt-8 text-center text-[#666666] text-sm font-mono">
            © {new Date().getFullYear()} ChurchCoin. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
