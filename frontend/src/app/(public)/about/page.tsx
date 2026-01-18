"use client";

import { motion } from "framer-motion";

export default function AboutPage() {
    return (
        <div className="bg-background min-h-screen pt-32 pb-20">
            <div className="container mx-auto px-4 max-w-4xl">
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-4xl md:text-5xl font-serif font-bold text-primary mb-8 text-center"
                >
                    About JurisQuery
                </motion.h1>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="prose prose-lg mx-auto text-foreground/80"
                >
                    <p className="lead text-xl text-center mb-12">
                        We are a team of legal professionals and AI engineers dedicated to solving the "information overload" problem in modern litigation and transactional work.
                    </p>

                    <h3>Our Mission</h3>
                    <p>
                        To democratize access to high-end legal intelligence. We believe that every lawyer, regardless of firm size, should have the power of a dedicated research team at their fingertips.
                    </p>

                    <h3>Why We Built This</h3>
                    <p>
                        Reviewing contracts and case files is the backbone of legal work, but it is slow, error-prone, and expensive. Large language models (LLMs) promised a revolution, but hallucinations made them dangerous for legal use.
                    </p>
                    <p>
                        JurisQuery bridges this gap. By combining vector search with generative AI (RAG), we ensure that every answer is **grounded in your documents**. No guessing. No inventing cases. Just pure, citation-backed analysis.
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
