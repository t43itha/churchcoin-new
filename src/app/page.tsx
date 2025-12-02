"use client";

import { motion, useInView } from "framer-motion";
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
      <section className="relative pt-32 pb-24 min-h-[90vh] flex items-center">
        {/* Decorative shapes */}
        <div className="absolute top-40 right-20 w-32 h-32 rounded-full bg-[#e8f0e8] opacity-60" />
        <div className="absolute bottom-40 left-10 w-20 h-20 bg-[#faefe6] opacity-60" />

        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            {/* Text content - 7 columns */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-7"
            >
              {/* Eyebrow */}
              <div className="mb-6">
                <span className="inline-flex items-center gap-2 border border-black px-3 py-1 text-xs uppercase tracking-widest font-medium">
                  <span className="w-2 h-2 bg-[#6b8e6b]" />
                  {landingContent.hero.eyebrow}
                </span>
              </div>

              {/* Headline */}
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-black leading-[1.05] mb-6 tracking-tight">
                {landingContent.hero.headline}{" "}
                <span className="text-[#6b8e6b]">
                  {landingContent.hero.highlightedWord}
                </span>
              </h1>

              {/* Subheadline */}
              <p className="text-xl text-[#1a1a1a] mb-8 leading-relaxed max-w-xl">
                {landingContent.hero.subheadline}
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap gap-4 mb-8">
                <Link
                  href="/register"
                  className="group bg-black text-white px-8 py-4 font-medium text-lg hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#d4a574] transition-all flex items-center gap-2"
                >
                  {landingContent.hero.primaryCta}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/demo"
                  className="border-2 border-black text-black px-8 py-4 font-medium text-lg hover:bg-[#f0f0ed] transition-colors"
                >
                  {landingContent.hero.secondaryCta}
                </Link>
              </div>

              {/* Trust Badge */}
              <p className="text-sm text-[#666666] font-mono">
                {landingContent.hero.trustBadge}
              </p>
            </motion.div>

            {/* Visual - 5 columns */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-5 relative"
            >
              {/* Abstract data visualization placeholder */}
              <div className="relative aspect-square">
                <div className="absolute inset-0 border-2 border-black p-8">
                  <div className="h-full flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-xs uppercase tracking-widest text-[#666666] mb-1">Total Balance</div>
                        <div className="text-4xl font-bold font-mono">£127,450</div>
                      </div>
                      <div className="w-8 h-8 bg-[#6b8e6b]" />
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-2 h-2 bg-black" />
                        <div className="flex-1 h-2 bg-[#e5e5e5]">
                          <div className="h-full bg-black w-3/4" />
                        </div>
                        <span className="text-sm font-mono">75%</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-2 h-2 bg-[#6b8e6b]" />
                        <div className="flex-1 h-2 bg-[#e5e5e5]">
                          <div className="h-full bg-[#6b8e6b] w-1/2" />
                        </div>
                        <span className="text-sm font-mono">50%</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-2 h-2 bg-[#d4a574]" />
                        <div className="flex-1 h-2 bg-[#e5e5e5]">
                          <div className="h-full bg-[#d4a574] w-1/4" />
                        </div>
                        <span className="text-sm font-mono">25%</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[#e5e5e5]">
                      <div>
                        <div className="text-xs uppercase tracking-widest text-[#666666]">Income</div>
                        <div className="text-lg font-bold text-[#6b8e6b] font-mono">+£8,240</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-widest text-[#666666]">Expenses</div>
                        <div className="text-lg font-bold font-mono">-£3,120</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-widest text-[#666666]">Gift Aid</div>
                        <div className="text-lg font-bold text-[#d4a574] font-mono">£1,240</div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Hard shadow */}
                <div className="absolute inset-0 border-2 border-black translate-x-2 translate-y-2 -z-10 bg-[#fafaf9]" />
              </div>
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
