// Landing page shared types

export interface Testimonial {
  id: string;
  quote: string;
  author: string;
  role: string;
  church: string;
  result: string;
  avatar?: string;
}

export interface Feature {
  id: string;
  title: string;
  description: string;
  icon: string;
  benefits: string[];
}

export interface PricingTier {
  id: string;
  name: string;
  price: number;
  period: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  cta: string;
}

export interface TrustMetric {
  value: string;
  label: string;
  icon?: string;
}

export interface TransformationStep {
  timeframe: string;
  title: string;
  description: string;
}

export interface ProblemPoint {
  stat: string;
  description: string;
  impact: string;
}

export interface HeroContent {
  eyebrow: string;
  headline: string;
  highlightedWord: string;
  subheadline: string;
  primaryCta: string;
  secondaryCta: string;
  trustBadge: string;
}

export interface LandingContent {
  hero: HeroContent;
  testimonials: Testimonial[];
  features: Feature[];
  problems: ProblemPoint[];
  transformation: TransformationStep[];
  trustMetrics: TrustMetric[];
  pricing: PricingTier[];
  faq: { question: string; answer: string }[];
}
