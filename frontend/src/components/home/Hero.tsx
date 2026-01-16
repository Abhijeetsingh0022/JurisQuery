"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/common/Button";
import { ArrowRight } from "lucide-react";

export function Hero() {
    return (
        <section className="relative pt-32 pb-24 md:pt-48 md:pb-32 overflow-hidden bg-background">
            {/* Premium Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-primary/5 rounded-full blur-[100px] opacity-40 animate-pulse" />
                <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-400/10 rounded-full blur-[80px] opacity-30" />
            </div>

            <div className="container mx-auto px-4 md:px-6 relative z-10">
                <div className="flex flex-col items-center text-center max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="mb-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 backdrop-blur-sm border border-primary/10 text-primary shadow-sm"
                    >
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                        </span>
                        <span className="text-sm font-semibold tracking-wide">Next-Gen Legal AI</span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="text-5xl md:text-7xl lg:text-8xl font-serif font-bold text-primary tracking-tight leading-[1.05] mb-8"
                    >
                        Your Intelligent <br className="hidden md:block" />
                        <span className="relative inline-block">
                            <span className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 to-primary/20 blur-xl"></span>
                            <span className="relative text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-600 to-primary bg-size-200 animate-gradient">
                                Legal Assistant.
                            </span>
                        </span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="text-xl md:text-2xl text-foreground/70 mb-12 max-w-2xl leading-relaxed font-light"
                    >
                        Simplify complex document analysis. Upload contracts, ask questions, and get <span className="text-foreground font-medium">citation-backed answers</span> in seconds.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="flex flex-col sm:flex-row gap-5 w-full sm:w-auto"
                    >
                        <Button size="lg" className="h-14 px-8 rounded-full text-lg shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/30 transition-all duration-300 hover:-translate-y-1">
                            Start Analyzing Free
                            <ArrowRight className="ml-2 w-5 h-5" />
                        </Button>
                        <Button variant="outline" size="lg" className="h-14 px-8 rounded-full text-lg border-2 hover:bg-surface transition-all duration-300">
                            View Demo
                        </Button>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
