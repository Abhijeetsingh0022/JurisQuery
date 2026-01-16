"use client";

import { motion } from "framer-motion";
import { Shield, Lock, FileKey, Server, Eye, FileCheck } from "lucide-react";

const securityFeatures = [
    {
        title: "Bank-Grade Encryption",
        description: "All data is encrypted at rest (AES-256) and in transit (TLS 1.3). Your documents are as secure as your financial data.",
        icon: Lock
    },
    {
        title: "SOC 2 Type II Compliant",
        description: "We adhere to the strictest industry standards for security, availability, and confidentiality.",
        icon: FileCheck
    },
    {
        title: "Strict Access Controls",
        description: "Role-Based Access Control (RBAC) ensures only authorized personnel can view sensitive legal documents.",
        icon: FileKey
    },
    {
        title: "Data Sovereignty",
        description: "Choose where your data resides. We offer regional hosting options in US, EU, and APAC.",
        icon: Server
    },
    {
        title: "Privacy First",
        description: "We never train our base models on your client data. Your inputs belong to you, always.",
        icon: Eye
    },
    {
        title: "Continuous Monitoring",
        description: "24/7 automated threat detection and regular third-party penetration testing.",
        icon: Shield
    }
];

export default function SecurityPage() {
    return (
        <div className="bg-background min-h-screen pt-32 pb-20">
            <div className="container mx-auto px-4 md:px-6">
                <div className="text-center max-w-3xl mx-auto mb-20">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center justify-center p-3 bg-green-100 rounded-full mb-6"
                    >
                        <Shield className="w-8 h-8 text-green-700" />
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl md:text-6xl font-serif font-bold text-primary mb-6"
                    >
                        Uncompromising Security
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-xl text-foreground/70"
                    >
                        We understand that in law, confidentiality is currency. JurisQuery is built from the ground up to protect your client privilege.
                    </motion.p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {securityFeatures.map((feature, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                        >
                            <div className="w-12 h-12 bg-primary/5 rounded-xl flex items-center justify-center text-primary mb-6">
                                <feature.icon size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-primary mb-3">{feature.title}</h3>
                            <p className="text-foreground/70">{feature.description}</p>
                        </motion.div>
                    ))}
                </div>

                {/* Compliance Badge Section */}
                <div className="mt-24 pt-12 border-t border-gray-200 text-center">
                    <span className="text-sm font-semibold text-foreground/50 uppercase tracking-widest mb-8 block">Trusted by Compliance Leaders</span>
                    <div className="flex flex-wrap justify-center gap-12 opacity-60 grayscale">
                        {/* Text placeholders for badges for now */}
                        <span className="text-2xl font-bold">SOC2</span>
                        <span className="text-2xl font-bold">GDPR</span>
                        <span className="text-2xl font-bold">HIPAA</span>
                        <span className="text-2xl font-bold">ISO 27001</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
