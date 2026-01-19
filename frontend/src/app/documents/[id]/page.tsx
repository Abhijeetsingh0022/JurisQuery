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
        <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
            <main className="flex-1 flex flex-col overflow-hidden">
                {/* Header with Title and Back Button Logic */}
                <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-none">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.back()}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5 text-gray-600" />
                        </button>
                        <div className="min-w-0">
                            <h1 className="text-lg font-semibold text-gray-900 truncate max-w-xl">
                                {document.original_filename}
                            </h1>
                            <p className="text-xs text-gray-500 flex items-center gap-2">
                                <span className={`inline-block w-2 h-2 rounded-full ${document.status === 'ready' ? 'bg-green-500' : 'bg-amber-500'
                                    }`} />
                                {document.status === 'ready' ? 'Ready for Analysis' : 'Processing...'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <a
                            href={document.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                            title="Download original"
                        >
                            <Download className="h-5 w-5" />
                        </a>
                    </div>
                </header>

                {/* Main Content - Split View */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Left Panel - PDF Viewer */}
                    <div className="flex-1 border-r border-gray-200 bg-white relative">
                        <PDFViewer
                            url={document.file_url}
                            className="h-full border-none rounded-none"
                            activeCitation={viewerCitation}
                        />
                    </div>

                    {/* Right Panel - Chat */}
                    <div className="flex-1 flex flex-col h-full bg-white">
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
