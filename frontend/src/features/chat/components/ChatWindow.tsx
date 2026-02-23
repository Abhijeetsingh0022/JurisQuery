'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Send,
    Loader2,
    AlertCircle,
    FileText,
    RefreshCw,
    History,
    ChevronDown,
    MessageSquare,
    Trash2,
    Sparkles,
    BookOpen,
    Scale,
    Plus
} from 'lucide-react';
import {
    getChatSessions,
    getChatSession,
    createChatSession,
    deleteChatSession,
    sendMessage as sendChatMessage
} from '@/services/ragService';
import type { Citation, ChatSession } from '@/types/api.types';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    citations?: Citation[];
    timestamp: Date;
}

interface ChatWindowProps {
    documentId: string;
    onCitationClick?: (citation: Citation) => void;
}

export default function ChatWindow({ documentId, onCitationClick }: ChatWindowProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [allSessions, setAllSessions] = useState<ChatSession[]>([]);
    const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowHistoryDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchSessions = useCallback(async () => {
        try {
            const response = await getChatSessions(documentId, 0, 50);
            setAllSessions(response.sessions || []);
        } catch (err) {
            console.error('Failed to fetch sessions:', err);
        }
    }, [documentId]);

    const loadSession = useCallback(async (targetSessionId: string) => {
        setIsInitializing(true);
        setError(null);
        setShowHistoryDropdown(false);

        try {
            const sessionDetail = await getChatSession(targetSessionId);
            setSessionId(targetSessionId);

            if (sessionDetail.messages && sessionDetail.messages.length > 0) {
                const loadedMessages: Message[] = sessionDetail.messages.map((msg: any) => ({
                    id: msg.id,
                    role: msg.role as 'user' | 'assistant',
                    content: msg.content,
                    citations: msg.citations,
                    timestamp: new Date(msg.created_at),
                }));
                setMessages(loadedMessages);
            } else {
                setMessages([]);
            }
        } catch (err) {
            console.error('Failed to load session:', err);
            setError('Failed to load session');
        } finally {
            setIsInitializing(false);
        }
    }, []);

    const initSession = useCallback(async () => {
        if (!documentId) return;
        setIsInitializing(true);
        setError(null);

        try {
            const sessionsResponse = await getChatSessions(documentId, 0, 50);
            setAllSessions(sessionsResponse.sessions || []);

            if (sessionsResponse.sessions && sessionsResponse.sessions.length > 0) {
                const latestSession = sessionsResponse.sessions[0];
                await loadSession(latestSession.id);
            } else {
                const newSession = await createChatSession(documentId);
                setSessionId(newSession.id);
                setAllSessions([newSession]);
                setIsInitializing(false);
            }
        } catch (err) {
            console.error('Failed to initialize chat session:', err);
            setError('Failed to load chat session. Please refresh.');
            setIsInitializing(false);
        }
    }, [documentId, loadSession]);

    useEffect(() => {
        initSession();
    }, [initSession]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading || !sessionId) return;

        const isFirstMessage = messages.length === 0;

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
            const response = await sendChatMessage(sessionId, userMessage.content);

            const assistantMessage: Message = {
                id: response.id || `assistant-${Date.now()}`,
                role: 'assistant',
                content: response.content,
                citations: response.citations ?? undefined,
                timestamp: new Date(response.created_at || Date.now()),
            };

            setMessages((prev) => [...prev, assistantMessage]);

            if (isFirstMessage) {
                await fetchSessions();
            }
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

    const handleNewSession = async () => {
        try {
            setIsInitializing(true);
            setMessages([]);
            setShowHistoryDropdown(false);
            const newSession = await createChatSession(documentId);
            setSessionId(newSession.id);
            setAllSessions((prev) => [newSession, ...prev]);
        } catch (err) {
            setError('Failed to create new session');
        } finally {
            setIsInitializing(false);
        }
    };

    const handleDeleteSession = async (targetSessionId: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (confirm('Are you sure you want to delete this conversation?')) {
            try {
                const updatedSessions = allSessions.filter((s) => s.id !== targetSessionId);
                setAllSessions(updatedSessions);

                await deleteChatSession(targetSessionId);

                if (targetSessionId === sessionId) {
                    if (updatedSessions.length > 0) {
                        await loadSession(updatedSessions[0].id);
                    } else {
                        await handleNewSession();
                    }
                }
            } catch (err) {
                console.error('Failed to delete session:', err);
                setError('Failed to delete session');
            }
        }
    };

    const formatSessionDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    if (isInitializing) {
        return (
            <div className="flex flex-col h-full bg-[#fdfcfb] items-center justify-center">
                <div className="w-10 h-10 rounded-xl bg-[#f7f3f1] flex items-center justify-center mb-3">
                    <Loader2 className="h-5 w-5 animate-spin text-[#2a3b4e]/30" />
                </div>
                <span className="text-[12px] text-[#2a3b4e]/30 font-medium">Loading conversation…</span>
            </div>
        );
    }

    const sortedSessions = [...allSessions].sort((a, b) => {
        if (a.id === sessionId) return -1;
        if (b.id === sessionId) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return (
        <div className="flex flex-col h-full bg-[#fdfcfb]">
            {/* Chat Header */}
            <div className="relative z-50 flex items-center justify-between px-5 py-3 border-b border-[#e8e2de] bg-[#faf8f6] flex-none">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2a3b4e] to-[#4a6b8e] flex items-center justify-center">
                            <Sparkles className="h-3.5 w-3.5 text-white" />
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#faf8f6]" />
                    </div>
                    <div>
                        <h2 className="text-[13px] font-bold text-[#1a2332]">AI Document Analyst</h2>
                        <span className="text-[10px] text-emerald-600 font-medium">Ready to analyze</span>
                    </div>
                </div>

                {/* History Dropdown */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setShowHistoryDropdown(!showHistoryDropdown)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${showHistoryDropdown
                            ? 'bg-white text-[#1a2332] ring-1 ring-[#e8e2de] shadow-sm'
                            : 'text-[#2a3b4e]/40 hover:text-[#2a3b4e] hover:bg-white'
                            }`}
                    >
                        <History className="h-3.5 w-3.5" />
                        History
                        <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${showHistoryDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                        {showHistoryDropdown && (
                            <motion.div
                                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                                transition={{ duration: 0.15 }}
                                className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl shadow-[#2a3b4e]/10 border border-[#e8e2de] z-50 overflow-hidden"
                            >
                                {/* Dropdown header */}
                                <div className="px-4 py-3 bg-[#faf8f6] border-b border-[#e8e2de] flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <MessageSquare className="h-3.5 w-3.5 text-[#2a3b4e]/40" />
                                        <span className="text-[11px] font-bold text-[#2a3b4e]/50 uppercase tracking-wider">Conversations</span>
                                    </div>
                                    <span className="bg-[#2a3b4e] text-white px-1.5 py-0.5 rounded-full text-[9px] font-bold min-w-[18px] text-center">
                                        {allSessions.length}
                                    </span>
                                </div>

                                {/* Sessions list */}
                                <div className="max-h-64 overflow-y-auto p-1.5">
                                    {sortedSessions.length === 0 ? (
                                        <div className="flex flex-col items-center py-8 px-4">
                                            <div className="w-10 h-10 rounded-xl bg-[#f7f3f1] flex items-center justify-center mb-2.5">
                                                <MessageSquare className="h-4 w-4 text-[#2a3b4e]/15" />
                                            </div>
                                            <p className="text-[12px] font-medium text-[#2a3b4e]/30">No conversations yet</p>
                                        </div>
                                    ) : (
                                        sortedSessions.map((session, index) => (
                                            <motion.div
                                                key={session.id}
                                                initial={{ opacity: 0, x: -6 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.02 }}
                                                onClick={() => loadSession(session.id)}
                                                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all group text-left cursor-pointer ${session.id === sessionId
                                                    ? 'bg-[#2a3b4e] text-white shadow-md shadow-[#2a3b4e]/15'
                                                    : 'hover:bg-[#f7f3f1]'
                                                    }`}
                                            >
                                                <div className={`p-1.5 rounded-md shrink-0 ${session.id === sessionId ? 'bg-white/15' : 'bg-[#f7f3f1] group-hover:bg-[#2a3b4e]/5'
                                                    }`}>
                                                    <MessageSquare className={`h-3 w-3 ${session.id === sessionId ? 'text-white/80' : 'text-[#2a3b4e]/25'}`} />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className={`text-[12px] font-medium truncate ${session.id === sessionId ? 'text-white' : 'text-[#1a2332]'}`}>
                                                        {session.title || 'New conversation'}
                                                    </p>
                                                    <p className={`text-[10px] mt-0.5 ${session.id === sessionId ? 'text-white/50' : 'text-[#2a3b4e]/25'}`}>
                                                        {formatSessionDate(session.created_at)}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={(e) => handleDeleteSession(session.id, e)}
                                                    className={`p-1.5 rounded-md transition-all opacity-0 group-hover:opacity-100 ${session.id === sessionId
                                                        ? 'text-white/40 hover:text-white hover:bg-white/10'
                                                        : 'text-[#2a3b4e]/20 hover:text-red-500 hover:bg-red-50'
                                                        }`}
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            </motion.div>
                                        ))
                                    )}
                                </div>

                                {/* New chat button */}
                                <div className="p-2 border-t border-[#e8e2de]">
                                    <button
                                        onClick={handleNewSession}
                                        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-[12px] font-semibold text-[#2a3b4e] bg-[#f7f3f1] hover:bg-[#eee8e4] rounded-lg transition-all"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        New Conversation
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
                {messages.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="flex flex-col items-center justify-center h-full text-center"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2a3b4e] to-[#4a6b8e] flex items-center justify-center mb-5 shadow-xl shadow-[#2a3b4e]/20">
                            <Sparkles className="h-8 w-8 text-white" />
                        </div>
                        <h3 className="text-xl font-serif font-bold text-[#1a2332] mb-2">
                            Ask about this document
                        </h3>
                        <p className="text-[13px] text-[#2a3b4e]/35 max-w-sm leading-relaxed">
                            I&apos;ll analyze every clause and provide citation-backed answers with page references.
                        </p>
                        <div className="flex items-center gap-4 mt-6 text-[#2a3b4e]/20">
                            {[
                                { icon: BookOpen, label: 'Citations' },
                                { icon: Scale, label: 'Analysis' },
                                { icon: FileText, label: 'Summaries' },
                            ].map(({ icon: Icon, label }) => (
                                <div key={label} className="flex items-center gap-1.5">
                                    <Icon className="h-3.5 w-3.5" />
                                    <span className="text-[10px] font-medium">{label}</span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-8 flex flex-wrap justify-center gap-2">
                            {['Summarize this document', 'Key terms & clauses', 'Find obligations'].map((q) => (
                                <button
                                    key={q}
                                    onClick={() => setInput(q)}
                                    className="px-3.5 py-2 text-[11px] font-medium text-[#1a2332]/60 bg-white rounded-lg border border-[#e8e2de] hover:border-[#2a3b4e]/15 hover:text-[#1a2332] hover:shadow-sm transition-all"
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                ) : (
                    <AnimatePresence mode="popLayout">
                        {messages.map((message) => (
                            <motion.div
                                key={message.id}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                layout
                                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                {message.role === 'user' ? (
                                    <div className="bg-gradient-to-r from-[#2a3b4e] to-[#3d5a80] text-white px-4 py-3 rounded-2xl rounded-br-md shadow-md shadow-[#2a3b4e]/10 max-w-[80%]">
                                        <p className="text-[13px] leading-relaxed">{message.content}</p>
                                    </div>
                                ) : (
                                    <div className="flex gap-3 max-w-[90%]">
                                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#2a3b4e] to-[#4a6b8e] flex items-center justify-center shrink-0 mt-1 shadow-sm">
                                            <Sparkles className="h-3 w-3 text-white" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="bg-white border border-[#e8e2de] rounded-2xl rounded-bl-md px-4 py-3.5 shadow-sm">
                                                <p className="text-[13px] leading-relaxed text-[#1a2332]/80 whitespace-pre-wrap">
                                                    {message.content}
                                                </p>

                                                {/* Citations */}
                                                {message.citations && message.citations.length > 0 && (
                                                    <div className="mt-3 pt-3 border-t border-[#e8e2de]/50">
                                                        <p className="text-[9px] font-bold uppercase tracking-wider text-[#2a3b4e]/20 mb-2 flex items-center gap-1">
                                                            <FileText className="h-2.5 w-2.5" />
                                                            Sources
                                                        </p>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {message.citations.map((citation) => (
                                                                <button
                                                                    key={citation.chunk_id}
                                                                    onClick={() => onCitationClick?.(citation)}
                                                                    className="group inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold rounded-md bg-[#f7f3f1] hover:bg-amber-50 text-[#2a3b4e]/50 hover:text-amber-700 ring-1 ring-[#e8e2de] hover:ring-amber-200 transition-all"
                                                                >
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 group-hover:scale-110 transition-transform" />
                                                                    Page {citation.page_number || '?'}, Para {citation.paragraph_number || '?'}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}

                {/* Loading indicator */}
                {isLoading && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                        <div className="flex gap-3">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#2a3b4e] to-[#4a6b8e] flex items-center justify-center shrink-0 shadow-sm">
                                <Sparkles className="h-3 w-3 text-white" />
                            </div>
                            <div className="bg-white border border-[#e8e2de] rounded-xl px-4 py-3 flex items-center gap-2.5 shadow-sm">
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#2a3b4e]/30" />
                                <div>
                                    <span className="text-[11px] font-medium text-[#1a2332]/40 block">Analyzing document…</span>
                                    <span className="text-[9px] text-[#2a3b4e]/20">Searching citations</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Error */}
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 text-red-600 border border-red-100 text-[13px]"
                    >
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span className="font-medium">{error}</span>
                    </motion.div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="flex-none p-4 border-t border-[#e8e2de] bg-white">
                <form onSubmit={handleSubmit}>
                    <div className="flex items-center gap-3 bg-[#faf8f6] border border-[#e8e2de] rounded-xl px-4 py-2 focus-within:bg-white focus-within:border-[#2a3b4e]/20 focus-within:ring-2 focus-within:ring-[#2a3b4e]/5 focus-within:shadow-sm transition-all duration-200">
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask a question about your document…"
                            rows={1}
                            className="flex-1 bg-transparent text-[13px] focus:outline-none text-[#1a2332] placeholder:text-[#2a3b4e]/20 resize-none h-8 pt-1.5"
                            disabled={isLoading || !sessionId}
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading || !sessionId}
                            className="p-2 rounded-lg bg-gradient-to-r from-[#2a3b4e] to-[#3d5a80] text-white disabled:opacity-20 disabled:cursor-not-allowed hover:shadow-md hover:shadow-[#2a3b4e]/15 transition-all shrink-0 active:scale-95"
                        >
                            <Send className="h-3.5 w-3.5" />
                        </button>
                    </div>
                    <p className="text-center mt-2 text-[9px] text-[#2a3b4e]/15 font-medium">
                        AI-generated analysis · Responses include page citations
                    </p>
                </form>
            </div>
        </div>
    );
}
