"use client";

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Clock, Bell, ArrowLeft, Shield, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface ComingSoonModalProps {
    isOpen: boolean;
    onClose: () => void;
    featureName?: string;
}

export default function ComingSoonModal({ 
    isOpen, 
    onClose, 
    featureName = "Professional Tier" 
}: ComingSoonModalProps) {
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
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md" />
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
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 sm:p-8 text-left align-middle shadow-2xl border border-slate-100 transition-all">
                                <div className="absolute top-6 right-6">
                                    <button
                                        onClick={onClose}
                                        className="p-2 rounded-full text-slate-300 hover:text-slate-500 hover:bg-slate-50 transition-all"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="flex flex-col items-center text-center">
                                    <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-[#2a3b4e] to-[#1a2332] flex items-center justify-center mb-6 shadow-xl shadow-[#2a3b4e]/20">
                                        <Clock className="w-10 h-10 text-white" />
                                    </div>

                                    <Dialog.Title as="h3" className="text-2xl font-bold font-serif text-[#1a1a1a] mb-3">
                                        {featureName} Coming Soon
                                    </Dialog.Title>
                                    
                                    <p className="text-[#1a1a1a]/60 text-[15px] leading-relaxed mb-8 font-medium">
                                        We're currently finalizing our professional tier for the Indian market. 
                                        Advanced synthesis, unlimited folders, and priority analysis are just around the corner.
                                    </p>

                                    <div className="w-full bg-[#f7f3f1] rounded-lg p-6 mb-8 text-left border border-[#2a3b4e]/5">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-8 h-8 rounded-lg bg-[#2a3b4e]/10 flex items-center justify-center">
                                                <Sparkles className="w-4 h-4 text-[#2a3b4e]" />
                                            </div>
                                            <span className="text-sm font-bold text-[#1a1a1a]">State of the art RAG</span>
                                        </div>
                                        <ul className="space-y-3">
                                            {[
                                                "Secure Razorpay/Stripe Integration",
                                                "GST Compliant Invoicing",
                                                "Priority Legal LLM Clusters",
                                                "Enterprise Document Privacy"
                                            ].map((item) => (
                                                <li key={item} className="flex items-center gap-2 text-[13px] text-[#1a1a1a]/50 font-medium">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-[#2a3b4e]/30" />
                                                    {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="w-full flex flex-col gap-3">
                                        <button
                                            onClick={onClose}
                                            className="w-full py-4 bg-[#2a3b4e] text-white rounded-lg font-bold text-sm shadow-xl shadow-[#2a3b4e]/20 hover:bg-[#1a2332] transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                                        >
                                            <Bell className="w-4 h-4" />
                                            Notify Me on Launch
                                        </button>
                                        <button
                                            onClick={onClose}
                                            className="w-full py-3 text-[#1a1a1a]/40 text-[13px] font-bold hover:text-[#1a1a1a]/70 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <ArrowLeft className="w-4 h-4" />
                                            Back to Dashboard
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
