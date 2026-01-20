'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, AlertCircle, FileText, Download, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const PDFViewer = dynamic(() => import('@/features/viewer/components/PDFViewer'), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-full bg-gray-100">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    ),
});
import ChatWindow from '@/features/chat/components/ChatWindow';
import { getDocument } from '@/services/ragService';
import type { Document } from '@/types/documents.types';
import type { Citation } from '@/types/api.types';

export default function DocumentAnalysisPage() {
    const params = useParams();
    const router = useRouter();
    const documentId = params.id as string;

    const [document, setDocument] = useState<Document | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
    const [activeTab, setActiveTab] = useState<'chat' | 'info'>('chat');

    const fetchDocument = useCallback(async () => {
        if (!documentId) return;

        setIsLoading(true);
        setError(null);
        try {
            const doc = await getDocument(documentId);
            setDocument(doc);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load document');
        } finally {
            setIsLoading(false);
        }
    }, [documentId]);

    useEffect(() => {
        fetchDocument();
    }, [fetchDocument]);

    const handleCitationClick = (citation: Citation) => {
        setActiveCitation(citation);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-soft-cream flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-gray-600">Loading document...</p>
                </div>
            </div>
        );
    }

    if (error || !document) {
        return (
            <div className="min-h-screen bg-soft-cream flex items-center justify-center">
                <div className="text-center max-w-md">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h1 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Document</h1>
                    <p className="text-gray-600 mb-6">{error || 'Document not found'}</p>
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    // Transform activeCitation to include content for text highlighting
    const viewerCitation = activeCitation && activeCitation.page_number
        ? {
            page_number: activeCitation.page_number,
            content: activeCitation.content
        }
        : null;

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
                                    {document.original_filename}
                                </h1>
                                <p className="text-[10px] text-[#2a3b4e]/60 flex items-center gap-2 font-medium uppercase tracking-widest mt-0.5">
                                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${document.status === 'ready' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-amber-500'
                                        }`} />
                                    {document.status === 'ready' ? 'Ready for Analysis' : 'Processing...'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <a
                                href={document.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2.5 bg-[#2a3b4e] hover:bg-[#1f2b3a] rounded-xl transition-all text-white shadow-lg shadow-[#2a3b4e]/20 hover:shadow-[#2a3b4e]/30 group"
                                title="Download original"
                            >
                                <span className="text-sm font-medium">Download</span>
                                <Download className="h-4 w-4 group-hover:translate-y-0.5 transition-transform" />
                            </a>
                        </div>
                    </header>
                </div>

                {/* Main Content - Split View */}
                <div className="flex-1 flex overflow-hidden px-4 pb-4 gap-4">
                    {/* Left Panel - PDF Viewer */}
                    <div className="flex-1 bg-white rounded-2xl shadow-sm border border-[#2a3b4e]/5 overflow-hidden relative group hover:border-[#2a3b4e]/10 transition-colors">
                        <PDFViewer
                            url={document.file_url}
                            className="h-full border-none"
                            activeCitation={viewerCitation}
                        />
                    </div>

                    {/* Right Panel - Chat */}
                    <div className="flex-1 flex flex-col h-full bg-white rounded-2xl shadow-sm border border-[#2a3b4e]/5 overflow-hidden relative hover:border-[#2a3b4e]/10 transition-colors">
                        <ChatWindow
                            documentId={documentId}
                            onCitationClick={handleCitationClick}
                        />
                    </div>
                </div>
            </main>
        </div>
    );
}
