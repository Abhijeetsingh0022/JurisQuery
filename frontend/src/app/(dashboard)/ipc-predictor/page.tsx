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
    ChevronDown,
    Loader2,
    AlertCircle,
    ArrowLeft,
    Gavel,
    Plus,
    History,
    Lightbulb,
    Search,
    BarChart3,
    BookOpen,
    Zap,
    ExternalLink,
    Trash2,
    Download,
    X
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

interface HistoryEntry {
    id: string;
    description: string;
    sections_count: number;
    created_at: Date;
    predicted_sections: PredictedSection[];
}

export default function IPCPredictorPage() {
    const { fetcher } = useApi();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
    const [maxSections, setMaxSections] = useState<number>(5);
    const [isInitializing, setIsInitializing] = useState(true);
    const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
    const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
    const [sidebarTab, setSidebarTab] = useState<'history' | 'prompts'>('history');
    const [historySearch, setHistorySearch] = useState('');
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const router = useRouter();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        const loadHistory = async () => {
            try {
                const data = await fetcher('/api/v1/ipc/history');
                if (data && data.predictions) {
                    const entries: HistoryEntry[] = data.predictions.map((p: any) => ({
                        id: p.id,
                        description: p.description,
                        sections_count: p.predicted_sections?.length || 0,
                        created_at: new Date(p.created_at),
                        predicted_sections: p.predicted_sections || [],
                    }));
                    setHistoryEntries(entries);
                }
            } catch (err) {
                console.error("Failed to fetch prediction history", err);
            } finally {
                setIsInitializing(false);
            }
        };

        loadHistory();
    }, [fetcher]);

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
        setActiveHistoryId(null);
        setInput('');
        setIsLoading(true);

        try {
            const data = await fetcher('/api/v1/ipc/predict', {
                method: 'POST',
                body: JSON.stringify({
                    description: userMessage.content,
                    max_sections: maxSections,
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

            if (!data.error) {
                setHistoryEntries((prev) => [{
                    id: String(Date.now()),
                    description: userMessage.content || '',
                    sections_count: data.predicted_sections?.length || 0,
                    created_at: new Date(),
                    predicted_sections: data.predicted_sections || [],
                }, ...prev]);
            }
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

    const handleDeleteHistory = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setDeletingId(id);
        try {
            await fetcher(`/api/v1/ipc/history/${id}`, { method: 'DELETE' });
            setHistoryEntries((prev) => prev.filter((h) => h.id !== id));
            if (activeHistoryId === id) {
                setActiveHistoryId(null);
                setMessages([]);
            }
        } catch (err) {
            console.error('Failed to delete history entry', err);
        } finally {
            setDeletingId(null);
        }
    };

    const handleExport = () => {
        const data = historyEntries.map((entry) => ({
            id: entry.id,
            description: entry.description,
            date: entry.created_at,
            sections_found: entry.sections_count,
            predicted_sections: entry.predicted_sections.map((p) => ({
                section_number: p.section.section_number,
                offense: p.section.offense,
                punishment: p.section.punishment,
                cognizable: p.section.cognizable,
                bailable: p.section.bailable,
                confidence: `${(p.confidence * 100).toFixed(0)}%`,
                reasoning: p.reasoning,
            })),
        }));
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ipc-prediction-history-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const filteredHistory = historySearch.trim()
        ? historyEntries.filter((e) =>
              e.description.toLowerCase().includes(historySearch.toLowerCase())
          )
        : historyEntries;

    const handleNewChat = () => {
        setMessages([]);
        setActiveHistoryId(null);
        setExpandedSections({});
        setInput('');
        inputRef.current?.focus();
    };

    const handleHistoryClick = (entry: HistoryEntry) => {
        const historyMessages: Message[] = [
            {
                id: `user-${entry.id}`,
                role: 'user',
                content: entry.description,
                timestamp: entry.created_at,
            },
            {
                id: `assistant-${entry.id}`,
                role: 'assistant',
                prediction: {
                    predicted_sections: entry.predicted_sections,
                    query: entry.description,
                    total_sections_searched: entry.predicted_sections.length,
                    processing_time_ms: 0,
                },
                timestamp: entry.created_at,
            },
        ];
        setMessages(historyMessages);
        setActiveHistoryId(entry.id);
        setExpandedSections({});
    };

    const displayMessages = messages;

    const queryCount = messages.filter(m => m.role === 'user').length;
    const totalSectionsFound = messages
        .filter(m => m.role === 'assistant' && m.prediction)
        .reduce((acc, m) => acc + (m.prediction?.predicted_sections.length || 0), 0);

    const formatTime = (date: Date) => {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days === 1) return 'Yesterday';
        return `${days}d ago`;
    };

    const getConfidenceColor = (c: number) => {
        if (c >= 0.8) return { bg: 'bg-emerald-500', text: 'text-emerald-700', light: 'bg-emerald-50', ring: 'ring-emerald-200' };
        if (c >= 0.6) return { bg: 'bg-amber-500', text: 'text-amber-700', light: 'bg-amber-50', ring: 'ring-amber-200' };
        return { bg: 'bg-rose-500', text: 'text-rose-700', light: 'bg-rose-50', ring: 'ring-rose-200' };
    };

    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col">
            {/* Top Bar */}
            <div className="flex items-center justify-between pb-4 flex-none">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2a3b4e] to-[#4a6b8e] flex items-center justify-center shadow-lg shadow-[#2a3b4e]/20">
                            <Gavel className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold font-serif text-[#1a2332] tracking-tight">IPC Predictor</h1>
                            <p className="text-xs text-[#2a3b4e]/40">AI-powered criminal law analysis</p>
                        </div>
                    </div>
                    {/* Stat pills */}
                    <div className="hidden md:flex items-center gap-2 ml-4 pl-4 border-l border-[#2a3b4e]/8">
                        <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-[11px] font-semibold">
                            <Search className="h-3 w-3" />
                            {queryCount} Queries
                        </div>
                        <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-[11px] font-semibold">
                            <BookOpen className="h-3 w-3" />
                            {totalSectionsFound} Sections
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <select
                            value={maxSections}
                            onChange={(e) => setMaxSections(Number(e.target.value))}
                            className="appearance-none bg-white border border-[#2a3b4e]/10 rounded-lg px-3 py-2 pr-8 text-xs font-medium text-[#2a3b4e] focus:outline-none focus:ring-2 focus:ring-[#2a3b4e]/10 focus:border-[#2a3b4e]/20 cursor-pointer hover:border-[#2a3b4e]/20 transition-colors"
                            disabled={isLoading}
                        >
                            <option value={1}>Top 1 Section</option>
                            <option value={3}>Top 3 Sections</option>
                            <option value={5}>Top 5 Sections</option>
                            <option value={10}>Top 10 Sections</option>
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-[#2a3b4e]/30 pointer-events-none" />
                    </div>
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="bg-white border border-[#2a3b4e]/10 text-[#2a3b4e]/60 px-3 py-2 rounded-lg text-xs font-medium flex items-center hover:text-[#2a3b4e] hover:border-[#2a3b4e]/20 transition-all"
                    >
                        <ArrowLeft className="mr-1.5 h-3 w-3" />
                        Back
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex gap-4 min-h-0">

                {/* Left Sidebar */}
                <div className="w-72 shrink-0 flex flex-col gap-3">
                    {/* New Chat Button */}
                    <button
                        onClick={handleNewChat}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#2a3b4e] to-[#3d5a80] text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-[#2a3b4e]/20 transition-all active:scale-[0.98]"
                    >
                        <Plus className="h-4 w-4" />
                        New Analysis
                    </button>

                    {/* History / Prompts Panel */}
                    <div className="bg-white rounded-xl border border-[#e8e2de] flex-1 flex flex-col overflow-hidden shadow-sm">
                        {/* Tabs */}
                        <div className="flex border-b border-[#e8e2de] bg-[#faf8f6]">
                            <button
                                onClick={() => setSidebarTab('history')}
                                className={`flex-1 py-3 text-[11px] font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all relative ${sidebarTab === 'history'
                                    ? 'text-[#2a3b4e]'
                                    : 'text-[#2a3b4e]/30 hover:text-[#2a3b4e]/50'
                                    }`}
                            >
                                <History className="h-3.5 w-3.5" />
                                History
                                {historyEntries.length > 0 && (
                                    <span className="bg-[#2a3b4e] text-white px-1.5 py-0.5 rounded-full text-[9px] font-bold min-w-[18px] text-center">{historyEntries.length}</span>
                                )}
                                {sidebarTab === 'history' && (
                                    <motion.div layoutId="sidebar-tab" className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#2a3b4e] rounded-full" />
                                )}
                            </button>
                            <button
                                onClick={() => setSidebarTab('prompts')}
                                className={`flex-1 py-3 text-[11px] font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all relative ${sidebarTab === 'prompts'
                                    ? 'text-[#2a3b4e]'
                                    : 'text-[#2a3b4e]/30 hover:text-[#2a3b4e]/50'
                                    }`}
                            >
                                <Lightbulb className="h-3.5 w-3.5" />
                                Suggestions
                                {sidebarTab === 'prompts' && (
                                    <motion.div layoutId="sidebar-tab" className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#2a3b4e] rounded-full" />
                                )}
                            </button>
                        </div>

                        {/* Tab Content */}
                        <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
                            {sidebarTab === 'history' ? (
                                historyEntries.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
                                        <div className="w-12 h-12 rounded-xl bg-[#f7f3f1] flex items-center justify-center mb-3">
                                            <History className="h-5 w-5 text-[#2a3b4e]/20" />
                                        </div>
                                        <p className="text-[13px] font-medium text-[#2a3b4e]/40">No history yet</p>
                                        <p className="text-[11px] text-[#2a3b4e]/25 mt-1 leading-relaxed">Your past analyses<br />will appear here</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Search + Export toolbar */}
                                        <div className="px-2 pt-2 pb-1 flex items-center gap-1.5 border-b border-[#e8e2de]/60">
                                            <div className="flex-1 relative">
                                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-[#2a3b4e]/25 pointer-events-none" />
                                                <input
                                                    type="text"
                                                    value={historySearch}
                                                    onChange={(e) => setHistorySearch(e.target.value)}
                                                    placeholder="Search history…"
                                                    className="w-full bg-[#f7f3f1] border border-transparent focus:border-[#2a3b4e]/15 focus:bg-white rounded-lg pl-7 pr-6 py-1.5 text-[11px] text-[#1a2332] placeholder:text-[#2a3b4e]/25 outline-none transition-all"
                                                />
                                                {historySearch && (
                                                    <button
                                                        onClick={() => setHistorySearch('')}
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[#2a3b4e]/30 hover:text-[#2a3b4e]"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                )}
                                            </div>
                                            <button
                                                onClick={handleExport}
                                                title="Export history as JSON"
                                                className="p-1.5 rounded-lg text-[#2a3b4e]/30 hover:text-[#2a3b4e] hover:bg-[#f7f3f1] transition-colors shrink-0"
                                            >
                                                <Download className="h-3.5 w-3.5" />
                                            </button>
                                        </div>

                                        <div className="p-2 space-y-0.5 overflow-y-auto flex-1">
                                            {activeHistoryId && !historySearch && (
                                                <button
                                                    onClick={() => { setActiveHistoryId(null); setMessages([]); }}
                                                    className="w-full px-3 py-2 text-[11px] text-left font-semibold text-[#2a3b4e]/40 hover:text-[#2a3b4e] hover:bg-[#f7f3f1] rounded-lg transition-colors flex items-center gap-1.5 mb-1"
                                                >
                                                    <ArrowLeft className="h-3 w-3" />
                                                    Show all
                                                </button>
                                            )}
                                            {filteredHistory.length === 0 && historySearch ? (
                                                <div className="text-center py-8">
                                                    <p className="text-[12px] text-[#2a3b4e]/30">No results for &ldquo;{historySearch}&rdquo;</p>
                                                </div>
                                            ) : (
                                                filteredHistory.map((entry) => (
                                                    <div
                                                        key={entry.id}
                                                        onClick={() => handleHistoryClick(entry)}
                                                        className={`w-full text-left rounded-lg transition-all group p-3 cursor-pointer relative ${
                                                            activeHistoryId === entry.id
                                                                ? 'bg-[#2a3b4e] text-white shadow-md shadow-[#2a3b4e]/15'
                                                                : 'hover:bg-[#f7f3f1]'
                                                        }`}
                                                    >
                                                        <p className={`text-[12px] font-medium leading-snug line-clamp-2 pr-6 ${
                                                            activeHistoryId === entry.id ? 'text-white' : 'text-[#1a2332] group-hover:text-[#1a2332]'
                                                        }`}>
                                                            {entry.description}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <span className={`text-[10px] font-medium ${
                                                                activeHistoryId === entry.id ? 'text-white/60' : 'text-[#2a3b4e]/30'
                                                            }`}>
                                                                {formatTime(entry.created_at)}
                                                            </span>
                                                            <span className={`text-[10px] ${
                                                                activeHistoryId === entry.id ? 'text-white/30' : 'text-[#2a3b4e]/15'
                                                            }`}>•</span>
                                                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                                                activeHistoryId === entry.id ? 'bg-white/20 text-white/80' : 'bg-[#2a3b4e]/5 text-[#2a3b4e]/40'
                                                            }`}>
                                                                <BookOpen className="h-2.5 w-2.5" />
                                                                {entry.sections_count}
                                                            </span>
                                                        </div>
                                                        {/* Delete button */}
                                                        <button
                                                            onClick={(e) => handleDeleteHistory(e, entry.id)}
                                                            disabled={deletingId === entry.id}
                                                            className={`absolute top-2.5 right-2.5 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-all ${
                                                                activeHistoryId === entry.id
                                                                    ? 'text-white/50 hover:text-white hover:bg-white/15'
                                                                    : 'text-[#2a3b4e]/25 hover:text-red-500 hover:bg-red-50'
                                                            } ${deletingId === entry.id ? 'opacity-100' : ''}`}
                                                            title="Delete entry"
                                                        >
                                                            {deletingId === entry.id
                                                                ? <Loader2 className="h-3 w-3 animate-spin" />
                                                                : <Trash2 className="h-3 w-3" />}
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </>
                                )
                            ) : (
                                <div className="p-2 space-y-0.5">
                                    {[
                                        { text: 'Jewelry theft at night with forced entry', icon: '🏠' },
                                        { text: 'Online fraud and identity theft', icon: '💻' },
                                        { text: 'Causing hurt during a street fight', icon: '⚡' },
                                        { text: 'Forgery of government documents', icon: '📄' },
                                        { text: 'Kidnapping for ransom', icon: '🚨' },
                                        { text: 'Drunk driving causing death', icon: '🚗' },
                                        { text: 'Domestic violence and dowry harassment', icon: '🏚️' },
                                        { text: 'Criminal trespass into a home', icon: '🚪' },
                                        { text: 'Cheating and dishonest misappropriation', icon: '💰' },
                                        { text: 'Rioting with a deadly weapon', icon: '⚔️' },
                                        { text: 'Defamation through social media posts', icon: '📱' },
                                        { text: 'Acid attack on a person', icon: '⚠️' },
                                        { text: 'Robbery on a public highway', icon: '🛣️' },
                                        { text: 'Criminal intimidation and threats', icon: '😡' },
                                        { text: 'Extortion by a public servant', icon: '🏛️' },
                                    ].map(({ text, icon }) => (
                                        <button
                                            key={text}
                                            onClick={() => { setInput(text); setSidebarTab('history'); inputRef.current?.focus(); }}
                                            className="w-full px-3 py-2.5 text-[12px] text-left text-[#1a2332]/70 hover:text-[#1a2332] hover:bg-[#f7f3f1] rounded-lg transition-all leading-snug flex items-start gap-2.5 group"
                                        >
                                            <span className="text-sm mt-px shrink-0">{icon}</span>
                                            <span className="group-hover:translate-x-0.5 transition-transform">{text}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Chat Panel */}
                <div className="flex-1 bg-white rounded-xl border border-[#e8e2de] flex flex-col overflow-hidden shadow-sm">

                    {/* Chat Header Bar */}
                    <div className="flex items-center justify-between px-6 py-3.5 border-b border-[#e8e2de] bg-[#faf8f6] flex-none">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#2a3b4e] to-[#4a6b8e] flex items-center justify-center">
                                    <Scale className="h-4 w-4 text-white" />
                                </div>
                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#faf8f6]" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-[#1a2332]">AI Legal Analyst</h2>
                                <span className="text-[10px] text-emerald-600 font-medium">Ready to analyze</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {activeHistoryId && (
                                <button
                                    onClick={() => { setActiveHistoryId(null); setMessages([]); }}
                                    className="text-[11px] font-medium text-[#2a3b4e]/50 hover:text-[#2a3b4e] flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-white transition-colors"
                                >
                                    <ArrowLeft className="h-3 w-3" />
                                    Clear
                                </button>
                            )}
                            <span className="text-[10px] font-semibold text-[#2a3b4e]/30 bg-white border border-[#e8e2de] px-3 py-1.5 rounded-lg">
                                {queryCount} {queryCount === 1 ? 'query' : 'queries'}
                            </span>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 bg-[#fdfcfb]">
                        {isInitializing ? (
                            <div className="flex flex-col justify-center items-center h-full gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[#f7f3f1] flex items-center justify-center">
                                    <Loader2 className="h-5 w-5 animate-spin text-[#2a3b4e]/30" />
                                </div>
                                <span className="text-[12px] text-[#2a3b4e]/30 font-medium">Loading history…</span>
                            </div>
                        ) : displayMessages.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, ease: 'easeOut' }}
                                className="flex flex-col items-center justify-center h-full text-center"
                            >
                                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#2a3b4e] to-[#4a6b8e] flex items-center justify-center mb-6 shadow-xl shadow-[#2a3b4e]/20">
                                    <Scale className="h-10 w-10 text-white" />
                                </div>
                                <h2 className="text-2xl font-serif font-bold text-[#1a2332] mb-2">Describe the incident</h2>
                                <p className="text-sm text-[#2a3b4e]/40 max-w-md leading-relaxed">
                                    Enter a crime description and I&apos;ll identify applicable IPC sections with confidence scores, bail status, and detailed legal reasoning.
                                </p>
                                <div className="flex items-center gap-6 mt-8">
                                    {[
                                        { icon: Shield, label: 'Bail Analysis' },
                                        { icon: BarChart3, label: 'Confidence Scores' },
                                        { icon: BookOpen, label: 'Legal Excerpts' },
                                    ].map(({ icon: Icon, label }) => (
                                        <div key={label} className="flex items-center gap-2 text-[#2a3b4e]/25">
                                            <Icon className="h-4 w-4" />
                                            <span className="text-[11px] font-medium">{label}</span>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        ) : (
                            displayMessages.map((msg) => (
                                <motion.div
                                    key={msg.id}
                                    id={`msg-${msg.id}`}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.25 }}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    {msg.role === 'user' ? (
                                        <div className="bg-gradient-to-r from-[#2a3b4e] to-[#3d5a80] text-white px-5 py-3.5 rounded-2xl rounded-br-md shadow-md shadow-[#2a3b4e]/10 max-w-[65%]">
                                            <p className="text-[13px] leading-relaxed">{msg.content}</p>
                                        </div>
                                    ) : (
                                        <div className="flex gap-3.5 w-full">
                                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2a3b4e] to-[#4a6b8e] flex items-center justify-center shrink-0 mt-1 shadow-sm">
                                                <Scale className="h-3.5 w-3.5 text-white" />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                {msg.prediction ? (
                                                    <div className="space-y-3">
                                                        {/* Analysis summary bar */}
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-[11px] font-bold text-[#1a2332]/50 uppercase tracking-wider">
                                                                {msg.prediction.predicted_sections.length} sections identified
                                                            </span>
                                                            {msg.prediction.processing_time_ms > 0 && (
                                                                <span className="inline-flex items-center gap-1 text-[10px] text-[#2a3b4e]/25 bg-[#f7f3f1] px-2 py-0.5 rounded-full">
                                                                    <Zap className="h-2.5 w-2.5" />
                                                                    {msg.prediction.processing_time_ms.toFixed(0)}ms
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Section Cards */}
                                                        {msg.prediction.predicted_sections.map((pred) => {
                                                            const cc = getConfidenceColor(pred.confidence);
                                                            const isExpanded = expandedSections[`${msg.id}-${pred.section.section_number}`];

                                                            return (
                                                                <div
                                                                    key={pred.section.section_number}
                                                                    className={`bg-white rounded-xl border overflow-hidden transition-all duration-200 ${isExpanded ? 'border-[#2a3b4e]/15 shadow-md' : 'border-[#e8e2de] hover:border-[#2a3b4e]/12 hover:shadow-sm'
                                                                        }`}
                                                                >
                                                                    <div
                                                                        className="px-5 py-4 cursor-pointer"
                                                                        onClick={() => toggleSection(msg.id, pred.section.section_number)}
                                                                    >
                                                                        {/* Section header */}
                                                                        <div className="flex items-start justify-between mb-3">
                                                                            <div className="flex items-center gap-3">
                                                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2a3b4e] to-[#3d5a80] flex items-center justify-center shrink-0 shadow-sm">
                                                                                    <span className="text-white font-bold text-[11px]">{pred.section.section_number}</span>
                                                                                </div>
                                                                                <div>
                                                                                    <h3 className="font-bold text-[#1a2332] text-[14px]">
                                                                                        Section {pred.section.section_number}
                                                                                    </h3>
                                                                                    <p className="text-[11px] text-[#2a3b4e]/45 mt-0.5 line-clamp-1">
                                                                                        {pred.section.offense || 'Unspecified Offense'}
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                            {/* Confidence badge */}
                                                                            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${cc.light} ring-1 ${cc.ring}`}>
                                                                                <div className={`w-1.5 h-1.5 rounded-full ${cc.bg}`} />
                                                                                <span className={`text-[12px] font-bold ${cc.text}`}>
                                                                                    {(pred.confidence * 100).toFixed(0)}%
                                                                                </span>
                                                                            </div>
                                                                        </div>

                                                                        {/* Status tags */}
                                                                        <div className="flex flex-wrap items-center gap-2 mb-3">
                                                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${pred.section.cognizable ? 'bg-red-50 text-red-600 ring-1 ring-red-100' : 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100'
                                                                                }`}>
                                                                                <Shield className="h-3 w-3" />
                                                                                {pred.section.cognizable ? 'Cognizable' : 'Non-Cognizable'}
                                                                            </span>
                                                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${pred.section.bailable ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100' : 'bg-red-50 text-red-600 ring-1 ring-red-100'
                                                                                }`}>
                                                                                <Building2 className="h-3 w-3" />
                                                                                {pred.section.bailable ? 'Bailable' : 'Non-Bailable'}
                                                                            </span>
                                                                            {pred.section.punishment && (
                                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#f7f3f1] text-[#2a3b4e]/70 ring-1 ring-[#e8e2de]">
                                                                                    <Clock className="h-3 w-3" />
                                                                                    {pred.section.punishment}
                                                                                </span>
                                                                            )}
                                                                        </div>

                                                                        {/* Reasoning */}
                                                                        <div className="bg-[#faf8f6] rounded-lg px-4 py-3 border border-[#e8e2de]/50">
                                                                            <p className="text-[12px] text-[#1a2332]/60 leading-relaxed italic">
                                                                                &ldquo;{pred.reasoning}&rdquo;
                                                                            </p>
                                                                        </div>

                                                                        {/* Expand toggle */}
                                                                        <button className="flex items-center gap-1.5 text-[11px] font-semibold text-[#2a3b4e]/30 hover:text-[#2a3b4e]/60 transition-colors mt-3">
                                                                            {isExpanded ? 'Hide details' : 'View details'}
                                                                            <ChevronRight className={`h-3 w-3 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                                                                        </button>
                                                                    </div>

                                                                    {/* Expanded panel */}
                                                                    <AnimatePresence>
                                                                        {isExpanded && (
                                                                            <motion.div
                                                                                initial={{ height: 0, opacity: 0 }}
                                                                                animate={{ height: 'auto', opacity: 1 }}
                                                                                exit={{ height: 0, opacity: 0 }}
                                                                                transition={{ duration: 0.25 }}
                                                                                className="overflow-hidden"
                                                                            >
                                                                                <div className="border-t border-[#e8e2de] px-5 py-4 bg-[#faf8f6]/50">
                                                                                    <div className="grid grid-cols-3 gap-3">
                                                                                        <div className="bg-white rounded-lg p-3.5 border border-[#e8e2de]/60">
                                                                                            <p className="text-[10px] font-bold text-[#2a3b4e]/25 uppercase tracking-wider mb-1.5">Classification</p>
                                                                                            <p className={`font-bold text-sm ${pred.section.cognizable ? 'text-red-500' : 'text-emerald-500'}`}>
                                                                                                {pred.section.cognizable ? 'Cognizable' : 'Non-Cognizable'}
                                                                                            </p>
                                                                                        </div>
                                                                                        <div className="bg-white rounded-lg p-3.5 border border-[#e8e2de]/60">
                                                                                            <p className="text-[10px] font-bold text-[#2a3b4e]/25 uppercase tracking-wider mb-1.5">Bail Status</p>
                                                                                            <p className={`font-bold text-sm ${pred.section.bailable ? 'text-emerald-500' : 'text-red-500'}`}>
                                                                                                {pred.section.bailable ? 'Bailable' : 'Non-Bailable'}
                                                                                            </p>
                                                                                        </div>
                                                                                        <div className="bg-white rounded-lg p-3.5 border border-[#e8e2de]/60">
                                                                                            <p className="text-[10px] font-bold text-[#2a3b4e]/25 uppercase tracking-wider mb-1.5">Punishment</p>
                                                                                            <p className="font-bold text-sm text-[#1a2332]">{pred.section.punishment || 'N/A'}</p>
                                                                                        </div>
                                                                                    </div>

                                                                                    {pred.relevant_excerpt && (
                                                                                        <div className="mt-3 bg-white rounded-lg p-4 border border-[#e8e2de]/60">
                                                                                            <p className="text-[10px] font-bold text-[#2a3b4e]/25 uppercase tracking-wider mb-2">Legal Text</p>
                                                                                            <p className="text-[#1a2332] leading-relaxed font-serif text-[13px] italic border-l-2 border-[#2a3b4e]/15 pl-4">
                                                                                                &ldquo;{pred.relevant_excerpt}&rdquo;
                                                                                            </p>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </motion.div>
                                                                        )}
                                                                    </AnimatePresence>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <div className="bg-red-50 text-red-600 px-4 py-3.5 rounded-xl border border-red-100 text-[13px] flex items-start gap-2.5">
                                                        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                                        <span>{msg.content}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            ))
                        )}

                        {isLoading && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                                <div className="flex gap-3.5">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2a3b4e] to-[#4a6b8e] flex items-center justify-center shrink-0 shadow-sm">
                                        <Scale className="h-3.5 w-3.5 text-white" />
                                    </div>
                                    <div className="bg-white border border-[#e8e2de] rounded-xl px-5 py-3.5 flex items-center gap-3 shadow-sm">
                                        <Loader2 className="h-4 w-4 animate-spin text-[#2a3b4e]/40" />
                                        <div>
                                            <span className="text-[12px] font-medium text-[#1a2332]/50 block">Analyzing incident…</span>
                                            <span className="text-[10px] text-[#2a3b4e]/25">Searching IPC database</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="flex-none border-t border-[#e8e2de] bg-white px-6 py-4">
                        <div className="flex items-center gap-3 bg-[#faf8f6] border border-[#e8e2de] rounded-xl px-4 py-2 focus-within:bg-white focus-within:border-[#2a3b4e]/20 focus-within:ring-2 focus-within:ring-[#2a3b4e]/5 focus-within:shadow-sm transition-all duration-200">
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Describe the criminal incident…"
                                rows={1}
                                className="flex-1 bg-transparent text-[13px] focus:outline-none text-[#1a2332] placeholder:text-[#2a3b4e]/25 resize-none h-8 pt-1.5"
                                disabled={isLoading}
                            />
                            <button
                                onClick={() => handlePredict()}
                                disabled={!input.trim() || isLoading}
                                className="p-2.5 rounded-lg bg-gradient-to-r from-[#2a3b4e] to-[#3d5a80] text-white disabled:opacity-20 disabled:cursor-not-allowed hover:shadow-md hover:shadow-[#2a3b4e]/15 transition-all flex items-center justify-center shrink-0 active:scale-95"
                            >
                                <Send className="h-4 w-4" />
                            </button>
                        </div>
                        <p className="text-center mt-2.5 text-[10px] text-[#2a3b4e]/20 font-medium">
                            AI-generated analysis · Always verify with qualified legal counsel
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
