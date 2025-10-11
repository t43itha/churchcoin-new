import Link from "next/link";
import Image from "next/image";
import { HeroSection } from "@/components/HeroSection";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Calculator,
  PoundSterling,
  Shield,
  TrendingUp,
  Clock,
  CheckCircle,
  Star,
  ArrowRight,
  Menu
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-paper font-primary">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-paper/90 backdrop-blur-md border-b border-ledger">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex w-full flex-wrap items-center gap-4 md:gap-8 py-4">
            <div className="flex items-center gap-2">
              <Calculator className="h-8 w-8 text-ink" />
              <h1 className="text-xl font-bold text-ink font-primary">ChurchCoin</h1>
            </div>

            <nav className="hidden md:flex flex-1 items-center justify-center space-x-8 font-primary">
              <Link href="#features" className="text-grey-mid hover:text-ink font-medium">
                Features
              </Link>
              <Link href="#pricing" className="text-grey-mid hover:text-ink font-medium">
                Pricing
              </Link>
              <Link href="#testimonials" className="text-grey-mid hover:text-ink font-medium">
                Testimonials
              </Link>
              <Link href="#resources" className="text-grey-mid hover:text-ink font-medium">
                Resources
              </Link>
            </nav>

            <div className="flex w-full items-center justify-between gap-2 sm:gap-4 md:w-auto md:ml-auto md:justify-end">
              <Button asChild variant="ghost" className="hidden md:inline-flex font-primary">
                <Link href="/login">Sign In</Link>
              </Button>
              <Button className="flex-1 md:flex-none md:w-auto h-auto px-4 py-2 text-sm md:text-base bg-ink text-paper hover:bg-grey-dark font-primary">
                Start Free Trial
              </Button>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section with Scroll Animation */}
      <div className="pt-20">
        <HeroSection />
      </div>

      {/* Problem/Solution Section */}
      <section className="py-16 sm:py-20 lg:py-24 bg-highlight">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-14 md:mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4 font-primary">
              Your church treasurer shouldn&apos;t spend weekends wrestling with spreadsheets
            </h2>
            <p className="text-xl text-grey-mid max-w-3xl mx-auto font-primary">
              ChurchCoin transforms financial chaos into clarity in minutes, not months.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <Card className="border-ledger bg-paper">
              <CardHeader>
                <Clock className="h-10 w-10 text-ink mb-2" />
                <CardTitle className="text-ink font-primary">Manual Chaos</CardTitle>
                <CardDescription className="text-grey-mid font-semibold font-primary">
                  15+ hours monthly
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-grey-mid font-primary">
                  Lost to duplicate data entry, paper receipts, and Excel gymnastics
                </p>
              </CardContent>
            </Card>

            <Card className="border-ledger bg-paper">
              <CardHeader>
                <PoundSterling className="h-10 w-10 text-ink mb-2" />
                <CardTitle className="text-ink font-primary">Gift Aid Headaches</CardTitle>
                <CardDescription className="text-grey-mid font-semibold font-primary">
                  £2,500 average unclaimed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-grey-mid font-primary">
                  Annually due to missing declarations and filing complexity
                </p>
              </CardContent>
            </Card>

            <Card className="border-ledger bg-paper">
              <CardHeader>
                <Shield className="h-10 w-10 text-ink mb-2" />
                <CardTitle className="text-ink font-primary">Compliance Concerns</CardTitle>
                <CardDescription className="text-grey-mid font-semibold font-primary">
                  73% of churches
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-grey-mid font-primary">
                  Worry about meeting Charity Commission requirements
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 sm:py-20 lg:py-24 bg-paper">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-14 md:mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4 font-primary">
              Built for churches, by people who understand ministry
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-12 items-center mb-12 sm:mb-14 md:mb-16">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="h-8 w-8 text-ink" />
                <h3 className="text-2xl font-bold text-ink font-primary">Fund Management</h3>
              </div>
              <p className="text-lg font-semibold text-grey-mid mb-3 font-primary">
                Track every penny, honor every intention
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-ink mt-0.5 flex-shrink-0" />
                  <span className="text-grey-mid font-primary">Separate restricted, designated, and general funds automatically</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-ink mt-0.5 flex-shrink-0" />
                  <span className="text-grey-mid font-primary">Real-time balance updates across all funds</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-ink mt-0.5 flex-shrink-0" />
                  <span className="text-grey-mid font-primary">Visual dashboards your whole team understands</span>
                </li>
              </ul>
            </div>
            <div className="bg-paper rounded-2xl p-6 sm:p-8 h-60 sm:h-72 md:h-80 border border-ledger flex items-center justify-center">
              <Image
                src="/fund-card.png"
                alt="Fund Management - Charity Fund Card showing balance and transactions"
                width={600}
                height={400}
                className="w-full h-auto max-h-full object-contain rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-12 items-center mb-12 sm:mb-14 md:mb-16">
            <div className="order-2 md:order-1 bg-paper rounded-2xl p-6 sm:p-8 h-60 sm:h-72 md:h-80 border border-ledger flex items-center justify-center">
              <Image
                src="/gift-aid-status.png"
                alt="Gift Aid Automation - Status tracking and declaration management"
                width={600}
                height={400}
                className="w-full h-auto max-h-full object-contain rounded-lg"
              />
            </div>
            <div className="order-1 md:order-2">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="h-8 w-8 text-ink" />
                <h3 className="text-2xl font-bold text-ink font-primary">Gift Aid Automation</h3>
              </div>
              <p className="text-lg font-semibold text-grey-mid mb-3 font-primary">
                Reclaim what&apos;s rightfully yours
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-ink mt-0.5 flex-shrink-0" />
                  <span className="text-grey-mid font-primary">Digital declarations captured instantly</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-ink mt-0.5 flex-shrink-0" />
                  <span className="text-grey-mid font-primary">HMRC-ready claims in 2 clicks</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-ink mt-0.5 flex-shrink-0" />
                  <span className="text-grey-mid font-primary">Average extra recovery: £3,000/year</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-16 sm:py-20 lg:py-24 bg-highlight">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-14 md:mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4 font-primary">
              Trusted by churches across the UK
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
            <Card className="border-ledger bg-paper">
              <CardHeader>
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-ink text-ink" />
                  ))}
                </div>
                <CardTitle className="text-lg font-primary text-ink">St. Mary&apos;s, Birmingham</CardTitle>
                <CardDescription className="font-primary">150 members</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-grey-mid italic mb-4 font-primary">
                  &ldquo;We&apos;ve reclaimed £4,200 more in Gift Aid this year alone. What took our treasurer entire weekends now takes 30 minutes.&rdquo;
                </p>
                <p className="text-sm font-semibold text-grey-mid font-primary">
                  — Rev. Sarah Mitchell
                </p>
              </CardContent>
            </Card>

            <Card className="border-ledger bg-paper">
              <CardHeader>
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-ink text-ink" />
                  ))}
                </div>
                <CardTitle className="text-lg font-primary text-ink">Grace Community Church</CardTitle>
                <CardDescription className="font-primary">Manchester, 75 members</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-grey-mid italic mb-4 font-primary">
                  &ldquo;ChurchCoin paid for itself in the first month. Our trustees finally understand our finances without me translating spreadsheets.&rdquo;
                </p>
                <p className="text-sm font-semibold text-grey-mid font-primary">
                  — James Chen, Treasurer
                </p>
              </CardContent>
            </Card>

            <Card className="border-ledger bg-paper">
              <CardHeader>
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-ink text-ink" />
                  ))}
                </div>
                <CardTitle className="text-lg font-primary text-ink">Hope Fellowship</CardTitle>
                <CardDescription className="font-primary">Edinburgh, 200 members</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-grey-mid italic mb-4 font-primary">
                  &ldquo;Switching from paper ledgers to ChurchCoin felt like jumping from 1985 to 2025. Absolutely transformative.&rdquo;
                </p>
                <p className="text-sm font-semibold text-grey-mid font-primary">
                  — Margaret Brown, Finance Lead
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 sm:py-20 lg:py-24 bg-paper">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-14 md:mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4 font-primary">
              Transparent pricing that scales with your ministry
            </h2>
            <p className="text-xl text-grey-mid font-primary">
              No setup fees. No hidden costs. Cancel anytime.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <Card className="relative border-ledger bg-paper">
              <CardHeader>
                <CardTitle className="font-primary text-ink">Starter</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold font-primary text-ink">£29</span>
                  <span className="text-grey-mid font-primary">/month</span>
                </div>
                <CardDescription className="font-primary">Perfect for small churches and plants</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-ink" />
                    <span className="font-primary text-grey-mid">Up to 50 donors</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-ink" />
                    <span className="font-primary text-grey-mid">3 funds</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-ink" />
                    <span className="font-primary text-grey-mid">Gift Aid management</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-ink" />
                    <span className="font-primary text-grey-mid">Basic reporting</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-ink" />
                    <span className="font-primary text-grey-mid">Email support</span>
                  </li>
                </ul>
                <Button className="w-full font-primary" variant="outline">
                  Start Free Trial
                </Button>
              </CardContent>
            </Card>

            <Card className="relative border-2 border-ink bg-paper">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-ink text-paper px-3 py-1 rounded-full text-sm font-semibold font-primary">
                  Most Popular
                </span>
              </div>
              <CardHeader>
                <CardTitle className="font-primary text-ink">Growing</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold font-primary text-ink">£59</span>
                  <span className="text-grey-mid font-primary">/month</span>
                </div>
                <CardDescription className="font-primary">Perfect for established churches</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-ink" />
                    <span className="font-primary text-grey-mid">Up to 200 donors</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-ink" />
                    <span className="font-primary text-grey-mid">Unlimited funds</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-ink" />
                    <span className="font-primary text-grey-mid">Advanced Gift Aid with bulk claims</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-ink" />
                    <span className="font-primary text-grey-mid">Full compliance reporting</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-ink" />
                    <span className="font-primary text-grey-mid">Priority support</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-ink" />
                    <span className="font-primary text-grey-mid">Data export</span>
                  </li>
                </ul>
                <Button className="w-full bg-ink text-paper hover:bg-grey-dark font-primary">
                  Start Free Trial
                </Button>
              </CardContent>
            </Card>

            <Card className="relative border-ledger bg-paper">
              <CardHeader>
                <CardTitle className="font-primary text-ink">Thriving</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold font-primary text-ink">£99</span>
                  <span className="text-grey-mid font-primary">/month</span>
                </div>
                <CardDescription className="font-primary">Perfect for large churches and networks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-ink" />
                    <span className="font-primary text-grey-mid">Unlimited donors</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-ink" />
                    <span className="font-primary text-grey-mid">Multi-site support</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-ink" />
                    <span className="font-primary text-grey-mid">Custom categories</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-ink" />
                    <span className="font-primary text-grey-mid">API access</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-ink" />
                    <span className="font-primary text-grey-mid">Dedicated onboarding</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-ink" />
                    <span className="font-primary text-grey-mid">Phone support</span>
                  </li>
                </ul>
                <Button className="w-full font-primary" variant="outline">
                  Start Free Trial
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-12">
            <p className="text-lg font-semibold text-ink mb-2 font-primary">
              30-day money-back guarantee
            </p>
            <p className="text-grey-mid font-primary">
              Not convinced? Get a full refund, no questions asked.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-16 sm:py-20 lg:py-24 bg-ink">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-paper mb-4 font-primary">
            Your congregation trusts you with their giving.
            <br />
            Trust ChurchCoin with your finances.
          </h2>
          <p className="text-lg sm:text-xl text-paper/80 mb-8 max-w-3xl mx-auto font-primary">
            Join 500+ UK churches saving 15 hours monthly while maximizing every pound for ministry.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="w-full sm:w-auto bg-paper text-ink hover:bg-paper/90 px-6 sm:px-8 py-5 text-base sm:text-lg font-semibold font-primary">
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto border-paper text-paper hover:bg-paper/10 px-6 sm:px-8 py-5 text-base sm:text-lg font-semibold font-primary">
              Book a Demo
            </Button>
          </div>
          <div className="mt-8 text-paper/70 space-y-1 font-primary">
            <p>✓ No credit card required</p>
            <p>✓ Setup in 10 minutes</p>
            <p>✓ Cancel anytime</p>
            <p>✓ UK-based support</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-grey-dark text-grey-mid py-12 sm:py-16 font-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 mb-8">
            <div>
              <h3 className="text-paper font-semibold mb-4 font-primary">Product</h3>
              <ul className="space-y-2">
                <li><Link href="#" className="hover:text-paper font-primary">Features</Link></li>
                <li><Link href="#" className="hover:text-paper font-primary">Pricing</Link></li>
                <li><Link href="#" className="hover:text-paper font-primary">Security</Link></li>
                <li><Link href="#" className="hover:text-paper font-primary">Integrations</Link></li>
                <li><Link href="#" className="hover:text-paper font-primary">API Docs</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-paper font-semibold mb-4 font-primary">Resources</h3>
              <ul className="space-y-2">
                <li><Link href="#" className="hover:text-paper font-primary">Help Center</Link></li>
                <li><Link href="#" className="hover:text-paper font-primary">Video Tutorials</Link></li>
                <li><Link href="#" className="hover:text-paper font-primary">Blog</Link></li>
                <li><Link href="#" className="hover:text-paper font-primary">Webinars</Link></li>
                <li><Link href="#" className="hover:text-paper font-primary">Gift Aid Calculator</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-paper font-semibold mb-4 font-primary">Company</h3>
              <ul className="space-y-2">
                <li><Link href="#" className="hover:text-paper font-primary">About</Link></li>
                <li><Link href="#" className="hover:text-paper font-primary">Our Story</Link></li>
                <li><Link href="#" className="hover:text-paper font-primary">Contact</Link></li>
                <li><Link href="#" className="hover:text-paper font-primary">Careers</Link></li>
                <li><Link href="#" className="hover:text-paper font-primary">Terms</Link></li>
                <li><Link href="#" className="hover:text-paper font-primary">Privacy</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-paper font-semibold mb-4 font-primary">Contact</h3>
              <ul className="space-y-2">
                <li className="text-sm font-primary">UK Support Hours:<br />Mon-Sat 9am-6pm</li>
                <li className="font-primary">Email: hello@churchcoin.org.uk</li>
                <li className="font-primary">Phone: 0800 CHURCH1</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-ledger pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Calculator className="h-6 w-6 text-paper" />
              <span className="text-paper font-semibold font-primary">ChurchCoin</span>
            </div>
            <div className="text-sm text-center md:text-right font-primary">
              <p>Registered in England & Wales | ICO Registered | Cyber Essentials Certified</p>
              <p className="mt-2">© 2025 ChurchCoin. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}