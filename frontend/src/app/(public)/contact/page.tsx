"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/common/Button";
import { Mail, MapPin, Phone } from "lucide-react";
import { FormEvent } from "react";

export default function ContactPage() {
    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        // TODO: Implement form submission logic (email service integration)
        alert("Thank you for your message! We'll get back to you soon.");
    };

    return (
        <div className="bg-background min-h-screen pt-32 pb-20">
            <div className="container mx-auto px-4 max-w-6xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    {/* Contact Info */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <h1 className="text-4xl md:text-5xl font-serif font-bold text-primary mb-6">
                            Get in Touch
                        </h1>
                        <p className="text-xl text-foreground/70 mb-12">
                            Have questions about our Enterprise plans or need a custom demo? We'd love to hear from you.
                        </p>

                        <div className="space-y-8">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-primary/5 rounded-lg text-primary">
                                    <Mail size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-primary">Email Us</h3>
                                    <p className="text-foreground/70">support@jurisquery.ai</p>
                                    <p className="text-foreground/70">sales@jurisquery.ai</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-primary/5 rounded-lg text-primary">
                                    <Phone size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-primary">Call Us</h3>
                                    <p className="text-foreground/70">+1 (555) 123-4567</p>
                                    <p className="text-sm text-foreground/50">Mon-Fri, 9am-6pm EST</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-primary/5 rounded-lg text-primary">
                                    <MapPin size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-primary">Visit Us</h3>
                                    <p className="text-foreground/70">100 Legal Tech Blvd, Suite 400</p>
                                    <p className="text-foreground/70">New York, NY 10001</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Form */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100"
                    >
                        <form className="space-y-6" onSubmit={handleSubmit}>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground/80">First Name</label>
                                    <input type="text" required className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" placeholder="Jane" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground/80">Last Name</label>
                                    <input type="text" required className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" placeholder="Doe" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground/80">Work Email</label>
                                <input type="email" required className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" placeholder="jane@lawfirm.com" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground/80">Message</label>
                                <textarea required className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-h-[150px]" placeholder="Tell us about your firm's needs..." />
                            </div>
                            <Button type="submit" className="w-full h-12 text-lg font-semibold shadow-lg">
                                Send Message
                            </Button>
                        </form>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
