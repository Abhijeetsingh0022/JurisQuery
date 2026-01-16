"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/common/Button";
import { Check } from "lucide-react";

const plans = [
    {
        name: "Starter",
        price: "$0",
        description: "Perfect for individuals trying out AI legal analysis.",
        features: [
            "5 Document uploads per month",
            "Basic RAG Analysis",
            "PDF & TXT Export",
            "Community Support"
        ],
        cta: "Start Free",
        popular: false
    },
    {
        name: "Professional",
        price: "$49",
        period: "/month",
        description: "For solo practitioners and small firms needing power.",
        features: [
            "Unlimited Document uploads",
            "Advanced RAG (GPT-4o)",
            "Priority Processing",
            "Citation Verification",
            "Email Support"
        ],
        cta: "Get Professional",
        popular: true
    },
    {
        name: "Enterprise",
        price: "Custom",
        description: "For large firms requiring security & custom integration.",
        features: [
            "Everything in Professional",
            "SSO & SOC2 Compliance",
            "Custom Fine-tuning",
            "Dedicated Account Manager",
            "API Access"
        ],
        cta: "Contact Sales",
        popular: false
    }
];

export default function PricingPage() {
    return (
        <div className="bg-background min-h-screen pt-32 pb-20">
            <div className="container mx-auto px-4">
                {/* Header */}
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h1 className="text-4xl md:text-6xl font-serif font-bold text-primary mb-6">
                        Transparent, Simple Pricing
                    </h1>
                    <p className="text-xl text-foreground/70">
                        Choose the plan that fits your practice. No hidden fees.
                    </p>
                </div>

                {/* Pricing Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {plans.map((plan, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`relative p-8 rounded-2xl border ${plan.popular
                                    ? "border-primary bg-primary text-primary-foreground shadow-2xl scale-105 z-10"
                                    : "border-gray-200 bg-white text-foreground hover:shadow-xl transition-shadow"
                                }`}
                        >
                            {plan.popular && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold shadow-md">
                                    Most Popular
                                </div>
                            )}

                            <h3 className={`text-2xl font-bold mb-2 ${plan.popular ? "text-white" : "text-primary"}`}>
                                {plan.name}
                            </h3>
                            <p className={`text-sm mb-6 ${plan.popular ? "text-primary-foreground/80" : "text-foreground/60"}`}>
                                {plan.description}
                            </p>

                            <div className="mb-8">
                                <span className="text-4xl font-bold">{plan.price}</span>
                                {plan.period && <span className={`text-sm ${plan.popular ? "text-primary-foreground/70" : "text-foreground/60"}`}>{plan.period}</span>}
                            </div>

                            <Button
                                className={`w-full mb-8 rounded-xl font-semibold h-12 ${plan.popular
                                        ? "bg-white text-primary hover:bg-gray-100"
                                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                                    }`}
                            >
                                {plan.cta}
                            </Button>

                            <div className="space-y-4">
                                {plan.features.map((feature, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className={`p-0.5 rounded-full ${plan.popular ? "bg-white/20 text-white" : "bg-primary/10 text-primary"}`}>
                                            <Check size={14} />
                                        </div>
                                        <span className={`text-sm ${plan.popular ? "text-primary-foreground/90" : "text-foreground/80"}`}>
                                            {feature}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}
