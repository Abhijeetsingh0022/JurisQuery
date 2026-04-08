'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft, Loader2, AlertCircle, FolderOpen,
    FileText, MessageSquare, Sparkles, BookOpen
} from 'lucide-react';
import Link from 'next/link';
import { useApi } from '@/hooks/use-api';
import { motion, AnimatePresence } from 'framer-motion';
import {
    getChatSessions,
    getChatSession,
    createFolderChatSession,
    deleteChatSession,
    streamMessage,
} from '@/services/ragService';
import type { Citation, ChatSession } from '@/types/api.types';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    citations?: Citation[];
    timestamp: Date;
}

export default function FolderChatPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { fetcher } = useApi();

    // Folder data
    const [folder, setFolder] = useState<any>(null);
    const [folderLoading, setFolderLoading] = useState(true);

    // Chat state
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [streamingContent, setStreamingContent] = useState<string | null>(null);
    const [isInitializing, setIsInitializing] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [allSessions, setAllSessions] = useState<ChatSession[]>([]);
    const abortRef = useRef<AbortController | null>(null);

    // Load folder info
    useEffect(() => {
        if (!id) return;
        (async () => {
            try {
                const data = await fetcher(`/api/folders/${id}`);
                setFolder(data);
            } catch {
                setFolder(null);
            } finally {
                setFolderLoading(false);
            }
        })();
    }, [id, fetcher]);

    // Init session
    const initSession = useCallback(async () => {
        if (!id) return;
        setIsInitializing(true);
        try {
            const sessionsRes = await getChatSessions(undefined, 0, 50);
            // Filter to folder sessions
            const folderSessions = (sessionsRes.sessions || []).filter(
                (s: any) => s.folder_id === id
            );
            setAllSessions(folderSessions);

            if (folderSessions.length > 0) {
                const detail = await getChatSession(folderSessions[0].id);
                setSessionId(folderSessions[0].id);
                if (detail.messages && detail.messages.length > 0) {
                    setMessages(
                        detail.messages.map((m: any) => ({
                            id: m.id,
                            role: m.role as 'user' | 'assistant',
                            content: m.content,
                            citations: m.citations,
                            timestamp: new Date(m.created_at),
                        }))
                    );
                }
            } else {
                const newSession = await createFolderChatSession(id);
                setSessionId(newSession.id);
                setAllSessions([newSession]);
            }
        } catch (err) {
            setError('Failed to load chat session. Please refresh.');
        } finally {
            setIsInitializing(false);
        }
    }, [id]);

    useEffect(() => { initSession(); }, [initSession]);

    const handleSubmit = (e: React.FormEvent) => {
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
        const userContent = input.trim();
        setInput('');
        setIsLoading(true);
        setStreamingContent('');
        setError(null);

        abortRef.current = streamMessage(
            sessionId,
            userContent,
            (token) => setStreamingContent((prev) => (prev ?? '') + token),
            () => {
                setStreamingContent((prev) => {
                    if (prev) {
                        setMessages((msgs) => [
                            ...msgs,
                            {
                                id: `assistant-${Date.now()}`,
                                role: 'assistant',
                                content: prev,
                                timestamp: new Date(),
                            },
                        ]);
                    }
                    return null;
                });
                setIsLoading(false);
            },
            (errMsg) => setError(errMsg),
        );
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e as any);
        }
    };

    const docs = folder?.documents ?? [];
    const docCount = docs.length;

    const getStatusDot = (status: string) => {
        if (status === 'ready') return 'bg-emerald-500';
        if (status === 'failed') return 'bg-red-500';
        return 'bg-amber-500 animate-pulse';
    };

    if (folderLoading) {
        return (
            <div className="h-screen -m-8 bg-[#fdfcfb] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#2a3b4e] to-[#4a6b8e] flex items-center justify-center shadow-xl shadow-[#2a3b4e]/20">
                        <Loader2 className="h-6 w-6 animate-spin text-white" />
                    </div>
                    <p className="text-[14px] font-semibold text-[#1a2332]">Loading folder…</p>
                </div>
            </div>
        );
    }

    if (!folder) {
        return (
            <div className="h-screen -m-8 bg-[#fdfcfb] flex items-center justify-center">
                <div className="text-center max-w-sm">
                    <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-5">
                        <AlertCircle className="h-7 w-7 text-red-400" />
                    </div>
                    <h1 className="text-lg font-bold text-[#1a2332] mb-2">Folder Not Found</h1>
                    <Link href="/documents" className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#2a3b4e] to-[#3d5a80] text-white rounded-xl text-sm font-semibold mt-4">
                        <ArrowLeft className="h-4 w-4" /> Back to Documents
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh)] -m-8 bg-[#fdfcfb] flex flex-col overflow-hidden">
            <main className="flex-1 flex flex-col overflow-hidden w-full max-w-[1920px] mx-auto">
                {/* Top Header */}
                <div className="px-4 pt-4 pb-2 flex-none">
                    <div className="bg-white rounded-xl border border-[#e8e2de] flex items-center justify-between px-5 py-3 shadow-sm">
                        <div className="flex items-center gap-3.5 min-w-0">
                            <button
                                onClick={() => router.back()}
                                className="p-2 rounded-lg hover:bg-[#f7f3f1] text-[#2a3b4e]/40 hover:text-[#2a3b4e] transition-all ring-1 ring-transparent hover:ring-[#e8e2de] shrink-0"
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </button>
                            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#2a3b4e] to-[#4a6b8e] flex items-center justify-center shrink-0 shadow-sm">
                                <FolderOpen className="h-4 w-4 text-white" />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-[14px] font-bold text-[#1a2332] truncate max-w-lg">{folder.name}</h1>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                        <span className="text-[10px] font-semibold text-[#2a3b4e]/30 uppercase tracking-wider">
                                            Branched RAG
                                        </span>
                                    </div>
                                    <span className="text-[#2a3b4e]/10">·</span>
                                    <span className="text-[10px] text-[#2a3b4e]/25 font-medium">
                                        {docCount} document{docCount !== 1 ? 's' : ''} indexed
                                    </span>
                                </div>
                            </div>
                        </div>
                        <Link
                            href={`/folders/${id}`}
                            className="flex items-center gap-2 px-3 py-2 text-[12px] font-medium text-[#2a3b4e]/50 hover:text-[#2a3b4e] rounded-lg hover:bg-[#f7f3f1] transition-all border border-transparent hover:border-[#e8e2de]"
                        >
                            <BookOpen className="h-3.5 w-3.5" />
                            View Folder
                        </Link>
                    </div>
                </div>

                {/* Split View */}
                <div className="flex-1 flex overflow-hidden px-4 pb-4 pt-2 gap-3">
                    {/* Left: Document Sidebar */}
                    <div className="w-72 shrink-0 bg-white rounded-xl border border-[#e8e2de] shadow-sm overflow-hidden flex flex-col">
                        <div className="px-4 py-3 border-b border-[#e8e2de] bg-[#faf8f6]">
                            <h2 className="text-[10px] font-bold text-[#2a3b4e]/30 uppercase tracking-wider">Sources</h2>
                            <p className="text-[11px] text-[#2a3b4e]/25 mt-0.5">Answers synthesized across all</p>
                        </div>

                        {/* Branched RAG Badge */}
                        <div className="mx-3 mt-3 p-3 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
                            <div className="flex items-center gap-2 mb-1">
                                <Sparkles className="h-3 w-3 text-blue-500" />
                                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Branched RAG</span>
                            </div>
                            <p className="text-[10px] text-blue-600/70 leading-relaxed">
                                Each query is decomposed and run in parallel across all documents, then synthesized into one answer.
                            </p>
                        </div>

                        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                            {docs.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 text-center">
                                    <FileText className="h-8 w-8 text-[#2a3b4e]/10 mb-2" />
                                    <p className="text-[11px] text-[#2a3b4e]/30">No documents yet</p>
                                    <Link href={`/folders/${id}`} className="text-[11px] text-blue-500 hover:underline mt-1">Add documents</Link>
                                </div>
                            ) : (
                                docs.map((doc: any) => (
                                    <Link
                                        key={doc.id}
                                        href={`/documents/${doc.id}`}
                                        className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-[#faf8f6] border border-transparent hover:border-[#e8e2de] transition-all group"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-[#f7f3f1] flex items-center justify-center shrink-0 group-hover:bg-[#2a3b4e]/5 transition-colors">
                                            <FileText className="h-3.5 w-3.5 text-[#2a3b4e]/40" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[12px] font-semibold text-[#1a2332] truncate">{doc.original_filename}</p>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <div className={`w-1 h-1 rounded-full ${getStatusDot(doc.status)}`} />
                                                <span className="text-[9px] font-medium text-[#2a3b4e]/30 uppercase">
                                                    {doc.status === 'ready' ? 'Ready' : 'Processing'}
                                                </span>
                                                {doc.page_count && (
                                                    <span className="text-[9px] text-[#2a3b4e]/20">· {doc.page_count}p</span>
                                                )}
                                            </div>
                                        </div>
                                        <MessageSquare className="h-3 w-3 text-[#2a3b4e]/15 group-hover:text-[#2a3b4e]/40 transition-colors" />
                                    </Link>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Right: Chat Panel */}
                    <div className="flex-1 bg-white rounded-xl border border-[#e8e2de] shadow-sm overflow-hidden flex flex-col">
                        {/* Chat Header */}
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#e8e2de] bg-[#faf8f6]/60 shrink-0">
                            <div className="flex items-center gap-2.5">
                                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#2a3b4e] to-[#4a6b8e] flex items-center justify-center">
                                    <Sparkles className="h-3 w-3 text-white" />
                                </div>
                                <div>
                                    <p className="text-[12px] font-semibold text-[#1a2332]">JurisQuery AI</p>
                                    <p className="text-[10px] text-[#2a3b4e]/30">Cross-document synthesis enabled</p>
                                </div>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-5">
                            {isInitializing ? (
                                <div className="flex items-center justify-center py-20">
                                    <Loader2 className="h-5 w-5 animate-spin text-[#2a3b4e]/20" />
                                </div>
                            ) : messages.length === 0 && !streamingContent ? (
                                <motion.div
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex flex-col items-center justify-center py-16 text-center"
                                >
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2a3b4e] to-[#4a6b8e] flex items-center justify-center mb-5 shadow-xl shadow-[#2a3b4e]/15">
                                        <FolderOpen className="h-7 w-7 text-white" />
                                    </div>
                                    <h3 className="text-[15px] font-bold text-[#1a2332] mb-2">Ask across {docCount} documents</h3>
                                    <p className="text-[12px] text-[#2a3b4e]/35 max-w-xs leading-relaxed mb-6">
                                        JurisQuery will search every document in this folder and synthesize a single, citation-backed answer.
                                    </p>
                                    {docCount === 0 && (
                                        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 text-amber-700 border border-amber-100 rounded-xl text-[12px] font-medium">
                                            <AlertCircle className="h-3.5 w-3.5" />
                                            Add documents to this folder first
                                        </div>
                                    )}
                                </motion.div>
                            ) : (
                                <AnimatePresence initial={false}>
                                    {messages.map((msg) => (
                                        <motion.div
                                            key={msg.id}
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}
                                        >
                                            {msg.role === 'assistant' && (
                                                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#2a3b4e] to-[#4a6b8e] flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                                                    <Sparkles className="h-3.5 w-3.5 text-white" />
                                                </div>
                                            )}
                                            <div className={`flex-1 min-w-0 ${msg.role === 'user' ? 'flex justify-end' : ''}`}>
                                                <div className={`inline-block px-4 py-3 rounded-xl shadow-sm text-[13px] leading-relaxed
                                                    ${msg.role === 'user'
                                                        ? 'bg-gradient-to-r from-[#2a3b4e] to-[#3d5a80] text-white rounded-tr-sm max-w-[75%]'
                                                        : 'bg-white border border-[#e8e2de] text-[#1a2332] rounded-tl-sm whitespace-pre-wrap'
                                                    }`}
                                                >
                                                    {msg.content}
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            )}

                            {/* Streaming bubble */}
                            {streamingContent !== null && (
                                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
                                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#2a3b4e] to-[#4a6b8e] flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                                        <Sparkles className="h-3.5 w-3.5 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="inline-block bg-white border border-[#e8e2de] rounded-xl rounded-tl-sm px-4 py-3 shadow-sm text-[13px] text-[#1a2332] leading-relaxed whitespace-pre-wrap">
                                            {streamingContent}
                                            <span className="inline-block w-[2px] h-[1em] bg-[#2a3b4e]/60 ml-0.5 align-middle animate-pulse" />
                                        </div>
                                    </div>
                                </motion.div>
                            )}

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
                        </div>

                        {/* Input */}
                        <div className="flex-none p-4 border-t border-[#e8e2de] bg-white">
                            <form onSubmit={handleSubmit}>
                                <div className="flex items-center gap-3 bg-[#faf8f6] border border-[#e8e2de] rounded-xl px-4 py-2 focus-within:bg-white focus-within:border-[#2a3b4e]/20 focus-within:ring-2 focus-within:ring-[#2a3b4e]/5 focus-within:shadow-sm transition-all duration-200">
                                    <textarea
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder={docCount === 0 ? 'Add documents first…' : `Ask across all ${docCount} documents…`}
                                        disabled={isLoading || isInitializing || docCount === 0}
                                        rows={1}
                                        className="flex-1 resize-none bg-transparent text-[13px] text-[#1a2332] placeholder-[#2a3b4e]/25 border-none outline-none py-2 max-h-32 overflow-y-auto leading-relaxed disabled:opacity-40"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!input.trim() || isLoading || isInitializing || docCount === 0}
                                        className="w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br from-[#2a3b4e] to-[#3d5a80] text-white shadow-sm shadow-[#2a3b4e]/20 hover:shadow-md hover:shadow-[#2a3b4e]/25 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none shrink-0"
                                    >
                                        {isLoading
                                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5"><path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.903 6.308a.75.75 0 0 0 .624.537l5.5.625a.75.75 0 0 1 0 1.484l-5.5.625a.75.75 0 0 0-.624.537L2.279 19.05a.75.75 0 0 0 .826.95 28.9 28.9 0 0 0 15.208-8.42.75.75 0 0 0 0-1.06A28.9 28.9 0 0 0 3.105 2.288Z" /></svg>
                                        }
                                    </button>
                                </div>
                                <p className="text-[10px] text-[#2a3b4e]/20 text-center mt-2 font-medium">
                                    JurisQuery synthesizes answers across all documents · Branched RAG
                                </p>
                            </form>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
