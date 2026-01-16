"use client";

import { motion } from "framer-motion";
import { LayoutDashboard, UploadCloud, SplitSquareHorizontal, Quote, Share2 } from "lucide-react";

const features = [
    {
        title: "Smart Dashboard",
        description: "A clean, minimalistic command center showing your recent activity, saved queries, and analysis history at a glance.",
        icon: LayoutDashboard,
    },
    {
        title: "Drag-and-Drop Upload",
        description: "Seamlessly upload PDF, DOCX, or TXT files. Visual progress tracking from cleaning to vectorization.",
        icon: UploadCloud,
    },
    {
        title: "Split-Screen Analysis",
        description: "Read your document on the left while chatting with AI on the right. Never lose context while you query.",
        icon: SplitSquareHorizontal,
    },
    {
        title: "Citation Highlights",
        description: "Every AI answer is backed by evidence. Click a citation to auto-scroll to the exact source paragraph.",
        icon: Quote,
    },
    {
        title: "Export & Share",
        description: "Generate formatted PDF reports or share chat summaries via email with a single click.",
        icon: Share2,
    },
];

export function Features() {
    return (
        <section id="features" className="py-24 bg-surface text-foreground relative z-10">
            <div className="container mx-auto px-4 md:px-6">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <motion.span
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-primary font-semibold tracking-wider text-sm uppercase mb-3 block"
                    >
                        Capabilities
                    </motion.span>
                    <motion.h2
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-3xl md:text-5xl font-serif font-bold text-primary mb-6"
                    >
                        Powerful Features for Legal Minds
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="text-lg text-foreground/70"
                    >
                        JurisQuery combines a sleek interface with powerful RAG technology to transform how you interact with legal documents.
                    </motion.p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((feature, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            whileHover={{ y: -5 }}
                            className="group relative p-8 rounded-2xl bg-white/50 backdrop-blur-sm border border-gray-100 hover:border-primary/20 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                            <div className="relative z-10 w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 text-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                <feature.icon size={28} className="drop-shadow-sm" />
                            </div>

                            <h3 className="relative z-10 text-xl font-serif font-bold text-primary mb-3 group-hover:text-blue-700 transition-colors">
                                {feature.title}
                            </h3>

                            <p className="relative z-10 text-foreground/70 leading-relaxed group-hover:text-foreground/90 transition-colors">
                                {feature.description}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
