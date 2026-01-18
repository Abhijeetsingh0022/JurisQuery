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
        <div className="flex flex-col h-full bg-white dark:bg-gray-900">
            {/* Header */}
            <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
                        <Sparkles className="h-4 w-4 text-white" />
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">JurisQuery AI</h2>
                        <p className="text-xs text-gray-500">Ask questions about your document</p>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-12"
                    >
                        <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center mb-4">
                            <Sparkles className="h-8 w-8 text-blue-500" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                            Start a conversation
                        </h3>
                        <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
                            Ask any question about your legal document and get instant answers with citations.
                        </p>
                        <div className="mt-6 flex flex-wrap justify-center gap-2">
                            {['What are the key terms?', 'Find indemnification clauses', 'Summarize this contract'].map((q) => (
                                <button
                                    key={q}
                                    onClick={() => setInput(q)}
                                    className="px-3 py-1.5 text-sm rounded-full border border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                ) : (
                    <AnimatePresence>
                        {messages.map((message, index) => (
                            <motion.div
                                key={message.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${message.role === 'user'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                                        }`}
                                >
                                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                                    {/* Citations */}
                                    {message.citations && message.citations.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-gray-200/20 dark:border-gray-700">
                                            <p className="text-xs font-medium opacity-70 mb-2">Sources:</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {message.citations.map((citation, i) => (
                                                    <button
                                                        key={citation.chunk_id}
                                                        onClick={() => onCitationClick?.(citation)}
                                                        className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 transition-colors"
                                                    >
                                                        <FileText className="h-3 w-3" />
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
                        <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3">
                            <div className="flex items-center gap-2 text-gray-500">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-sm">Analyzing document...</span>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Error message */}
                {error && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm"
                    >
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        {error}
                    </motion.div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700">
                <form onSubmit={handleSubmit} className="relative">
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask a question about your document..."
                        rows={1}
                        className="w-full resize-none rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
                    >
                        <Send className="h-4 w-4" />
                    </button>
                </form>
                <p className="mt-2 text-xs text-gray-500 text-center">
                    JurisQuery AI can make mistakes. Verify important information.
                </p>
            </div>
        </div>
    );
}
