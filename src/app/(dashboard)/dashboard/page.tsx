"use client";

import React, { useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import Link from "next/link";
import { PiggyBank, Receipt, Users, TrendingUp, Plus, Eye, Calendar, ArrowRight, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api, type Doc } from "@/lib/convexGenerated";
import { formatUkDateNumeric } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { InsightsWidget } from "@/components/ai/insights-widget";

interface MetricCardProps {
  title: string;
  value: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: {
    value: string;
    positive: boolean;
  };
}

function MetricCard({ title, value, description, icon: Icon, trend }: MetricCardProps) {
  return (
    <Card className="border-ledger bg-paper">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium font-primary text-grey-mid">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-grey-mid" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold font-primary text-ink">{value}</div>
        <p className="text-xs text-grey-mid font-primary">
          {description}
        </p>
        {trend && (
          <div className={cn(
            "text-xs font-primary mt-1",
            trend.positive ? "text-success" : "text-error"
          )}>
            {trend.positive ? "+" : ""}{trend.value} from last month
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface QuickActionProps {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

function QuickAction({ title, description, href, icon: Icon }: QuickActionProps) {
  return (
    <Link href={href}>
      <Card className="border-ledger bg-paper hover:bg-highlight cursor-pointer transition-colors">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-ink font-primary">
            <Icon className="h-5 w-5" />
            {title}
          </CardTitle>
          <p className="text-sm text-grey-mid font-primary">
            {description}
          </p>
        </CardHeader>
      </Card>
    </Link>
  );
}

export default function DashboardPage() {
  const churches = useQuery(api.churches.listChurches, {});
  const funds = useQuery(api.funds.list);
  const recentTransactions = useQuery(api.transactions.getRecent, { limit: 5 });
  const totalFunds = useQuery(api.funds.getTotalBalance);
  const generateInsights = useMutation(api.aiInsights.generateInsights);

  const churchId = churches?.[0]?._id;

  // Period data
  const currentPeriod = useQuery(
    api.financialPeriods.getCurrentPeriod,
    churchId ? { churchId } : "skip"
  );
  const periodMetrics = useQuery(
    api.financialPeriods.getPeriodMetrics,
    currentPeriod?._id ? { periodId: currentPeriod._id } : "skip"
  );

  // Generate AI insights on mount
  useEffect(() => {
    if (churchId) {
      generateInsights({ churchId }).catch(console.error);
    }
  }, [churchId, generateInsights]);

  // Calculate metrics
  const fundsCount = funds?.length || 0;
  const totalBalance = totalFunds || 0;
  const transactionCount = recentTransactions?.length || 0;

  // Helper to render status badge
  const getStatusBadge = () => {
    if (!currentPeriod) return null;

    const statusConfig = {
      draft: { label: "Draft", className: "bg-grey-light text-grey-dark border-ledger" },
      processing: { label: "Processing", className: "bg-blue-50 text-blue-700 border-blue-200" },
      completed: { label: "Completed", className: "bg-success/10 text-success border-success/20" },
      overdue: {
        label: `Overdue (${currentPeriod.overdueDays} days)`,
        className: "bg-error/10 text-error border-error/20",
      },
    };

    const config = statusConfig[currentPeriod.status];

    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 px-3 py-1 text-sm font-medium font-primary border rounded",
          config.className
        )}
      >
        {currentPeriod.status === "overdue" && <AlertTriangle className="h-3 w-3" />}
        {config.label}
      </span>
    );
  };

  // Loading state
  if (funds === undefined || recentTransactions === undefined || totalFunds === undefined) {
    return (
      <div className="p-6">
        <div className="mb-8">
          <p className="text-grey-mid font-primary">
            Loading your church finance overview...
          </p>
        </div>

        {/* Loading skeletons */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-ledger bg-paper">
              <CardHeader>
                <div className="h-4 bg-grey-light rounded w-20" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-grey-light rounded w-16 mb-2" />
                <div className="h-3 bg-grey-light rounded w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <p className="text-grey-mid font-primary">
          Welcome to your church finance management dashboard
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <MetricCard
          title="Total Funds"
          value={`£${totalBalance.toFixed(2)}`}
          description="Across all accounts"
          icon={PiggyBank}
          trend={{ value: "12%", positive: true }}
        />
        <MetricCard
          title="Active Funds"
          value={fundsCount.toString()}
          description="Funds being managed"
          icon={TrendingUp}
        />
        <MetricCard
          title="Recent Transactions"
          value={transactionCount.toString()}
          description="In the last 7 days"
          icon={Receipt}
        />
        <MetricCard
          title="Registered Donors"
          value="24"
          description="Active donors this year"
          icon={Users}
          trend={{ value: "3", positive: true }}
        />
      </div>

      {/* Period Status Card */}
      {currentPeriod && (
        <Card className="border-ledger bg-paper mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-ink font-primary">
                <Calendar className="h-5 w-5" />
                Current Period: {currentPeriod.periodName}
              </CardTitle>
              {getStatusBadge()}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Progress Bar */}
              {periodMetrics && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm font-primary">
                    <span className="text-grey-mid">Categorization Progress</span>
                    <span className="text-ink font-medium">
                      {periodMetrics.percentComplete}% complete
                    </span>
                  </div>
                  <div className="h-2 bg-grey-light rounded-full overflow-hidden">
                    <div
                      className="h-full bg-success transition-all"
                      style={{ width: `${periodMetrics.percentComplete}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs font-primary text-grey-mid">
                    <span>
                      {periodMetrics.categorized} of {periodMetrics.total} transactions categorized
                    </span>
                    {periodMetrics.needsReview > 0 && (
                      <span className="text-error font-medium">
                        {periodMetrics.needsReview} need review
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Overdue Warning */}
              {currentPeriod.status === "overdue" && (
                <div className="flex items-center gap-2 p-3 bg-error/5 border border-error/20 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-error flex-shrink-0" />
                  <p className="text-sm text-error font-primary">
                    This period is overdue. Please complete categorization and review.
                  </p>
                </div>
              )}

              {/* Action Button */}
              <Link href="/reports">
                <Button className="w-full font-primary border-ledger" variant="outline">
                  Go to Reports
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Insights Widget */}
      {churchId && (
        <div className="mb-8">
          <InsightsWidget churchId={churchId} />
        </div>
      )}

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold font-primary text-ink mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <QuickAction
            title="Create New Fund"
            description="Set up a new fund for your church"
            href="/funds"
            icon={Plus}
          />
          <QuickAction
            title="Record Transaction"
            description="Add income or expenses"
            href="/transactions"
            icon={Receipt}
          />
          <QuickAction
            title="View Reports"
            description="Generate financial reports"
            href="/reports"
            icon={Eye}
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Transactions */}
        <Card className="border-ledger bg-paper">
          <CardHeader>
            <CardTitle className="text-ink font-primary">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {recentTransactions && recentTransactions.length > 0 ? (
              <div className="space-y-3">
                {recentTransactions.map((transaction: Doc<"transactions">) => (
                  <div
                    key={transaction._id}
                    className="flex items-center justify-between p-3 border border-ledger rounded-lg"
                  >
                    <div>
                      <p className="font-medium font-primary text-ink text-sm">
                        {transaction.description}
                      </p>
                      <p className="text-xs text-grey-mid font-primary">
                        {formatUkDateNumeric(transaction.date) || "—"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "font-medium font-primary text-sm",
                        transaction.type === "income" ? "text-success" : "text-error"
                      )}>
                        {transaction.type === "income" ? "+" : "-"}£{transaction.amount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
                <div className="pt-2">
                  <Link href="/transactions">
                    <Button variant="outline" className="w-full font-primary border-ledger">
                      View All Transactions
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <Receipt className="h-8 w-8 text-grey-mid mx-auto mb-2" />
                <p className="text-grey-mid font-primary text-sm">No recent transactions</p>
                <Link href="/transactions">
                  <Button variant="outline" className="mt-2 font-primary border-ledger">
                    Add First Transaction
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fund Overview */}
        <Card className="border-ledger bg-paper">
          <CardHeader>
            <CardTitle className="text-ink font-primary">Fund Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {funds && funds.length > 0 ? (
              <div className="space-y-3">
                {funds.slice(0, 4).map((fund: Doc<"funds">) => (
                  <div
                    key={fund._id}
                    className="flex items-center justify-between p-3 border border-ledger rounded-lg"
                  >
                    <div>
                      <p className="font-medium font-primary text-ink text-sm">
                        {fund.name}
                      </p>
                      <p className="text-xs text-grey-mid font-primary capitalize">
                        {fund.type} fund
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium font-primary text-sm text-ink">
                        £{fund.balance.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
                {funds.length > 4 && (
                  <p className="text-xs text-grey-mid font-primary text-center py-2">
                    +{funds.length - 4} more funds
                  </p>
                )}
                <div className="pt-2">
                  <Link href="/funds">
                    <Button variant="outline" className="w-full font-primary border-ledger">
                      Manage All Funds
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <PiggyBank className="h-8 w-8 text-grey-mid mx-auto mb-2" />
                <p className="text-grey-mid font-primary text-sm">No funds created yet</p>
                <Link href="/funds">
                  <Button variant="outline" className="mt-2 font-primary border-ledger">
                    Create First Fund
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
