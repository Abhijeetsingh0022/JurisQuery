'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Upload } from 'lucide-react';
import DocumentUpload from '@/features/documents/components/DocumentUpload';
import type { Document } from '@/types/documents.types';

interface QuickActionsProps {
    showUpload: boolean;
    setShowUpload: (show: boolean) => void;
    onUploadComplete: (document: Document) => void;
    onError: (error: Error) => void;
}

export default function QuickActions({
    showUpload,
    setShowUpload,
    onUploadComplete,
    onError
}: QuickActionsProps) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-8">
            <div className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
            </div>
            <div className="p-6">
                <AnimatePresence mode="wait">
                    {showUpload ? (
                        <motion.div
                            key="upload"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="font-medium text-gray-900">Upload Document</h4>
                                <button
                                    onClick={() => setShowUpload(false)}
                                    className="text-sm text-gray-500 hover:text-gray-700"
                                >
                                    Cancel
                                </button>
                            </div>
                            <DocumentUpload
                                onUploadComplete={onUploadComplete}
                                onError={onError}
                            />
                        </motion.div>
                    ) : (
                        <motion.button
                            key="button"
                            onClick={() => setShowUpload(true)}
                            className="w-full flex items-center justify-center gap-3 p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-primary hover:bg-primary/5 transition-all group"
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                        >
                            <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                <Upload className="h-5 w-5" />
                            </div>
                            <span className="font-medium text-gray-700 group-hover:text-primary transition-colors">
                                Upload New Document
                            </span>
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
