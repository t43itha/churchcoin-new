import type { LandingContent } from "./types";

export const landingContent: LandingContent = {
  hero: {
    eyebrow: "Built by treasurers",
    headline: "Stop chasing spreadsheets. Start growing",
    highlightedWord: "ministry.",
    subheadline:
      "The AI-powered finance platform that saves church treasurers 15 hours monthly. Join 500+ UK churches who've already made the switch.",
    primaryCta: "Start Free 30-Day Trial",
    secondaryCta: "Book a Demo",
    trustBadge: "No credit card required • 10-minute setup • Cancel anytime",
  },

  testimonials: [
    {
      id: "1",
      quote:
        "I used to dread month-end. Now it takes me 20 minutes instead of an entire Saturday. ChurchCoin has genuinely given me my weekends back.",
      author: "Sarah Thompson",
      role: "Treasurer",
      church: "St. Michael's Parish, Bristol",
      result: "Saved 12 hours monthly",
    },
    {
      id: "2",
      quote:
        "We recovered £3,200 in Gift Aid that we'd been missing for years. The automated claims alone paid for the subscription 10x over.",
      author: "David Chen",
      role: "Church Administrator",
      church: "Grace Community Church, Manchester",
      result: "£3,200 Gift Aid recovered",
    },
    {
      id: "3",
      quote:
        "Our trustees finally have the clarity they need. The reports are professional, compliant, and I don't have to build them from scratch anymore.",
      author: "Margaret Williams",
      role: "Finance Lead",
      church: "Hope Baptist Church, Leeds",
      result: "100% Charity Commission compliant",
    },
  ],

  features: [
    {
      id: "funds",
      title: "Fund Management",
      description:
        "Automatically separate general, restricted, and designated funds. See real-time balances and never worry about compliance again.",
      icon: "Wallet",
      benefits: [
        "Auto-fund separation",
        "Real-time balance tracking",
        "Visual fund dashboards",
        "Restriction compliance alerts",
      ],
    },
    {
      id: "giftaid",
      title: "Gift Aid Automation",
      description:
        "Digital donor declarations, automatic eligibility checking, and 2-click HMRC submissions. Recover every penny you're owed.",
      icon: "Gift",
      benefits: [
        "Digital declarations",
        "2-click HMRC claims",
        "Auto-validation",
        "Recovery tracking",
      ],
    },
    {
      id: "reporting",
      title: "Smart Reporting",
      description:
        "AI-generated reports that your trustees will actually understand. Annual accounts in hours, not weeks.",
      icon: "FileText",
      benefits: [
        "One-click trustee reports",
        "Annual accounts generator",
        "Budget variance analysis",
        "Trend insights",
      ],
    },
    {
      id: "donors",
      title: "Donor Insights",
      description:
        "Understand your giving patterns without the complexity. See who's engaged, who's lapsed, and predict seasonal trends.",
      icon: "Users",
      benefits: [
        "Giving history tracking",
        "Seasonal predictions",
        "Retention metrics",
        "GDPR compliant",
      ],
    },
  ],

  problems: [
    {
      stat: "15+ hours",
      description: "Lost to manual data entry every month",
      impact:
        "Time that could be spent on pastoral care, not spreadsheet wrestling.",
    },
    {
      stat: "£2,500",
      description: "Average unclaimed Gift Aid annually",
      impact:
        "Money that belongs to your ministry, sitting with HMRC instead.",
    },
    {
      stat: "73%",
      description: "Of church treasurers worry about compliance",
      impact:
        "Sleepless nights over Charity Commission requirements that feel like a maze.",
    },
  ],

  transformation: [
    {
      timeframe: "Day 1",
      title: "See all your funds on one dashboard",
      description:
        "Import your existing data in 10 minutes. Finally see your complete financial picture.",
    },
    {
      timeframe: "Week 2",
      title: "Submit your first automated Gift Aid claim",
      description:
        "Watch ChurchCoin validate declarations and prepare your HMRC submission.",
    },
    {
      timeframe: "Month 3",
      title: "Trustees receive their first automated report",
      description:
        "Professional, compliant reports generated with one click. No more late-night spreadsheet panic.",
    },
    {
      timeframe: "Year 1",
      title: "Focus on ministry, not administration",
      description:
        "180 hours saved. Thousands in Gift Aid recovered. Zero compliance worries.",
    },
  ],

  trustMetrics: [
    {
      value: "500+",
      label: "UK churches trust ChurchCoin",
    },
    {
      value: "£2.3M",
      label: "Gift Aid recovered for our churches",
    },
    {
      value: "7,500",
      label: "Hours saved monthly across all users",
    },
    {
      value: "99.9%",
      label: "Uptime reliability",
    },
  ],

  pricing: [
    {
      id: "starter",
      name: "Starter",
      price: 29,
      period: "month",
      description: "Perfect for small churches just getting organised",
      features: [
        "Up to 50 donors",
        "3 funds",
        "Basic Gift Aid tracking",
        "Monthly reports",
        "Email support",
      ],
      cta: "Start Free Trial",
    },
    {
      id: "growing",
      name: "Growing",
      price: 59,
      period: "month",
      description: "For established churches ready to scale",
      features: [
        "Up to 200 donors",
        "Unlimited funds",
        "Full Gift Aid automation",
        "AI categorisation",
        "Trustee reports",
        "Priority support",
      ],
      highlighted: true,
      cta: "Start Free Trial",
    },
    {
      id: "thriving",
      name: "Thriving",
      price: 99,
      period: "month",
      description: "For multi-site churches and complex needs",
      features: [
        "Unlimited donors",
        "Multi-site support",
        "API access",
        "Custom integrations",
        "Dedicated support",
        "Training sessions",
      ],
      cta: "Contact Sales",
    },
  ],

  faq: [
    {
      question: "How long does it take to get started?",
      answer:
        "Most churches are up and running in under 10 minutes. We can import your existing data from spreadsheets or other accounting software, and our setup wizard guides you through every step.",
    },
    {
      question: "Is my data secure?",
      answer:
        "Absolutely. We use bank-level encryption, are fully GDPR compliant, and ICO registered. Your data is stored securely in UK data centres and never shared with third parties.",
    },
    {
      question: "Do you offer training?",
      answer:
        "Yes! Every plan includes access to our video tutorials and help centre. Growing and Thriving plans include live onboarding sessions, and we offer additional training packages for treasurers and administrators.",
    },
    {
      question: "Can I export my data if I need to leave?",
      answer:
        "Of course. Your data is yours. You can export everything to CSV or PDF at any time, and we'll help with the transition if you ever need to move to another system.",
    },
    {
      question: "What about bank integration?",
      answer:
        "We integrate with major UK banks through Open Banking. This means automatic transaction imports, real-time reconciliation, and no more manual data entry from bank statements.",
    },
  ],
};

export default landingContent;
