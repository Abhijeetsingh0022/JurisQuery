"use client";

import { useState } from "react";
import { Check, Zap, Shield, Building2, ChevronRight, Loader2, Star } from "lucide-react";
import { motion } from "framer-motion";
import { useApi } from "@/hooks/use-api";
import { cn } from "@/lib/utils";
import ComingSoonModal from "@/components/shared/ComingSoonModal";

const plans = [
    {
        name: "Starter",
        price: "₹0",
        description: "Perfect for law students and individual researchers.",
        features: [
            "3 Case Folders total",
            "10 Document uploads / month",
            "5 IPC Predictor queries / day",
            "Basic Statute Bridge (IPC ↔ BNS)",
            "Standard search performance",
        ],
        cta: "Current Plan",
        popular: false,
        icon: Zap,
        color: "text-blue-500",
        bg: "from-blue-500/10 to-transparent",
    },
    {
        name: "Pro",
        price: "₹2,499",
        period: "/month",
        description: "For professional lawyers needing unlimited power.",
        features: [
            "Unlimited Case Folders",
            "Unlimited Document uploads",
            "Unlimited AI Analysis & Predictor",
            "Priority LLM access",
            "Advanced Synthesis (Branched RAG)",
            "Priority Support",
        ],
        cta: "Upgrade to Pro",
        popular: true,
        icon: Star,
        color: "text-amber-500",
        bg: "from-amber-500/15 to-transparent",
    },
    {
        name: "Enterprise",
        price: "Custom",
        description: "Tailored solutions for large law firms and teams.",
        features: [
            "Dedicated Support Manager",
            "On-premise deployment options",
            "Custom AI model fine-tuning",
            "Multi-member team spaces",
            "SLA guarantees",
            "Advanced Analytics",
        ],
        cta: "Contact Sales",
        popular: false,
        icon: Building2,
        color: "text-purple-500",
        bg: "from-purple-500/10 to-transparent",
    },
];

export default function PricingPage() {
    const { fetcher } = useApi();
    const [isLoading, setIsLoading] = useState<string | null>(null);
    const [isComingSoonOpen, setIsComingSoonOpen] = useState(false);

    const handleUpgrade = async (planName: string) => {
        if (planName === "Starter") return;
        if (planName === "Enterprise") {
            window.location.href = "mailto:sales@jurisquery.ai";
            return;
        }

        setIsLoading(planName);
        try {
            const data = await fetcher("/api/v1/billing/checkout", { method: "POST" });
            if (data?.url) {
                window.location.href = data.url;
            } else {
                // If the checkout endpoint is disabled or doesn't return a URL, show Coming Soon
                setIsComingSoonOpen(true);
            }
        } catch (err) {
            console.error("Failed to initiate checkout", err);
            // Replace generic alert with premium modal
            setIsComingSoonOpen(true);
        } finally {
            setIsLoading(null);
        }
    };

    return (
        <div className="max-w-6xl mx-auto py-12">
            <ComingSoonModal 
                isOpen={isComingSoonOpen} 
                onClose={() => setIsComingSoonOpen(false)} 
            />
            <div className="text-center mb-16 px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1a2332]/5 border border-[#1a2332]/10 mb-6"
                >
                    <Shield className="w-4 h-4 text-[#1a2332]/40" />
                    <span className="text-[11px] font-bold text-[#1a2332]/60 uppercase tracking-widest">Pricing & Subscriptions</span>
                </motion.div>
                <h1 className="text-4xl md:text-5xl font-bold font-serif text-[#1a2332] mb-6">
                    Power your research with <br />
                    <span className="italic text-[#1a2332]/80">JurisQuery Pro</span>
                </h1>
                <p className="text-[#1a2332]/40 max-w-2xl mx-auto text-lg leading-relaxed">
                    Flexible plans designed to scale with your legal practice. 
                    From independent researchers to full-scale law firms.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
                {plans.map((plan, idx) => (
                    <motion.div
                        key={plan.name}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className={cn(
                            "relative flex flex-col p-8 rounded-3xl bg-white border h-full transition-all duration-300",
                            plan.popular 
                                ? "border-[#1a2332] ring-4 ring-[#1a2332]/5 shadow-2xl scale-[1.02] z-10" 
                                : "border-[#e8e2de] hover:border-[#1a2332]/20 shadow-sm"
                        )}
                    >
                        {plan.popular && (
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#1a2332] text-white px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
                                Most Popular
                            </div>
                        )}

                        <div className="mb-8">
                            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-6 bg-gradient-to-br", plan.bg)}>
                                <plan.icon className={cn("w-6 h-6", plan.color)} />
                            </div>
                            <h3 className="text-xl font-bold text-[#1a2332] mb-2">{plan.name}</h3>
                            <div className="flex items-baseline gap-1 mb-4">
                                <span className="text-4xl font-bold text-[#1a2332]">{plan.price}</span>
                                {plan.period && <span className="text-[#1a2332]/40 font-medium">{plan.period}</span>}
                            </div>
                            <p className="text-[#1a2332]/45 text-sm leading-relaxed">
                                {plan.description}
                            </p>
                        </div>

                        <div className="flex-1 space-y-4 mb-10">
                            {plan.features.map((feature) => (
                                <div key={feature} className="flex items-start gap-3">
                                    <div className="mt-1 flex-shrink-0">
                                        <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                            <Check className="w-3 h-3 text-emerald-600" />
                                        </div>
                                    </div>
                                    <span className="text-[13px] text-[#1a2332]/70 leading-relaxed font-medium">
                                        {feature}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => handleUpgrade(plan.name)}
                            disabled={isLoading === plan.name || plan.name === "Starter"}
                            className={cn(
                                "w-full py-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2",
                                plan.popular
                                    ? "bg-[#1a2332] text-white hover:bg-[#1a2332]/90 shadow-lg shadow-[#1a2332]/20"
                                    : plan.name === "Starter"
                                        ? "bg-emerald-50 text-emerald-600 cursor-default"
                                        : "bg-white border border-[#1a2332]/10 text-[#1a2332] hover:bg-[#1a2332]/5"
                            )}
                        >
                            {isLoading === plan.name ? (
                                <Loader2 className="w-4 h-4 animate-spin text-white" />
                            ) : (
                                <>
                                    {plan.cta}
                                    {plan.name !== "Starter" && <ChevronRight className="w-4 h-4" />}
                                </>
                            )}
                        </button>
                    </motion.div>
                ))}
            </div>

            <div className="mt-24 max-w-3xl mx-auto text-center px-4">
                <div className="p-8 rounded-3xl bg-[#1a2332]/5 border border-[#1a2332]/10">
                    <h4 className="text-xl font-bold font-serif text-[#1a2332] mb-4">Enterprise Grade Security</h4>
                    <p className="text-[#1a2332]/50 text-sm leading-relaxed">
                        Every JurisQuery subscription includes bank-level encryption, localized document processing, 
                        and private vector database instances. Your legal documents never leave your secure environment.
                    </p>
                </div>
            </div>
        </div>
    );
}
