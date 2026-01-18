'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { FileText, MessageSquare, Clock } from 'lucide-react';
import {
    Sidebar,
    TopHeader,
    StatsCards,
    QuickActions,
    DocumentsList
} from '@/components/dashboard';
import { getDocuments, deleteDocument } from '@/services/ragService';
import type { Document } from '@/types/documents.types';

export default function DashboardClient() {
    const { user } = useUser();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showUpload, setShowUpload] = useState(false);

    const fetchDocuments = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await getDocuments();
            setDocuments(response.documents);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load documents');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    const handleUploadComplete = (document: Document) => {
        setDocuments((prev) => [document, ...prev]);
        setShowUpload(false);
    };

    const handleDeleteDocument = async (document: Document) => {
        if (!confirm(`Delete "${document.original_filename}"?`)) return;
        try {
            await deleteDocument(document.id);
            setDocuments((prev) => prev.filter((d) => d.id !== document.id));
        } catch (err) {
            console.error('Delete failed:', err);
        }
    };

    const stats = [
        { label: 'Total Documents', value: documents.length, icon: FileText, color: 'bg-blue-500' },
        { label: 'Ready for Analysis', value: documents.filter(d => d.status === 'ready').length, icon: MessageSquare, color: 'bg-green-500' },
        { label: 'Processing', value: documents.filter(d => ['processing', 'vectorizing'].includes(d.status)).length, icon: Clock, color: 'bg-amber-500' },
    ];

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <Sidebar />

            <main className="flex-1 flex flex-col min-h-screen">
                <TopHeader title="Dashboard" />

                <div className="flex-1 p-8 bg-dot-pattern overflow-y-auto">
                    {/* Welcome Section */}
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-900">
                            Welcome back, {user?.firstName || 'there'}! 👋
                        </h2>
                        <p className="text-gray-600 mt-1">
                            Upload a document or continue where you left off.
                        </p>
                    </div>

                    <StatsCards stats={stats} />

                    <QuickActions
                        showUpload={showUpload}
                        setShowUpload={setShowUpload}
                        onUploadComplete={handleUploadComplete}
                        onError={(err) => setError(err.message)}
                    />

                    <DocumentsList
                        documents={documents}
                        isLoading={isLoading}
                        error={error}
                        onRefresh={fetchDocuments}
                        onSelect={(d) => window.location.href = `/documents/${d.id}`}
                        onDelete={handleDeleteDocument}
                        onUploadClick={() => setShowUpload(true)}
                    />
                </div>
            </main>
        </div>
    );
}
