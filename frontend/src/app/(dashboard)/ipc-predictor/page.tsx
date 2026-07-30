'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Scale,
    Send,
    Shield,
    Clock,
    Building2,
    ChevronRight,
    Loader2,
    FileText,
    Sparkles,
    AlertCircle,
    User,
    ArrowLeft
} from 'lucide-react';
import { useApi } from '@/hooks/use-api';

interface PredictedSection {
    section: {
        section_number: string;
        offense: string | null;
        punishment: string | null;
        cognizable: boolean | null;
        bailable: boolean | null;
    };
    confidence: number;
    reasoning: string;
    relevant_excerpt: string | null;
}

interface PredictionResponse {
    predicted_sections: PredictedSection[];
    query: string;
    total_sections_searched: number;
    processing_time_ms: number;
    error?: string | null;
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content?: string;
    prediction?: PredictionResponse;
    timestamp: Date;
}

export default function IPCPredictorPage() {
    const { fetcher } = useApi();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

    const router = useRouter(); // Initialized useRouter

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handlePredict = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: input.trim(),
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const data = await fetcher('/api/v1/ipc/predict', {
                method: 'POST',
                body: JSON.stringify({
                    description: userMessage.content,
                    max_sections: 5,
                }),
            });

            const assistantMessage: Message = {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                prediction: data.error ? undefined : data,
                content: data.error ? `Error: ${data.error}` : undefined,
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, assistantMessage]);
        } catch (err) {
            const errorMessage: Message = {
                id: `error-${Date.now()}`,
                role: 'assistant',
                content: err instanceof Error ? err.message : 'An error occurred while analyzing.',
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handlePredict();
        }
    };

    const toggleSection = (messageId: string, sectionNumber: string) => {
        const key = `${messageId}-${sectionNumber}`;
        setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const getConfidenceColor = (confidence: number) => {
        if (confidence >= 0.8) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
        if (confidence >= 0.6) return 'text-amber-600 bg-amber-50 border-amber-100';
        return 'text-orange-600 bg-orange-50 border-orange-100';
    };

    return (
        <div className="h-[calc(100vh)] -m-8 bg-[#f7f3f1] flex flex-col overflow-hidden">
            <main className="flex-1 flex flex-col overflow-hidden w-full max-w-[1920px] mx-auto">
                {/* Header with Title and Back Button Logic */}
                <div className="px-4 py-4 flex-none">
                    <header className="h-18 bg-white/80 backdrop-blur-md border border-white/20 rounded-2xl flex items-center justify-between px-6 shadow-sm z-20 transition-all hover:shadow-md hover:bg-white/90">
                        <div className="flex items-center gap-4 py-3">
                            <button
                                onClick={() => router.back()}
                                className="p-2.5 bg-[#f7f3f1] hover:bg-[#2a3b4e] hover:text-white rounded-xl transition-all duration-300 text-[#2a3b4e] group shadow-sm"
                            >
                                <ArrowLeft className="h-5 w-5 group-hover:-translate-x-0.5 transition-transform" />
                            </button>
                            <div className="min-w-0 flex flex-col">
                                <h1 className="text-lg font-serif font-bold text-[#2a3b4e] truncate max-w-xl tracking-tight">
                                    IPC Section Predictor
                                </h1>
                                <p className="text-[10px] text-[#2a3b4e]/60 flex items-center gap-2 font-medium uppercase tracking-widest mt-0.5">
                                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#2a3b4e] shadow-[0_0_8px_rgba(42,59,78,0.4)]" />
                                    AI Legal Criminologist
                                </p>
                            </div>
                        </div>
                    </header>
                </div>

                {/* Main Content - Chat Panel */}
                <div className="flex-1 flex overflow-hidden px-4 pb-4">
                    <div className="flex-1 flex flex-col h-full bg-white rounded-2xl shadow-sm border border-[#2a3b4e]/5 overflow-hidden relative hover:border-[#2a3b4e]/10 transition-colors">
                        {/* Chat Area */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scroll-smooth">
                            {messages.length === 0 ? (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex flex-col items-center justify-center h-full pb-20 text-center"
                                >
                                    <div className="w-20 h-20 rounded-2xl bg-white shadow-xl flex items-center justify-center mb-6 rotate-3">
                                        <Scale className="h-10 w-10 text-[#2a3b4e]" />
                                    </div>
                                    <h2 className="text-2xl font-serif font-bold text-[#2a3b4e] mb-3">
                                        Describe the incident
                                    </h2>
                                    <p className="text-gray-600 max-w-md leading-relaxed">
                                        I can analyze criminal incidents, identify potential IPC sections, and explain the legal reasoning.
                                    </p>

                                    <div className="mt-8 grid gap-3 w-full max-w-md">
                                        {[
                                            'Identify offenses for a jewelry theft at night',
                                            'What sections apply to online fraud?',
                                            'Explain charges for causing hurt during a fight'
                                        ].map((suggestion) => (
                                            <button
                                                key={suggestion}
                                                onClick={() => {
                                                    setInput(suggestion);
                                                    inputRef.current?.focus();
                                                }}
                                                className="p-3 text-sm text-left font-medium text-gray-600 bg-white/60 hover:bg-white border border-white/40 hover:border-[#2a3b4e]/20 rounded-xl transition-all shadow-sm hover:shadow-md"
                                            >
                                                "{suggestion}"
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            ) : (
                                messages.map((msg) => (
                                    <motion.div
                                        key={msg.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className={`max-w-[90%] md:max-w-[80%] ${msg.role === 'user' ? 'ml-auto' : ''}`}>
                                            {msg.role === 'user' ? (
                                                <div className="bg-[#2a3b4e] text-white px-5 py-3.5 rounded-2xl rounded-tr-sm shadow-md">
                                                    <p className="text-sm md:text-[15px] leading-relaxed whitespace-pre-wrap">
                                                        {msg.content}
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="flex gap-4">
                                                    <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0 mt-1">
                                                        <Scale className="h-4 w-4 text-[#2a3b4e]" />
                                                    </div>

                                                    <div className="flex-1 space-y-2">
                                                        {/* AI Response Card */}
                                                        {msg.prediction ? (
                                                            <div className="bg-white/80 backdrop-blur-sm rounded-2xl rounded-tl-sm border border-white/40 shadow-sm overflow-hidden">
                                                                {/* Header */}
                                                                <div className="bg-[#2a3b4e]/5 px-5 py-3 border-b border-[#2a3b4e]/5 flex items-center justify-between">
                                                                    <span className="text-xs font-bold text-[#2a3b4e] uppercase tracking-wider">
                                                                        Analysis Result
                                                                    </span>
                                                                    <span className="text-xs font-medium text-[#2a3b4e]/60 bg-white px-2 py-0.5 rounded-full shadow-sm">
                                                                        {msg.prediction.predicted_sections.length} Sections Found
                                                                    </span>
                                                                </div>

                                                                {/* Prediction List */}
                                                                <div className="p-2 space-y-2">
                                                                    {msg.prediction.predicted_sections.map((pred) => (
                                                                        <div
                                                                            key={pred.section.section_number}
                                                                            className="bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-md transition-shadow duration-200"
                                                                        >
                                                                            {/* Section Header */}
                                                                            <div
                                                                                className="p-4 cursor-pointer"
                                                                                onClick={() => toggleSection(msg.id, pred.section.section_number)}
                                                                            >
                                                                                <div className="flex items-start justify-between gap-4">
                                                                                    <div className="flex items-center gap-3">
                                                                                        <div className="w-10 h-10 rounded-lg bg-[#2a3b4e] flex items-center justify-center shrink-0">
                                                                                            <span className="text-white font-bold text-sm">
                                                                                                {pred.section.section_number}
                                                                                            </span>
                                                                                        </div>
                                                                                        <div>
                                                                                            <h3 className="font-bold text-[#2a3b4e] text-sm md:text-base">
                                                                                                IPC Section {pred.section.section_number}
                                                                                            </h3>
                                                                                            <p className="text-xs text-[#2a3b4e]/60 font-medium">
                                                                                                {pred.section.offense || 'Unspecified Offense'}
                                                                                            </p>
                                                                                        </div>
                                                                                    </div>

                                                                                    <div className={`px-2.5 py-1 rounded-lg border text-xs font-bold ${getConfidenceColor(pred.confidence)}`}>
                                                                                        {(pred.confidence * 100).toFixed(0)}% Match
                                                                                    </div>
                                                                                </div>

                                                                                {/* Quick Reasoning */}
                                                                                <p className="mt-3 text-sm text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-100 italic">
                                                                                    "{pred.reasoning}"
                                                                                </p>

                                                                                <div className="mt-3 flex items-center gap-2 text-xs font-medium text-[#2a3b4e]/50">
                                                                                    <span>Show details</span>
                                                                                    <ChevronRight className={`h-3 w-3 transition-transform duration-300 ${expandedSections[`${msg.id}-${pred.section.section_number}`] ? 'rotate-90' : ''}`} />
                                                                                </div>
                                                                            </div>

                                                                            {/* Expanded Details */}
                                                                            <AnimatePresence>
                                                                                {expandedSections[`${msg.id}-${pred.section.section_number}`] && (
                                                                                    <motion.div
                                                                                        initial={{ height: 0, opacity: 0 }}
                                                                                        animate={{ height: 'auto', opacity: 1 }}
                                                                                        exit={{ height: 0, opacity: 0 }}
                                                                                        className="border-t border-gray-100 bg-[#fafafa]"
                                                                                    >
                                                                                        <div className="p-4 grid grid-cols-2 gap-3 text-xs">
                                                                                            <div className="bg-white p-2.5 rounded-lg border border-gray-100 shadow-sm">
                                                                                                <div className="flex items-center gap-1.5 text-[#2a3b4e]/60 mb-1">
                                                                                                    <Shield className="h-3 w-3" />
                                                                                                    <span className="font-semibold uppercase tracking-wider">Classification</span>
                                                                                                </div>
                                                                                                <span className={`font-medium ${pred.section.cognizable ? 'text-red-600' : 'text-emerald-600'}`}>
                                                                                                    {pred.section.cognizable ? 'Cognizable' : 'Non-Cognizable'}
                                                                                                </span>
                                                                                            </div>
                                                                                            <div className="bg-white p-2.5 rounded-lg border border-gray-100 shadow-sm">
                                                                                                <div className="flex items-center gap-1.5 text-[#2a3b4e]/60 mb-1">
                                                                                                    <Building2 className="h-3 w-3" />
                                                                                                    <span className="font-semibold uppercase tracking-wider">Bail Status</span>
                                                                                                </div>
                                                                                                <span className={`font-medium ${pred.section.bailable ? 'text-emerald-600' : 'text-red-600'}`}>
                                                                                                    {pred.section.bailable ? 'Bailable' : 'Non-Bailable'}
                                                                                                </span>
                                                                                            </div>
                                                                                            <div className="col-span-2 bg-white p-2.5 rounded-lg border border-gray-100 shadow-sm">
                                                                                                <div className="flex items-center gap-1.5 text-[#2a3b4e]/60 mb-1">
                                                                                                    <Clock className="h-3 w-3" />
                                                                                                    <span className="font-semibold uppercase tracking-wider">Punishment</span>
                                                                                                </div>
                                                                                                <span className="text-gray-700 font-medium">
                                                                                                    {pred.section.punishment}
                                                                                                </span>
                                                                                            </div>

                                                                                            {pred.relevant_excerpt && (
                                                                                                <div className="col-span-2 mt-2">
                                                                                                    <div className="flex items-center gap-1.5 text-[#2a3b4e]/60 mb-1.5">
                                                                                                        <FileText className="h-3 w-3" />
                                                                                                        <span className="font-semibold uppercase tracking-wider">Legal Text</span>
                                                                                                    </div>
                                                                                                    <p className="text-gray-600 bg-white p-3 rounded-lg border border-gray-100 leading-relaxed font-serif">
                                                                                                        {pred.relevant_excerpt}
                                                                                                    </p>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    </motion.div>
                                                                                )}
                                                                            </AnimatePresence>
                                                                        </div>
                                                                    ))}
                                                                </div>

                                                                {/* Footer Info */}
                                                                <div className="px-5 py-3 bg-white/50 border-t border-white/60 flex items-center justify-between text-[10px] text-gray-400">
                                                                    <span>Processed in {msg.prediction.processing_time_ms.toFixed(0)}ms</span>
                                                                    <span className="flex items-center gap-1">
                                                                        <Sparkles className="h-3 w-3" />
                                                                        AI Analysis
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            /* Error Message within Bubble */
                                                            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-2xl rounded-tl-sm border border-red-100 text-sm">
                                                                {msg.content}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                ))
                            )}

                            {isLoading && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex justify-start"
                                >
                                    <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm flex items-center gap-3 text-gray-500">
                                        <Loader2 className="h-4 w-4 animate-spin text-[#2a3b4e]" />
                                        <span className="text-xs font-medium tracking-wide uppercase">Analyzing Criminology...</span>
                                    </div>
                                </motion.div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="flex-shrink-0 p-6 bg-white border-t border-gray-200/50 shadow-[0_-4px_20px_rgba(0,0,0,0.02)] z-10 relative">
                            <div className="absolute inset-x-0 -top-12 h-12 bg-gradient-to-t from-[#ffffff] to-transparent pointer-events-none" />
                            <div className="relative max-w-4xl mx-auto">
                                <textarea
                                    ref={inputRef}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Describe the incident (e.g., House break-in at night...)"
                                    rows={1}
                                    className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50/50 px-5 py-4 pr-14 text-sm focus:outline-none focus:ring-2 focus:ring-[#2a3b4e]/10 focus:border-[#2a3b4e]/30 focus:bg-white transition-all placeholder:text-gray-400"
                                    disabled={isLoading}
                                    style={{ minHeight: '56px', maxHeight: '150px' }}
                                />
                                <button
                                    onClick={() => handlePredict()}
                                    disabled={!input.trim() || isLoading}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-xl bg-[#2a3b4e] text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#1f2b3a] hover:shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95"
                                >
                                    <Send className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="text-center mt-2 text-[10px] text-gray-400">
                                AI generated information. Verify with legal counsel.
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
