"use client";

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Sparkles, Check, Zap, ArrowRight, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
    limitName?: string;
}

export default function UpgradeModal({ 
    isOpen, 
    onClose, 
    title = "Upgrade to Pro", 
    description = "You've reached the limit of your current plan. Upgrade to Pro for unlimited access and advanced features.",
    limitName
}: UpgradeModalProps) {
    const router = useRouter();

    const handleUpgrade = () => {
        onClose();
        router.push('/subscription');
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[60]" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95 translate-y-4"
                            enterTo="opacity-100 scale-100 translate-y-0"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100 translate-y-0"
                            leaveTo="opacity-0 scale-95 translate-y-4"
                        >
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-[2.5rem] bg-white p-8 text-left align-middle shadow-2xl border border-slate-100 transition-all">
                                <div className="absolute top-6 right-6">
                                    <button
                                        onClick={onClose}
                                        className="p-2 rounded-full text-slate-300 hover:text-slate-500 hover:bg-slate-50 transition-all"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="flex flex-col items-center text-center">
                                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#d97706] to-[#f59e0b] flex items-center justify-center mb-6 shadow-xl shadow-[#d97706]/20">
                                        <Sparkles className="w-10 h-10 text-white" />
                                    </div>

                                    <Dialog.Title as="h3" className="text-2xl font-bold font-serif text-[#1a1a1a] mb-3">
                                        {limitName ? `Unlock Unlimited ${limitName}` : title}
                                    </Dialog.Title>
                                    
                                    <p className="text-[#1a1a1a]/50 text-[15px] leading-relaxed mb-8 font-medium">
                                        {description}
                                    </p>

                                    <div className="w-full bg-[#f7f3f1] rounded-2xl p-6 mb-8 text-left border border-[#2a3b4e]/5">
                                        <p className="text-[10px] font-bold text-[#1a1a1a]/30 uppercase tracking-widest mb-4">Pro Plan Features</p>
                                        <div className="space-y-3">
                                            {[
                                                "Unlimited Document Uploads",
                                                "Unlimited AI Legal Analysis",
                                                "Advanced Synthesis (Branched RAG)",
                                                "Priority LLM Processing",
                                                "Priority Support"
                                            ].map((feature) => (
                                                <div key={feature} className="flex items-center gap-3">
                                                    <div className="w-5 h-5 rounded-full bg-[#d97706]/10 flex items-center justify-center shrink-0">
                                                        <Check className="w-3 h-3 text-[#d97706]" />
                                                    </div>
                                                    <span className="text-[13px] font-bold text-[#1a1a1a]/70">{feature}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="w-full flex flex-col gap-3">
                                        <button
                                            onClick={handleUpgrade}
                                            className="w-full py-4 bg-[#2a3b4e] text-white rounded-2xl font-bold text-sm shadow-xl shadow-[#2a3b4e]/20 hover:bg-[#1a2332] transition-all flex items-center justify-center gap-2 group active:scale-[0.98]"
                                        >
                                            <Zap className="w-4 h-4 fill-[#d97706] text-[#d97706] group-hover:animate-pulse" />
                                            Upgrade to Pro
                                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </button>
                                        <button
                                            onClick={onClose}
                                            className="w-full py-3 text-[#1a1a1a]/40 text-[13px] font-bold hover:text-[#1a1a1a]/70 transition-colors"
                                        >
                                            Maybe Later
                                        </button>
                                    </div>

                                    <div className="mt-6 flex items-center gap-2 text-[10px] font-bold text-[#1a1a1a]/20 uppercase tracking-widest">
                                        <Shield className="w-3 h-3" />
                                        <span>Secure Legal Research Environment</span>
                                    </div>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
