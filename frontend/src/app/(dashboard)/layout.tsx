"use client";

import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import { Menu, X, Scale } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="flex flex-col md:flex-row h-screen bg-[#f7f3f1] overflow-hidden">
            {/* Mobile Header */}
            <header className="md:hidden flex items-center justify-between px-6 py-4 bg-[#0f172a] text-white shadow-lg z-30">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#d97706] to-[#f59e0b] flex items-center justify-center shadow-sm">
                        <Scale className="h-4 w-4 text-white" />
                    </div>
                    <h1 className="text-xl font-bold font-serif tracking-tight">JurisQuery</h1>
                </div>
                <button 
                    onClick={() => setIsSidebarOpen(true)}
                    className="p-2 -mr-2 rounded-lg hover:bg-white/10 transition-all active:scale-95"
                >
                    <Menu className="h-6 w-6" />
                </button>
            </header>

            {/* Sidebar with Mobile Support */}
            <div className="relative">
                {/* Mobile Overlay */}
                <AnimatePresence>
                    {isSidebarOpen && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsSidebarOpen(false)}
                            className="fixed inset-0 z-[60] bg-[#020617]/60 backdrop-blur-sm md:hidden"
                        />
                    )}
                </AnimatePresence>

                {/* Sidebar Drawer Container */}
                <div 
                    className={`fixed inset-y-0 left-0 z-[70] md:sticky md:z-0 transform transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) md:translate-x-0 ${
                        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
                >
                    <div className="h-full relative shadow-3xl">
                        {/* Mobile Close Button (Inside Sidebar) */}
                        <button 
                            onClick={() => setIsSidebarOpen(false)}
                            className="md:hidden absolute top-8 right-6 p-2 text-white/40 hover:text-white transition-colors z-[80]"
                        >
                            <X className="h-6 w-6" />
                        </button>
                        <Sidebar onClose={() => setIsSidebarOpen(false)} />
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto relative bg-[#fcfaf9]">
                <div className="min-h-full p-6 md:p-8 lg:p-12">
                    <div className="max-w-[1600px] mx-auto">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}
