'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, AlertCircle, Download, FileText, BookOpen, HardDrive } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const PDFViewer = dynamic(() => import('@/features/viewer/components/PDFViewer'), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-full bg-[#faf8f6]">
            <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm">
                    <Loader2 className="h-5 w-5 animate-spin text-[#2a3b4e]/30" />
                </div>
                <span className="text-[12px] text-[#2a3b4e]/30 font-medium">Loading viewer…</span>
            </div>
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

    const formatFileSize = (bytes: number) => {
        if (!bytes) return '';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    if (isLoading) {
        return (
            <div className="h-screen -m-8 bg-[#fdfcfb] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#2a3b4e] to-[#4a6b8e] flex items-center justify-center shadow-xl shadow-[#2a3b4e]/20">
                        <Loader2 className="h-6 w-6 animate-spin text-white" />
                    </div>
                    <div className="text-center">
                        <p className="text-[14px] font-semibold text-[#1a2332]">Loading document</p>
                        <p className="text-[12px] text-[#2a3b4e]/30 mt-1">Preparing your analysis workspace…</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !document) {
        return (
            <div className="h-screen -m-8 bg-[#fdfcfb] flex items-center justify-center">
                <div className="text-center max-w-sm">
                    <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-5">
                        <AlertCircle className="h-7 w-7 text-red-400" />
                    </div>
                    <h1 className="text-lg font-bold text-[#1a2332] mb-2">Unable to Load Document</h1>
                    <p className="text-sm text-[#2a3b4e]/40 mb-6 leading-relaxed">{error || 'Document not found or access denied'}</p>
                    <Link
                        href="/documents"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#2a3b4e] to-[#3d5a80] text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-[#2a3b4e]/20 transition-all"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Documents
                    </Link>
                </div>
            </div>
        );
    }

    const viewerCitation = activeCitation && activeCitation.page_number
        ? { page_number: activeCitation.page_number, content: activeCitation.content }
        : null;

    return (
        <div className="h-[calc(100vh)] -m-8 bg-[#fdfcfb] flex flex-col overflow-hidden">
            <main className="flex-1 flex flex-col overflow-hidden w-full max-w-[1920px] mx-auto">
                {/* Top Header Bar */}
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
                                <FileText className="h-4 w-4 text-white" />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-[14px] font-bold text-[#1a2332] truncate max-w-lg">
                                    {document.original_filename}
                                </h1>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="flex items-center gap-1.5">
                                        <div className={`w-1.5 h-1.5 rounded-full ${document.status === 'ready' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                                        <span className="text-[10px] font-semibold text-[#2a3b4e]/30 uppercase tracking-wider">
                                            {document.status === 'ready' ? 'Ready' : 'Processing'}
                                        </span>
                                    </span>
                                    {document.page_count && (
                                        <>
                                            <span className="text-[#2a3b4e]/10">·</span>
                                            <span className="text-[10px] text-[#2a3b4e]/25 font-medium">{document.page_count} pages</span>
                                        </>
                                    )}
                                    {document.file_size && (
                                        <>
                                            <span className="text-[#2a3b4e]/10">·</span>
                                            <span className="text-[10px] text-[#2a3b4e]/25 font-medium">{formatFileSize(document.file_size)}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <a
                                href={document.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#2a3b4e] to-[#3d5a80] text-white rounded-lg text-[12px] font-semibold hover:shadow-lg hover:shadow-[#2a3b4e]/20 transition-all active:scale-[0.98]"
                            >
                                <Download className="h-3.5 w-3.5" />
                                Download
                            </a>
                        </div>
                    </div>
                </div>

                {/* Split View */}
                <div className="flex-1 flex overflow-hidden px-4 pb-4 pt-2 gap-3">
                    {/* PDF Viewer Panel */}
                    <div className="flex-1 bg-white rounded-xl shadow-sm border border-[#e8e2de] overflow-hidden">
                        <PDFViewer
                            url={document.file_url}
                            className="h-full border-none"
                            activeCitation={viewerCitation}
                        />
                    </div>

                    {/* Chat Panel */}
                    <div className="flex-1 bg-white rounded-xl shadow-sm border border-[#e8e2de] overflow-hidden flex flex-col">
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
