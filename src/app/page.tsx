import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator, PoundSterling, Shield, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-paper">
      {/* Header */}
      <header className="border-b border-ledger bg-paper">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-2">
              <Calculator className="h-8 w-8 text-grey-dark" />
              <h1 className="text-xl font-semibold text-ink">ChurchCoin</h1>
            </div>
            <div className="flex space-x-4">
              <Button asChild variant="outline" className="font-primary">
                <Link href="/login">Sign In</Link>
              </Button>
              <Button className="font-primary">
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-ink mb-4">
            AI-First Financial Management
            <br />
            <span className="text-grey-dark">for UK Churches</span>
          </h2>
          <p className="text-lg text-grey-mid max-w-2xl mx-auto leading-relaxed">
            Replace error-prone spreadsheets with intelligent automation.
            ChurchCoin handles fund accounting, Gift Aid, and compliance
            so volunteers can focus on ministry.
          </p>
          <div className="mt-8 flex justify-center space-x-4">
            <Button size="lg" className="font-primary">
              Start Free Trial
            </Button>
            <Button variant="outline" size="lg" className="font-primary">
              View Demo
            </Button>
          </div>
        </div>

        {/* Demo Ledger Table */}
        <div className="mb-16">
          <h3 className="text-xl font-semibold text-grey-dark mb-6 text-center">
            Ledger-Inspired Interface
          </h3>
          <div className="bg-paper border border-ledger rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="ledger-header bg-ledger">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-medium text-grey-dark">Date</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-grey-dark">Description</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-grey-dark">Fund</th>
                    <th className="px-6 py-3 text-right text-sm font-medium text-grey-dark">Debit</th>
                    <th className="px-6 py-3 text-right text-sm font-medium text-grey-dark">Credit</th>
                    <th className="px-6 py-3 text-right text-sm font-medium text-grey-dark">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="ledger-row">
                    <td className="px-6 py-3 text-sm text-ink">03/01/2025</td>
                    <td className="px-6 py-3 text-sm text-ink">Sunday Collection</td>
                    <td className="px-6 py-3 text-sm text-grey-mid">General Fund</td>
                    <td className="px-6 py-3 text-sm text-right text-ink">—</td>
                    <td className="px-6 py-3 text-sm text-right text-success">£450.00</td>
                    <td className="px-6 py-3 text-sm text-right text-ink font-medium">£10,450.00</td>
                  </tr>
                  <tr className="ledger-row">
                    <td className="px-6 py-3 text-sm text-ink">02/01/2025</td>
                    <td className="px-6 py-3 text-sm text-ink">Building Fund Collection</td>
                    <td className="px-6 py-3 text-sm text-grey-mid">Building Fund</td>
                    <td className="px-6 py-3 text-sm text-right text-ink">—</td>
                    <td className="px-6 py-3 text-sm text-right text-success">£275.00</td>
                    <td className="px-6 py-3 text-sm text-right text-ink font-medium">£4,275.00</td>
                  </tr>
                  <tr className="ledger-row">
                    <td className="px-6 py-3 text-sm text-ink">01/01/2025</td>
                    <td className="px-6 py-3 text-sm text-ink">Electricity Bill</td>
                    <td className="px-6 py-3 text-sm text-grey-mid">General Fund</td>
                    <td className="px-6 py-3 text-sm text-right text-error">£180.50</td>
                    <td className="px-6 py-3 text-sm text-right text-ink">—</td>
                    <td className="px-6 py-3 text-sm text-right text-ink font-medium">£10,000.00</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="border-ledger">
            <CardHeader>
              <PoundSterling className="h-8 w-8 text-success mb-2" />
              <CardTitle className="text-ink">Fund Accounting</CardTitle>
              <CardDescription className="text-grey-mid">
                Track multiple funds independently with restricted fund compliance
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-ledger">
            <CardHeader>
              <Zap className="h-8 w-8 text-success mb-2" />
              <CardTitle className="text-ink">AI Categorization</CardTitle>
              <CardDescription className="text-grey-mid">
                Automatically categorize transactions and match donors
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-ledger">
            <CardHeader>
              <Shield className="h-8 w-8 text-success mb-2" />
              <CardTitle className="text-ink">Gift Aid Ready</CardTitle>
              <CardDescription className="text-grey-mid">
                Track declarations and generate HMRC submission files
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Status */}
        <div className="text-center">
          <div className="inline-flex items-center space-x-2 bg-highlight px-4 py-2 rounded-lg">
            <div className="w-2 h-2 bg-success rounded-full"></div>
            <span className="text-sm text-grey-dark font-medium">
              MVP Development in Progress - Phase 1 of 3
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
