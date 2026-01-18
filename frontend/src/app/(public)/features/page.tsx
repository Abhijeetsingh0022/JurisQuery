"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/common/Button";
import { ArrowRight, Brain, FileSearch, Scale, ShieldCheck, Zap } from "lucide-react";

const features = [
    {
        title: "Advanced RAG Technology",
        description: "Our Retrieval-Augmented Generation engine doesn't just guess. It retrieves the exact paragraphs from your documents to ground every answer in reality.",
        icon: Brain,
        image: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=2565&auto=format&fit=crop" // Placeholder for abstract tech/AI image
    },
    {
        title: "Instant Contract Analysis",
        description: "Upload 100+ page contracts and get summaries, risk assessments, and clause extractions in seconds, not hours.",
        icon: FileSearch,
        image: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=3270&auto=format&fit=crop" // Placeholder for document/analysis image
    },
    {
        title: "Citation-Backed Truth",
        description: "Trust but verify. Every claim made by JurisQuery comes with a clickable citation that takes you directly to the source text.",
        icon: Scale,
        image: "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=3200&auto=format&fit=crop" // Placeholder for legal/truth image
    }
];

export default function FeaturesPage() {
    return (
        <div className="bg-background min-h-screen">
            {/* Hero Section */}
            <section className="pt-32 pb-20 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-primary/5 to-transparent z-0" />
                <div className="container mx-auto px-4 relative z-10 text-center">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-5xl md:text-7xl font-serif font-bold text-primary mb-6"
                    >
                        Capabilities that <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-600 to-primary bg-size-200 animate-gradient">Redefine Legal Work</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-xl text-foreground/70 max-w-2xl mx-auto mb-10"
                    >
                        Beyond simple keyword search. Understand, analyze, and extract insights from your legal documents with unprecedented accuracy.
                    </motion.p>
                </div>
            </section>

            {/* Feature Blocks */}
            <section className="py-20">
                <div className="container mx-auto px-4">
                    {features.map((feature, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.7 }}
                            className={`flex flex-col ${index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"} items-center gap-12 mb-32`}
                        >
                            <div className="flex-1 w-full">
                                <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl border border-primary/10 group">
                                    <div className="absolute inset-0 bg-primary/20 group-hover:bg-transparent transition-colors duration-500 z-10" />
                                    {/* Using a colored div as placeholder if image fails, or the actual image */}
                                    <div
                                        className="w-full h-full bg-cover bg-center hover:scale-105 transition-transform duration-700"
                                        style={{ backgroundImage: `url(${feature.image})` }}
                                    />
                                </div>
                            </div>
                            <div className="flex-1 w-full space-y-6">
                                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
                                    <feature.icon size={32} />
                                </div>
                                <h2 className="text-3xl md:text-4xl font-serif font-bold text-primary">{feature.title}</h2>
                                <p className="text-lg text-foreground/70 leading-relaxed">
                                    {feature.description}
                                </p>
                                <div className="pt-4">
                                    <Button variant="outline" className="gap-2 group">
                                        Learn more <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 bg-primary text-primary-foreground relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
                <div className="container mx-auto px-4 text-center relative z-10">
                    <h2 className="text-4xl md:text-5xl font-serif font-bold mb-8">Ready to modernize your practice?</h2>
                    <p className="text-xl text-primary-foreground/80 mb-10 max-w-2xl mx-auto">
                        Join thousands of legal professionals who trust JurisQuery for their document analysis.
                    </p>
                    <Button size="lg" className="bg-white text-primary hover:bg-gray-100 shadow-xl text-lg h-14 px-10 rounded-full">
                        Get Started Now
                    </Button>
                </div>
            </section>
        </div>
    );
}
