"use client";

import { motion } from "framer-motion";
import { FileText, Database, MessageSquare, CheckCircle2 } from "lucide-react";

const steps = [
    {
        id: "01",
        title: "Upload",
        description: "Drag & drop your PDF, DOCX, or TXT files into the secure vault.",
        icon: FileText,
    },
    {
        id: "02",
        title: "Process",
        description: "Our AI cleans, chunks, and vectorizes your document for deep understanding.",
        icon: Database,
    },
    {
        id: "03",
        title: "Analyze",
        description: "Chat naturally. Ask complex questions and get instant, accurate answers.",
        icon: MessageSquare,
    },
    {
        id: "04",
        title: "Verify",
        description: "Click citations to instantly verify answers against the original text.",
        icon: CheckCircle2,
    },
];

export function HowItWorks() {
    return (
        <section id="how-it-works" className="py-24 bg-primary text-primary-foreground relative overflow-hidden">
            {/* Background texture/pattern could go here */}

            <div className="container mx-auto px-4 md:px-6 relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-20">
                    <motion.span
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="text-primary-foreground/60 font-semibold tracking-wider text-sm uppercase mb-3 block"
                    >
                        Workflow
                    </motion.span>
                    <motion.h2
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-3xl md:text-5xl font-serif font-bold text-white mb-6"
                    >
                        From Documents to Insights <br /> in Seconds
                    </motion.h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
                    {/* Connecting line for desktop */}
                    <div className="hidden md:block absolute top-[2.5rem] left-[12%] right-[12%] h-[2px] bg-white/10 z-0">
                        <motion.div
                            initial={{ width: "0%" }}
                            whileInView={{ width: "100%" }}
                            viewport={{ once: true }}
                            transition={{ duration: 1.5, ease: "easeInOut", delay: 0.2 }}
                            className="h-full bg-gradient-to-r from-transparent via-white/50 to-transparent"
                        />
                    </div>

                    {steps.map((step, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.15 }}
                            className="relative z-10 flex flex-col items-center text-center"
                        >
                            <div className="w-20 h-20 rounded-full bg-white text-primary flex items-center justify-center mb-6 shadow-lg text-xl font-bold border-4 border-primary/20">
                                <step.icon size={32} />
                            </div>
                            <div className="text-5xl font-serif font-bold text-white/10 absolute -top-4 -right-4 select-none">
                                {step.id}
                            </div>
                            <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                            <p className="text-primary-foreground/70 text-sm leading-relaxed max-w-[200px]">
                                {step.description}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
