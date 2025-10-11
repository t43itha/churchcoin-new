"use client";
import React from "react";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, Shield, TrendingUp, Users } from "lucide-react";

export function HeroSection() {
  return (
    <div className="flex flex-col font-primary">
      <ContainerScroll
        titleComponent={
          <>
            <div className="flex flex-col items-center justify-center">
              <div className="mb-4 inline-flex items-center rounded-full border border-ledger bg-paper px-3 py-1 text-sm">
                <Shield className="mr-2 h-4 w-4 text-ink" />
                <span className="text-grey-mid">Built with UK treasurers</span>
              </div>

              <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold text-ink text-center font-primary">
                Church finances simplified.
                <br />
                <span className="text-2xl sm:text-4xl md:text-5xl font-semibold mt-2 text-grey-mid">
                  Ministry amplified.
                </span>
              </h1>

              <p className="mt-6 text-base sm:text-lg md:text-xl text-grey-mid max-w-3xl text-center font-primary">
                ChurchCoin gives you a compliant finance co-pilot that reconciles feeds, prepares Gift Aid, and briefs leadership while you focus on ministry.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mt-8 w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-ink text-paper hover:bg-grey-dark px-6 sm:px-8 py-5 text-base sm:text-lg font-semibold font-primary"
                >
                  Start Free 30-Day Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto px-6 sm:px-8 py-5 text-base sm:text-lg font-semibold border-2 border-ledger text-ink hover:bg-highlight font-primary"
                >
                  Book a Demo
                </Button>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 mt-6 text-xs sm:text-sm text-grey-mid font-primary">
                <span className="inline-flex items-center gap-2">
                  <Check className="h-4 w-4 text-ink" />
                  No credit card required
                </span>
                <span className="hidden sm:inline">•</span>
                <span className="inline-flex items-center gap-2">
                  <Check className="h-4 w-4 text-ink" />
                  Setup in 10 minutes
                </span>
                <span className="hidden sm:inline">•</span>
                <span className="inline-flex items-center gap-2">
                  <Check className="h-4 w-4 text-ink" />
                  Cancel anytime
                </span>
              </div>
            </div>
          </>
        }
      >
        <div className="relative h-full w-full">
          {/* Dashboard Preview Image */}
          <Image
            src="/dash.png"
            alt="ChurchCoin Dashboard - Finance & Donor Health Overview"
            height={720}
            width={1400}
            className="mx-auto rounded-2xl object-cover h-full w-full"
            draggable={false}
          />

          {/* Overlay with feature highlights */}
          <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent rounded-2xl">
            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:p-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <FeatureCard
                  icon={<TrendingUp className="h-5 w-5" />}
                  title="Real-time Tracking"
                  description="Live fund balances"
                />
                <FeatureCard
                  icon={<Shield className="h-5 w-5" />}
                  title="Gift Aid Ready"
                  description="£3,000+ extra annually"
                />
                <FeatureCard
                  icon={<Users className="h-5 w-5" />}
                  title="Donor Insights"
                  description="GDPR compliant"
                />
                <FeatureCard
                  icon={<Check className="h-5 w-5" />}
                  title="Auto Compliance"
                  description="Charity Commission ready"
                />
              </div>
            </div>
          </div>
        </div>
      </ContainerScroll>

      {/* Stats Bar */}
      <div className="bg-highlight border-y border-ledger">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            <StatItem value="500+" label="Churches Onboarded" />
            <StatItem value="£2.3M" label="Extra Gift Aid Recovered" />
            <StatItem value="7,500" label="Hours Saved Monthly" />
            <StatItem value="99.9%" label="Uptime Guaranteed" />
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-paper/95 backdrop-blur-sm rounded-lg p-4 border border-ledger font-primary">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 text-ink">
          {icon}
        </div>
        <div>
          <h3 className="font-semibold text-ink text-sm">{title}</h3>
          <p className="text-xs text-grey-mid">{description}</p>
        </div>
      </div>
    </div>
  );
}

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center font-primary">
      <div className="text-2xl sm:text-3xl font-bold text-ink">{value}</div>
      <div className="text-xs sm:text-sm text-grey-mid mt-1">{label}</div>
    </div>
  );
}