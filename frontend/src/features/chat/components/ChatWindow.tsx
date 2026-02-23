'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, Sparkles, AlertCircle, FileText, RefreshCw, History, ChevronDown, MessageSquare, Trash2 } from 'lucide-react';
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

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowHistoryDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch all sessions for this document
    const fetchSessions = useCallback(async () => {
        try {
            const response = await getChatSessions(documentId, 0, 50);
            setAllSessions(response.sessions || []);
        } catch (err) {
            console.error('Failed to fetch sessions:', err);
        }
    }, [documentId]);

    // Load a specific session
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

    // Initialize or resume session
    const initSession = useCallback(async () => {
        if (!documentId) return;

        setIsInitializing(true);
        setError(null);

        try {
            // Fetch all sessions
            const sessionsResponse = await getChatSessions(documentId, 0, 50);
            setAllSessions(sessionsResponse.sessions || []);

            if (sessionsResponse.sessions && sessionsResponse.sessions.length > 0) {
                // Resume most recent session
                const latestSession = sessionsResponse.sessions[0];
                await loadSession(latestSession.id);
            } else {
                // Create new session
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
        // Prevent event from bubbling up to the session selection
        e.preventDefault();
        e.stopPropagation();

        if (confirm('Are you sure you want to delete this conversation?')) {
            try {
                // Optimistic update
                const previousSessions = [...allSessions];
                const updatedSessions = allSessions.filter((s) => s.id !== targetSessionId);
                setAllSessions(updatedSessions);

                await deleteChatSession(targetSessionId);

                // If we deleted the current session, switch to another or create new
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
                // Revert on error (could implement full rollback here if needed)
                // For now, refreshing the list would be safer, but we'll leave it simple
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

    // Show initialization state
    if (isInitializing) {
        return (
            <div className="flex flex-col h-full bg-[#f7f3f1] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#2a3b4e] mb-4" />
                <p className="text-sm text-gray-500 font-medium">Loading conversation...</p>
            </div>
        );
    }

    // Sort sessions: Active session first, then by date desc
    const sortedSessions = [...allSessions].sort((a, b) => {
        if (a.id === sessionId) return -1;
        if (b.id === sessionId) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return (
        <div className="flex flex-col h-full bg-[#f7f3f1]">
            {/* Header with History & New Chat */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200/50 bg-white/50 backdrop-blur-sm">
                {/* History Dropdown */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setShowHistoryDropdown(!showHistoryDropdown)}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-[#2a3b4e] hover:bg-gradient-to-r hover:from-[#2a3b4e]/5 hover:to-transparent rounded-xl transition-all duration-300 group"
                    >
                        <div className="p-1.5 bg-gradient-to-br from-[#2a3b4e]/10 to-[#2a3b4e]/5 rounded-lg group-hover:from-[#2a3b4e]/20 group-hover:to-[#2a3b4e]/10 transition-all">
                            <History className="h-3.5 w-3.5" />
                        </div>
                        <span className="font-medium text-sm">History</span>
                        <ChevronDown className={`h-3.5 w-3.5 text-[#2a3b4e]/50 transition-transform duration-300 ${showHistoryDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                        {showHistoryDropdown && (
                            <motion.div
                                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                                className="absolute top-full left-0 mt-2 w-80 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-[#2a3b4e]/10 border border-white/50 z-50 overflow-hidden"
                            >
                                {/* Header with gradient */}
                                <div className="px-5 py-4 bg-gradient-to-r from-[#2a3b4e]/5 to-transparent border-b border-gray-100/80">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-gradient-to-br from-[#2a3b4e] to-[#1f2b3a] rounded-lg shadow-sm">
                                                <MessageSquare className="h-3.5 w-3.5 text-white" />
                                            </div>
                                            <span className="text-sm font-semibold text-[#2a3b4e]">Conversations</span>
                                        </div>
                                        <span className="px-2 py-0.5 text-[10px] font-bold text-[#2a3b4e]/60 bg-[#2a3b4e]/10 rounded-full">
                                            {allSessions.length}
                                        </span>
                                    </div>
                                </div>

                                {/* Sessions list */}
                                <div className="max-h-72 overflow-y-auto p-2">
                                    {sortedSessions.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-8 px-4">
                                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center mb-3">
                                                <MessageSquare className="h-5 w-5 text-gray-300" />
                                            </div>
                                            <p className="text-sm font-medium text-gray-400">No conversations yet</p>
                                            <p className="text-xs text-gray-300 mt-1">Start chatting to see history</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-1">
                                            {sortedSessions.map((session, index) => (
                                                <motion.div
                                                    key={session.id}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: index * 0.03 }}
                                                    onClick={() => loadSession(session.id)}
                                                    className={`group flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all duration-200 ${session.id === sessionId
                                                        ? 'bg-gradient-to-r from-[#2a3b4e] to-[#3a4d62] shadow-lg shadow-[#2a3b4e]/20'
                                                        : 'hover:bg-gray-50/80'
                                                        }`}
                                                >
                                                    {/* Icon */}
                                                    <div className={`p-2 rounded-lg shrink-0 transition-all ${session.id === sessionId
                                                        ? 'bg-white/20'
                                                        : 'bg-gradient-to-br from-gray-100 to-gray-50 group-hover:from-[#2a3b4e]/10 group-hover:to-transparent'
                                                        }`}>
                                                        <MessageSquare className={`h-4 w-4 ${session.id === sessionId ? 'text-white' : 'text-gray-400 group-hover:text-[#2a3b4e]'}`} />
                                                    </div>

                                                    {/* Content */}
                                                    <div className="min-w-0 flex-1">
                                                        <p className={`text-sm font-medium truncate ${session.id === sessionId ? 'text-white' : 'text-gray-700'}`}>
                                                            {session.title || 'New conversation'}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className={`inline-block w-1 h-1 rounded-full ${session.id === sessionId ? 'bg-emerald-300' : 'bg-gray-300'}`} />
                                                            <p className={`text-[11px] ${session.id === sessionId ? 'text-white/70' : 'text-gray-400'}`}>
                                                                {formatSessionDate(session.created_at)}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Delete button */}
                                                    <button
                                                        onClick={(e) => handleDeleteSession(session.id, e)}
                                                        className={`p-2 rounded-lg transition-all duration-200 z-10 ${session.id === sessionId
                                                            ? 'text-white/50 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100'
                                                            : 'text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100'
                                                            }`}
                                                        title="Delete conversation"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </motion.div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Footer with new chat button */}
                                <div className="p-3 border-t border-gray-100/80 bg-gradient-to-r from-gray-50/50 to-transparent">
                                    <button
                                        onClick={handleNewSession}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-[#2a3b4e] bg-gradient-to-r from-[#2a3b4e]/5 to-transparent hover:from-[#2a3b4e]/10 rounded-xl transition-all duration-200 group"
                                    >
                                        <RefreshCw className="h-4 w-4 group-hover:rotate-180 transition-transform duration-500" />
                                        Start New Conversation
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

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
                        {messages.map((message) => (
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
                                                {message.citations.map((citation) => (
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
                        disabled={isLoading || !sessionId}
                        style={{ minHeight: '52px', maxHeight: '150px' }}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading || !sessionId}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-xl bg-[#2a3b4e] text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#1f2b3a] hover:shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95"
                    >
                        <Send className="h-4 w-4" />
                    </button>
                </form>
            </div>
        </div>
    );
}
