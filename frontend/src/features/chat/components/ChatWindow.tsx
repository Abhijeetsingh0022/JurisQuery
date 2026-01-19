'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, Sparkles, AlertCircle, FileText } from 'lucide-react';
import { sendMessage, queryDocument } from '@/services/ragService';
import type { ChatMessage, Citation } from '@/types/api.types';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    citations?: Citation[];
    timestamp: Date;
}

interface ChatWindowProps {
    documentId: string;
    sessionId?: string;
    onCitationClick?: (citation: Citation) => void;
}

export default function ChatWindow({ documentId, sessionId, onCitationClick }: ChatWindowProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
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
        setError(null);

        try {
            // Use direct RAG query for now (can switch to session-based)
            const response = await queryDocument(documentId, userMessage.content);

            const assistantMessage: Message = {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: response.answer,
                citations: response.citations,
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, assistantMessage]);
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to get response';
            setError(errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#f7f3f1]">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center h-full pb-20"
                    >
                        <div className="w-20 h-20 rounded-2xl bg-white shadow-lg flex items-center justify-center mb-6 rotate-3 transform transition-transform hover:rotate-0">
                            <Sparkles className="h-10 w-10 text-[#2a3b4e]" />
                        </div>
                        <h3 className="text-2xl font-serif font-bold text-[#2a3b4e] mb-3">
                            Start a conversation
                        </h3>
                        <p className="text-base font-sans text-gray-600 max-w-md text-center leading-relaxed">
                            Ask any question about your legal document. I'll analyze every clause and provide citation-backed answers.
                        </p>
                        <div className="mt-8 flex flex-wrap justify-center gap-3">
                            {['What are the key terms?', 'Find indemnification clauses', 'Summarize this contract'].map((q) => (
                                <button
                                    key={q}
                                    onClick={() => setInput(q)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-xl shadow-sm border border-gray-100 hover:border-[#2a3b4e]/30 hover:shadow-md transition-all duration-300 transform hover:-translate-y-0.5"
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                ) : (
                    <AnimatePresence mode="popLayout">
                        {messages.map((message, index) => (
                            <motion.div
                                key={message.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                layout
                                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`relative max-w-[85%] rounded-2xl px-5 py-4 shadow-sm ${message.role === 'user'
                                        ? 'bg-[#2a3b4e] text-white rounded-br-none'
                                        : 'bg-white text-gray-900 rounded-bl-none border border-gray-100'
                                        }`}
                                >
                                    <p className="text-[15px] leading-relaxed whitespace-pre-wrap font-sans">
                                        {message.content}
                                    </p>

                                    {/* Citations */}
                                    {message.citations && message.citations.length > 0 && (
                                        <div className="mt-4 pt-3 border-t border-gray-100">
                                            <p className="text-xs font-semibold uppercase tracking-wider opacity-60 mb-2 flex items-center gap-1">
                                                <FileText className="h-3 w-3" />
                                                Sources
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {message.citations.map((citation, i) => (
                                                    <button
                                                        key={citation.chunk_id}
                                                        onClick={() => onCitationClick?.(citation)}
                                                        className="group inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-gray-50 hover:bg-amber-50 text-gray-600 hover:text-amber-700 border border-gray-200 hover:border-amber-200 transition-all"
                                                    >
                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 group-hover:scale-110 transition-transform" />
                                                        Page {citation.page_number || '?'}, Para {citation.paragraph_number || '?'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}

                {/* Loading indicator */}
                {isLoading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex justify-start"
                    >
                        <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-none px-5 py-4 shadow-sm">
                            <div className="flex items-center gap-3 text-gray-500">
                                <div className="flex gap-1">
                                    <motion.div
                                        className="w-1.5 h-1.5 bg-[#2a3b4e] rounded-full"
                                        animate={{ scale: [1, 1.5, 1] }}
                                        transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                                    />
                                    <motion.div
                                        className="w-1.5 h-1.5 bg-[#2a3b4e] rounded-full"
                                        animate={{ scale: [1, 1.5, 1] }}
                                        transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                                    />
                                    <motion.div
                                        className="w-1.5 h-1.5 bg-[#2a3b4e] rounded-full"
                                        animate={{ scale: [1, 1.5, 1] }}
                                        transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                                    />
                                </div>
                                <span className="text-xs font-medium tracking-wide uppercase">Analyzing</span>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Error message */}
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 p-4 rounded-xl bg-red-50 text-red-700 border border-red-100 shadow-sm"
                    >
                        <AlertCircle className="h-5 w-5 flex-shrink-0" />
                        <p className="text-sm font-medium">{error}</p>
                    </motion.div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="flex-shrink-0 p-6 bg-white border-t border-gray-200/50 shadow-[0_-4px_20px_rgba(0,0,0,0.02)] z-10">
                <form onSubmit={handleSubmit} className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask a question about your document..."
                        rows={1}
                        className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50/50 px-5 py-4 pr-14 text-sm focus:outline-none focus:ring-2 focus:ring-[#2a3b4e]/10 focus:border-[#2a3b4e]/30 focus:bg-white transition-all placeholder:text-gray-400"
                        disabled={isLoading}
                        style={{ minHeight: '52px', maxHeight: '150px' }}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-xl bg-[#2a3b4e] text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#1f2b3a] hover:shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95"
                    >
                        <Send className="h-4 w-4" />
                    </button>
                </form>
                <div className="mt-3 flex items-center justify-center gap-2 text-[10px] text-gray-400 font-medium tracking-wide uppercase">
                    <Sparkles className="h-3 w-3" />
                    <span>AI-Powered Analysis</span>
                </div>
            </div>
        </div>
    );
}
