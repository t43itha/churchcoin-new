"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Wallet,
    FileCheck,
    TrendingUp,
    ArrowUpRight,
    ArrowDownRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const features = [
    {
        id: "funds",
        icon: Wallet,
        label: "Fund Tracking",
        title: "Real-time Fund Management",
        description: "Know exactly where every pound goes with automated fund separation.",
        stats: [
            { label: "General Fund", value: "£12,450", change: "+12%", trend: "up" },
            { label: "Building Project", value: "£45,200", change: "+5%", trend: "up" },
            { label: "Missions", value: "£3,800", change: "-2%", trend: "down" },
        ]
    },
    {
        id: "giftaid",
        icon: FileCheck,
        label: "Gift Aid",
        title: "One-click Gift Aid Claims",
        description: "Reclaim up to £3,000 more annually with automated HMRC-ready claims.",
        stats: [
            { label: "Claimable", value: "£2,450", change: "Ready", trend: "neutral" },
            { label: "Processed YTD", value: "£8,100", change: "+15%", trend: "up" },
            { label: "Declarations", value: "145", change: "+8", trend: "up" },
        ]
    },
    {
        id: "insights",
        icon: TrendingUp,
        label: "Insights",
        title: "Smart Donor Insights",
        description: "Understand giving patterns and predict seasonal fluctuations.",
        stats: [
            { label: "Avg. Donation", value: "£45", change: "+5%", trend: "up" },
            { label: "Recurring", value: "78%", change: "+2%", trend: "up" },
            { label: "New Donors", value: "12", change: "This month", trend: "neutral" },
        ]
    }
];

export function InteractiveDemo() {
    const [activeFeature, setActiveFeature] = useState(features[0]);

    return (
        <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
            <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4 font-primary">
                    See ChurchCoin in action
                </h2>
                <p className="text-xl text-grey-mid max-w-2xl mx-auto font-primary">
                    Experience how simple church finance can be.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Feature Navigation */}
                <div className="lg:col-span-4 space-y-4">
                    {features.map((feature) => (
                        <button
                            key={feature.id}
                            onClick={() => setActiveFeature(feature)}
                            className={cn(
                                "w-full text-left p-4 rounded-xl transition-all duration-200 border-2",
                                activeFeature.id === feature.id
                                    ? "border-ink bg-paper shadow-sm"
                                    : "border-transparent hover:bg-highlight"
                            )}
                        >
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "p-2 rounded-lg",
                                    activeFeature.id === feature.id ? "bg-ink text-paper" : "bg-ledger text-grey-dark"
                                )}>
                                    <feature.icon className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-ink font-primary">{feature.label}</h3>
                                    <p className="text-sm text-grey-mid font-primary line-clamp-1">{feature.title}</p>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Interactive Display */}
                <div className="lg:col-span-8">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeFeature.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="bg-paper border border-ledger rounded-2xl p-6 shadow-sm min-h-[400px] flex flex-col"
                        >
                            <div className="mb-8">
                                <h3 className="text-2xl font-bold text-ink mb-2 font-primary">{activeFeature.title}</h3>
                                <p className="text-grey-mid font-primary">{activeFeature.description}</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                                {activeFeature.stats.map((stat, index) => (
                                    <div key={index} className="bg-highlight rounded-xl p-4 border border-ledger">
                                        <p className="text-sm text-grey-mid font-primary mb-1">{stat.label}</p>
                                        <p className="text-2xl font-bold text-ink font-primary mb-2">{stat.value}</p>
                                        <div className="flex items-center gap-1 text-sm">
                                            {stat.trend === "up" && <ArrowUpRight className="h-4 w-4 text-success" />}
                                            {stat.trend === "down" && <ArrowDownRight className="h-4 w-4 text-error" />}
                                            <span className={cn(
                                                "font-medium",
                                                stat.trend === "up" ? "text-success" :
                                                    stat.trend === "down" ? "text-error" : "text-grey-mid"
                                            )}>
                                                {stat.change}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Mock Interface Representation */}
                            <div className="flex-1 bg-white rounded-xl border border-ledger p-4 relative overflow-hidden">
                                <div className="absolute top-0 left-0 right-0 h-8 bg-ledger/30 border-b border-ledger flex items-center px-4 gap-2">
                                    <div className="w-3 h-3 rounded-full bg-error/50"></div>
                                    <div className="w-3 h-3 rounded-full bg-warning/50"></div>
                                    <div className="w-3 h-3 rounded-full bg-success/50"></div>
                                </div>

                                <div className="mt-8 space-y-3">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="flex items-center gap-4 p-3 hover:bg-highlight/50 rounded-lg transition-colors">
                                            <div className="w-8 h-8 rounded-full bg-ledger animate-pulse"></div>
                                            <div className="flex-1 space-y-2">
                                                <div className="h-4 w-1/3 bg-ledger rounded animate-pulse"></div>
                                                <div className="h-3 w-1/4 bg-ledger/50 rounded animate-pulse"></div>
                                            </div>
                                            <div className="h-4 w-16 bg-ledger rounded animate-pulse"></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
