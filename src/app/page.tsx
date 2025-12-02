"use client";

import Link from "next/link";
import { InteractiveDemo } from "@/components/InteractiveDemo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Calculator,
  PoundSterling,
  Shield,
  Clock,
  CheckCircle,
  Star,
  ArrowRight,
  Menu,
  Users,
  FileText,
  Wallet,
  Check,
  FileCheck
} from "lucide-react";

const navigationLinks = [
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
  { href: "#testimonials", label: "Testimonials" },
  { href: "#faq", label: "FAQ" },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-paper font-sans selection:bg-ink selection:text-paper">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-paper/80 backdrop-blur-md border-b border-ledger/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex w-full items-center justify-between py-4">
            <div className="flex items-center gap-2">
              <Calculator className="h-6 w-6 text-ink" />
              <h1 className="text-xl font-bold text-ink tracking-tight">ChurchCoin</h1>
            </div>

            <nav className="hidden md:flex items-center gap-8">
              {navigationLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-grey-mid hover:text-ink transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-4">
              <Link href="/login" className="hidden md:block text-sm font-medium text-ink hover:text-grey-dark">
                Sign In
              </Link>
              <Button asChild className="hidden md:inline-flex bg-ink text-paper hover:bg-ink/90 rounded-full px-6">
                <Link href="/register">Get Started</Link>
              </Button>

              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full sm:w-[300px] bg-paper border-l border-ledger">
                  <SheetHeader className="text-left border-b border-ledger pb-4 mb-4">
                    <SheetTitle className="text-ink font-bold flex items-center gap-2">
                      <Calculator className="h-5 w-5" />
                      ChurchCoin
                    </SheetTitle>
                  </SheetHeader>
                  <nav className="flex flex-col gap-4">
                    {navigationLinks.map((link) => (
                      <SheetClose asChild key={link.href}>
                        <Link href={link.href} className="text-lg font-medium text-grey-mid hover:text-ink">
                          {link.label}
                        </Link>
                      </SheetClose>
                    ))}
                    <div className="h-px bg-ledger my-2" />
                    <SheetClose asChild>
                      <Link href="/login" className="text-lg font-medium text-grey-mid hover:text-ink">
                        Sign In
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button asChild className="w-full bg-ink text-paper hover:bg-ink/90">
                        <Link href="/register">Get Started</Link>
                      </Button>
                    </SheetClose>
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="pt-32 pb-16 md:pt-40 md:pb-24 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-ink tracking-tight mb-6 md:mb-8 leading-[1.1]">
              Church finances simplified.
              <br />
              <span className="text-grey-mid">Ministry Amplified.</span>
            </h1>
            <p className="text-xl md:text-2xl text-grey-mid mb-10 max-w-2xl mx-auto leading-relaxed">
              Transform your church&apos;s financial management in 10 minutes. Join 500+ UK churches who save 15 hours monthly.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Button asChild size="lg" className="w-full sm:w-auto bg-ink text-paper hover:bg-ink/90 h-12 px-8 rounded-full text-lg font-medium">
                <Link href="/register">
                  Start Free 30-Day Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <p className="text-sm text-grey-mid font-medium">No credit card required</p>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-grey-mid bg-highlight/50 py-2 px-4 rounded-full inline-flex mx-auto">
              <CheckCircle className="h-4 w-4 text-success" />
              <span>Trusted by churches from 10 to 200+ members across the UK</span>
            </div>
          </div>
        </section>

        {/* Interactive Demo Section */}
        <section className="py-16 md:py-24 bg-paper border-y border-ledger/30">
          <InteractiveDemo />
        </section>

        {/* Problem/Solution Section */}
        <section className="py-16 md:py-24 bg-highlight/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-12 md:gap-24 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-ink mb-6">
                  The Reality:
                  <br />
                  <span className="text-grey-mid">Manual chaos & lost funds</span>
                </h2>
                <p className="text-lg text-grey-mid mb-8">
                  Your church treasurer shouldn&apos;t spend weekends wrestling with spreadsheets.
                </p>
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="bg-error/10 p-3 rounded-lg h-fit">
                      <Clock className="h-6 w-6 text-error" />
                    </div>
                    <div>
                      <h3 className="font-bold text-ink text-lg">15+ hours monthly</h3>
                      <p className="text-grey-mid">Lost to duplicate data entry, paper receipts, and Excel gymnastics.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="bg-error/10 p-3 rounded-lg h-fit">
                      <PoundSterling className="h-6 w-6 text-error" />
                    </div>
                    <div>
                      <h3 className="font-bold text-ink text-lg">£2,500 average unclaimed</h3>
                      <p className="text-grey-mid">Annually due to missing declarations and filing complexity.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="bg-error/10 p-3 rounded-lg h-fit">
                      <Shield className="h-6 w-6 text-error" />
                    </div>
                    <div>
                      <h3 className="font-bold text-ink text-lg">Compliance anxiety</h3>
                      <p className="text-grey-mid">73% of churches worry about meeting Charity Commission requirements.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-ink/5 to-transparent rounded-3xl transform rotate-3"></div>
                <div className="bg-paper border border-ledger rounded-3xl p-8 shadow-xl relative">
                  <h3 className="text-2xl font-bold text-ink mb-6">The Solution</h3>
                  <p className="text-xl text-grey-mid mb-8">
                    ChurchCoin transforms financial chaos into clarity in minutes, not months.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-highlight p-4 rounded-xl">
                      <p className="text-3xl font-bold font-mono text-ink mb-1">10m</p>
                      <p className="text-sm text-grey-mid">Setup time</p>
                    </div>
                    <div className="bg-highlight p-4 rounded-xl">
                      <p className="text-3xl font-bold font-mono text-ink mb-1">25%</p>
                      <p className="text-sm text-grey-mid">More Gift Aid</p>
                    </div>
                    <div className="bg-highlight p-4 rounded-xl">
                      <p className="text-3xl font-bold font-mono text-ink mb-1">100%</p>
                      <p className="text-sm text-grey-mid">Compliant</p>
                    </div>
                    <div className="bg-highlight p-4 rounded-xl">
                      <p className="text-3xl font-bold font-mono text-ink mb-1">0</p>
                      <p className="text-sm text-grey-mid">Spreadsheets</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-16 md:py-24 bg-paper">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">
                Built for churches, by people who understand ministry
              </h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <Card className="bg-paper border-ledger hover:border-ink transition-colors duration-300">
                <CardHeader>
                  <Wallet className="h-10 w-10 text-ink mb-2" />
                  <CardTitle className="text-xl font-bold text-ink">Fund Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-grey-mid mb-4">Track every penny, honor every intention.</p>
                  <ul className="space-y-2 text-sm text-grey-dark">
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5 text-success" />
                      <span>Auto-fund separation</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5 text-success" />
                      <span>Real-time balances</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5 text-success" />
                      <span>Visual dashboards</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-paper border-ledger hover:border-ink transition-colors duration-300">
                <CardHeader>
                  <FileCheck className="h-10 w-10 text-ink mb-2" />
                  <CardTitle className="text-xl font-bold text-ink">Gift Aid Automation</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-grey-mid mb-4">Reclaim what&apos;s rightfully yours.</p>
                  <ul className="space-y-2 text-sm text-grey-dark">
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5 text-success" />
                      <span>Digital declarations</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5 text-success" />
                      <span>2-click HMRC claims</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5 text-success" />
                      <span>Auto-validation</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-paper border-ledger hover:border-ink transition-colors duration-300">
                <CardHeader>
                  <FileText className="h-10 w-10 text-ink mb-2" />
                  <CardTitle className="text-xl font-bold text-ink">Smart Reporting</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-grey-mid mb-4">From confusion to confidence.</p>
                  <ul className="space-y-2 text-sm text-grey-dark">
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5 text-success" />
                      <span>Auto-generated reports</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5 text-success" />
                      <span>Annual accounts in hours</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5 text-success" />
                      <span>Trustee summaries</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-paper border-ledger hover:border-ink transition-colors duration-300">
                <CardHeader>
                  <Users className="h-10 w-10 text-ink mb-2" />
                  <CardTitle className="text-xl font-bold text-ink">Donor Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-grey-mid mb-4">Know your congregation&apos;s heart.</p>
                  <ul className="space-y-2 text-sm text-grey-dark">
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5 text-success" />
                      <span>Giving trends</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5 text-success" />
                      <span>Seasonal predictions</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5 text-success" />
                      <span>GDPR compliant</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Social Proof Section */}
        <section id="testimonials" className="py-16 md:py-24 bg-highlight/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-3 gap-8 mb-16">
              <div className="bg-paper p-8 rounded-2xl border border-ledger">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-ink text-ink" />
                  ))}
                </div>
                <p className="text-grey-dark mb-6 italic">
                  &quot;We&apos;ve reclaimed £4,200 more in Gift Aid this year alone. What took our treasurer entire weekends now takes 30 minutes.&quot;
                </p>
                <div>
                  <p className="font-bold text-ink">Rev. Sarah Mitchell</p>
                  <p className="text-sm text-grey-mid">St. Mary&apos;s, Birmingham (150 members)</p>
                </div>
              </div>
              <div className="bg-paper p-8 rounded-2xl border border-ledger">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-ink text-ink" />
                  ))}
                </div>
                <p className="text-grey-dark mb-6 italic">
                  &quot;ChurchCoin paid for itself in the first month. Our trustees finally understand our finances without me translating spreadsheets.&quot;
                </p>
                <div>
                  <p className="font-bold text-ink">James Chen, Treasurer</p>
                  <p className="text-sm text-grey-mid">Grace Community Church (75 members)</p>
                </div>
              </div>
              <div className="bg-paper p-8 rounded-2xl border border-ledger">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-ink text-ink" />
                  ))}
                </div>
                <p className="text-grey-dark mb-6 italic">
                  &quot;Switching from paper ledgers to ChurchCoin felt like jumping from 1985 to 2025. Absolutely transformative.&quot;
                </p>
                <div>
                  <p className="font-bold text-ink">Margaret Brown</p>
                  <p className="text-sm text-grey-mid">Hope Fellowship (200 members)</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center border-t border-ledger pt-12">
              <div>
                <p className="text-4xl font-bold font-mono text-ink mb-1">500+</p>
                <p className="text-grey-mid">Churches Onboarded</p>
              </div>
              <div>
                <p className="text-4xl font-bold font-mono text-ink mb-1">£2.3M</p>
                <p className="text-grey-mid">Gift Aid Recovered</p>
              </div>
              <div>
                <p className="text-4xl font-bold font-mono text-ink mb-1">7,500</p>
                <p className="text-grey-mid">Hours Saved Monthly</p>
              </div>
              <div>
                <p className="text-4xl font-bold font-mono text-ink mb-1">99.9%</p>
                <p className="text-grey-mid">Uptime Guaranteed</p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-16 md:py-24 bg-paper">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">
                Transparent pricing that scales with your ministry
              </h2>
              <p className="text-xl text-grey-mid">
                No setup fees. No hidden costs. Cancel anytime.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="border border-ledger rounded-2xl p-8 hover:shadow-lg transition-shadow">
                <h3 className="text-xl font-bold text-ink mb-2">Starter</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold font-mono text-ink">£29</span>
                  <span className="text-grey-mid">/month</span>
                </div>
                <p className="text-grey-mid mb-6 text-sm">Perfect for small churches and plants</p>
                <Button variant="outline" className="w-full mb-8" asChild>
                  <Link href="/register">Start Free Trial</Link>
                </Button>
                <ul className="space-y-3 text-sm text-grey-dark">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-ink" /> 50 donors
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-ink" /> 3 funds
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-ink" /> Gift Aid management
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-ink" /> Basic reporting
                  </li>
                </ul>
              </div>

              <div className="border-2 border-ink rounded-2xl p-8 relative shadow-xl scale-105 bg-paper">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-ink text-paper px-4 py-1 rounded-full text-sm font-bold">
                  Most Popular
                </div>
                <h3 className="text-xl font-bold text-ink mb-2">Growing</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold font-mono text-ink">£59</span>
                  <span className="text-grey-mid">/month</span>
                </div>
                <p className="text-grey-mid mb-6 text-sm">Perfect for established churches</p>
                <Button className="w-full mb-8 bg-ink text-paper hover:bg-ink/90" asChild>
                  <Link href="/register">Start Free Trial</Link>
                </Button>
                <ul className="space-y-3 text-sm text-grey-dark">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-ink" /> 200 donors
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-ink" /> Unlimited funds
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-ink" /> Advanced Gift Aid
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-ink" /> Full compliance
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-ink" /> Priority support
                  </li>
                </ul>
              </div>

              <div className="border border-ledger rounded-2xl p-8 hover:shadow-lg transition-shadow">
                <h3 className="text-xl font-bold text-ink mb-2">Thriving</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold font-mono text-ink">£99</span>
                  <span className="text-grey-mid">/month</span>
                </div>
                <p className="text-grey-mid mb-6 text-sm">Perfect for large churches</p>
                <Button variant="outline" className="w-full mb-8" asChild>
                  <Link href="/register">Start Free Trial</Link>
                </Button>
                <ul className="space-y-3 text-sm text-grey-dark">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-ink" /> Unlimited donors
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-ink" /> Multi-site support
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-ink" /> API access
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-ink" /> Dedicated onboarding
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-ink" /> Phone support
                  </li>
                </ul>
              </div>
            </div>

            <div className="text-center mt-12">
              <p className="text-ink font-bold mb-2">30-day money-back guarantee</p>
              <p className="text-grey-mid text-sm">Not convinced? Get a full refund, no questions asked.</p>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-16 md:py-24 bg-highlight/30">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-ink mb-12 text-center">
              Common Questions
            </h2>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1" className="border-ledger">
                <AccordionTrigger className="text-lg font-bold text-ink hover:no-underline">How quickly can we get started?</AccordionTrigger>
                <AccordionContent className="text-grey-mid text-base">
                  Import your data and go live in under 10 minutes. We&apos;ll migrate your existing spreadsheets for free.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2" className="border-ledger">
                <AccordionTrigger className="text-lg font-bold text-ink hover:no-underline">Is our data secure?</AccordionTrigger>
                <AccordionContent className="text-grey-mid text-base">
                  Bank-level encryption, UK-based servers, and full GDPR compliance. Your data never leaves the UK.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3" className="border-ledger">
                <AccordionTrigger className="text-lg font-bold text-ink hover:no-underline">What about training?</AccordionTrigger>
                <AccordionContent className="text-grey-mid text-base">
                  Free onboarding call, video tutorials, and UK-based support team available Mon-Sat.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-4" className="border-ledger">
                <AccordionTrigger className="text-lg font-bold text-ink hover:no-underline">Can we export our data?</AccordionTrigger>
                <AccordionContent className="text-grey-mid text-base">
                  Yes, anytime. Your data is always yours. Export to CSV, PDF, or direct to accounting software.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-5" className="border-ledger">
                <AccordionTrigger className="text-lg font-bold text-ink hover:no-underline">Do you integrate with banking?</AccordionTrigger>
                <AccordionContent className="text-grey-mid text-base">
                  Open Banking connections with all major UK banks. Transactions sync automatically.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-24 bg-ink text-paper">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Your congregation trusts you with their giving.
              <br />
              <span className="text-paper/70">Trust ChurchCoin with your finances.</span>
            </h2>
            <p className="text-xl text-paper/80 mb-10 max-w-2xl mx-auto">
              Join 500+ UK churches saving 15 hours monthly while maximizing every pound for ministry.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button asChild size="lg" className="bg-paper text-ink hover:bg-paper/90 h-14 px-8 rounded-full text-lg font-bold">
                <Link href="/register">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="bg-transparent border-paper text-paper hover:bg-paper/10 h-14 px-8 rounded-full text-lg font-bold">
                <Link href="/login">
                  Book a Demo
                </Link>
              </Button>
            </div>
            <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-paper/60">
              <span>✓ No credit card required</span>
              <span>✓ Setup in 10 minutes</span>
              <span>✓ Cancel anytime</span>
              <span>✓ UK-based support</span>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-paper border-t border-ledger py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <h3 className="font-bold text-ink mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-grey-mid">
                <li><Link href="#" className="hover:text-ink">Features</Link></li>
                <li><Link href="#" className="hover:text-ink">Pricing</Link></li>
                <li><Link href="#" className="hover:text-ink">Security</Link></li>
                <li><Link href="#" className="hover:text-ink">Integrations</Link></li>
                <li><Link href="#" className="hover:text-ink">API Docs</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-ink mb-4">Resources</h3>
              <ul className="space-y-2 text-sm text-grey-mid">
                <li><Link href="#" className="hover:text-ink">Help Center</Link></li>
                <li><Link href="#" className="hover:text-ink">Video Tutorials</Link></li>
                <li><Link href="#" className="hover:text-ink">Blog</Link></li>
                <li><Link href="#" className="hover:text-ink">Webinars</Link></li>
                <li><Link href="#" className="hover:text-ink">Gift Aid Calculator</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-ink mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-grey-mid">
                <li><Link href="#" className="hover:text-ink">About</Link></li>
                <li><Link href="#" className="hover:text-ink">Our Story</Link></li>
                <li><Link href="#" className="hover:text-ink">Contact</Link></li>
                <li><Link href="#" className="hover:text-ink">Careers</Link></li>
                <li><Link href="#" className="hover:text-ink">Terms</Link></li>
                <li><Link href="#" className="hover:text-ink">Privacy</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-ink mb-4">Contact</h3>
              <ul className="space-y-2 text-sm text-grey-mid">
                <li>UK Support Hours:<br />Mon-Sat 9am-6pm</li>
                <li>hello@churchcoin.org.uk</li>
                <li>0800 CHURCH1</li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-ledger flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-ink" />
              <span className="font-bold text-ink">ChurchCoin</span>
            </div>
            <div className="text-sm text-grey-mid text-center md:text-right">
              <p>Registered in England & Wales | ICO Registered | Cyber Essentials Certified</p>
              <p>© 2025 ChurchCoin. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}