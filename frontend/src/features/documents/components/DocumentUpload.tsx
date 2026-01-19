'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';
import { uploadDocument, getDocumentStatus } from '@/services/ragService';
import type { Document, DocumentStatus } from '@/types/documents.types';

interface DocumentUploadProps {
    onUploadComplete?: (document: Document) => void;
    onError?: (error: Error) => void;
}

const statusMessages: Record<DocumentStatus, string> = {
    pending: 'Preparing upload...',
    uploading: 'Uploading document...',
    processing: 'Extracting text...',
    vectorizing: 'Creating embeddings...',
    ready: 'Document ready!',
    failed: 'Processing failed',
};

const statusIcons: Record<DocumentStatus, React.ReactNode> = {
    pending: <Loader2 className="h-5 w-5 animate-spin text-blue-500" />,
    uploading: <Loader2 className="h-5 w-5 animate-spin text-blue-500" />,
    processing: <Loader2 className="h-5 w-5 animate-spin text-amber-500" />,
    vectorizing: <Loader2 className="h-5 w-5 animate-spin text-blue-500" />,
    ready: <CheckCircle2 className="h-5 w-5 text-green-500" />,
    failed: <AlertCircle className="h-5 w-5 text-red-500" />,
};

export default function DocumentUpload({ onUploadComplete, onError }: DocumentUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [processingStatus, setProcessingStatus] = useState<DocumentStatus | null>(null);
    const [currentFile, setCurrentFile] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);

    const pollStatus = useCallback(async (documentId: string) => {
        const maxAttempts = 60; // 5 minutes with 5s intervals
        let attempts = 0;

        const poll = async () => {
            try {
                const status = await getDocumentStatus(documentId);
                setProcessingStatus(status.status);

                if (status.status === 'ready') {
                    // Fetch full document
                    const document = await import('@/services/ragService').then(m => m.getDocument(documentId));
                    onUploadComplete?.(document);
                    setTimeout(() => {
                        setIsUploading(false);
                        setCurrentFile(null);
                        setProcessingStatus(null);
                    }, 2000);
                } else if (status.status === 'failed') {
                    setError(status.error_message || 'Processing failed');
                    setIsUploading(false);
                } else if (attempts < maxAttempts) {
                    attempts++;
                    setTimeout(poll, 5000);
                }
            } catch (err) {
                console.error('Status poll error:', err);
                attempts++;
                if (attempts < maxAttempts) {
                    setTimeout(poll, 5000);
                }
            }
        };

        poll();
    }, [onUploadComplete]);

    const handleUpload = useCallback(async (file: File) => {
        setIsUploading(true);
        setCurrentFile(file);
        setError(null);
        setUploadProgress(0);
        setProcessingStatus('uploading');

        try {
            const document = await uploadDocument(file, (progress) => {
                setUploadProgress(progress);
            });

            setProcessingStatus(document.status);

            if (document.status === 'ready') {
                onUploadComplete?.(document);
                setTimeout(() => {
                    setIsUploading(false);
                    setCurrentFile(null);
                }, 2000);
            } else if (document.status !== 'failed') {
                // Start polling for status
                pollStatus(document.id);
            }
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Upload failed');
            setError(error.message);
            setIsUploading(false);
            setProcessingStatus(null);
            onError?.(error);
        }
    }, [onUploadComplete, onError, pollStatus]);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (file) {
            handleUpload(file);
        }
    }, [handleUpload]);

    const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'text/plain': ['.txt'],
        },
        maxFiles: 1,
        maxSize: 50 * 1024 * 1024, // 50MB
        disabled: isUploading,
    });

    const cancelUpload = () => {
        setIsUploading(false);
        setCurrentFile(null);
        setProcessingStatus(null);
        setError(null);
        setUploadProgress(0);
    };

    return (
        <div className="w-full">
            <AnimatePresence mode="wait">
                {!isUploading ? (
                    <motion.div
                        key="dropzone"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div
                            {...getRootProps()}
                            className={`
                relative overflow-hidden rounded-2xl border-2 border-dashed p-12
                transition-all duration-300 cursor-pointer
                ${isDragActive ? 'border-blue-500 bg-blue-50/50' : ''}
                ${isDragReject ? 'border-red-500 bg-red-50/50' : ''}
                ${!isDragActive && !isDragReject ? 'border-gray-300 hover:border-blue-400 hover:bg-gray-50/50' : ''}
              `}
                        >
                            <input {...getInputProps()} />

                            <div className="flex flex-col items-center gap-4 text-center">
                                <div className={`
                  p-4 rounded-full transition-colors duration-300
                  ${isDragActive ? 'bg-blue-100' : 'bg-gray-100'}
                `}>
                                    <Upload className={`
                    h-8 w-8 transition-colors duration-300
                    ${isDragActive ? 'text-blue-600' : 'text-gray-500'}
                  `} />
                                </div>

                                <div>
                                    <p className="text-lg font-medium text-gray-900">
                                        {isDragActive ? 'Drop your document here' : 'Drag & drop a legal document'}
                                    </p>
                                    <p className="mt-1 text-sm text-gray-500">
                                        or click to browse • PDF, DOCX, TXT up to 50MB
                                    </p>
                                </div>
                            </div>

                            {/* Animated border gradient */}
                            {isDragActive && (
                                <motion.div
                                    className="absolute inset-0 -z-10 bg-gradient-to-r from-blue-500/20 via-blue-400/20 to-blue-500/20"
                                    animate={{ opacity: [0.5, 1, 0.5] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                />
                            )}
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="uploading"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="rounded-2xl border border-gray-200 bg-white p-6"
                    >
                        <div className="flex items-start gap-4">
                            <div className="p-3 rounded-xl bg-blue-50">
                                <FileText className="h-6 w-6 text-blue-600" />
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <p className="font-medium text-gray-900 truncate">
                                        {currentFile?.name}
                                    </p>
                                    <button
                                        onClick={cancelUpload}
                                        className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                                    >
                                        <X className="h-4 w-4 text-gray-500" />
                                    </button>
                                </div>

                                <p className="mt-1 text-sm text-gray-500">
                                    {currentFile && `${(currentFile.size / 1024 / 1024).toFixed(2)} MB`}
                                </p>

                                {/* Timeline Stepper */}
                                <div className="mt-6 mb-2 px-4">
                                    <div className="relative flex justify-between items-start">
                                        {/* Connecting Line - positioned to connect circle centers */}
                                        <div className="absolute top-4 left-4 right-4 -translate-y-1/2">
                                            <div className="h-0.5 w-full bg-gray-200 rounded-full overflow-hidden">
                                                <motion.div
                                                    className="h-full bg-blue-600 origin-left"
                                                    initial={{ scaleX: 0 }}
                                                    animate={{
                                                        scaleX: processingStatus === 'ready' ? 1
                                                            : processingStatus === 'vectorizing' ? 0.75
                                                                : processingStatus === 'processing' ? 0.5
                                                                    : 0.15
                                                    }}
                                                    transition={{ duration: 0.5, ease: "easeInOut" }}
                                                />
                                            </div>
                                        </div>

                                        {/* Steps */}
                                        {[
                                            { id: 'uploading', label: 'Upload', icon: Upload },
                                            { id: 'processing', label: 'Extract', icon: FileText },
                                            { id: 'vectorizing', label: 'Vectorize', icon: Loader2 },
                                            { id: 'ready', label: 'Ready', icon: CheckCircle2 }
                                        ].map((step, index) => {
                                            const stepOrder = ['uploading', 'processing', 'vectorizing', 'ready'];
                                            const currentStepIndex = stepOrder.indexOf(processingStatus || 'uploading');
                                            const stepIndex = stepOrder.indexOf(step.id);
                                            const isActive = stepIndex <= currentStepIndex;
                                            const isCurrent = step.id === processingStatus;

                                            return (
                                                <div key={step.id} className="relative flex flex-col items-center z-10" style={{ minWidth: '60px' }}>
                                                    <motion.div
                                                        className={`
                                                            w-8 h-8 rounded-full flex items-center justify-center border-2 bg-white transition-colors duration-300
                                                            ${isActive ? 'border-blue-600 text-blue-600' : 'border-gray-200 text-gray-400'}
                                                            ${isCurrent ? 'ring-4 ring-blue-50' : ''}
                                                        `}
                                                        animate={{
                                                            scale: isCurrent ? 1.1 : 1,
                                                            borderColor: isActive ? '#2563eb' : '#e5e7eb'
                                                        }}
                                                    >
                                                        {isActive && !isCurrent && step.id !== 'ready' ? (
                                                            <CheckCircle2 className="w-5 h-5" />
                                                        ) : (
                                                            <step.icon className={`w-4 h-4 ${isCurrent && step.id !== 'ready' ? 'animate-spin' : ''}`} />
                                                        )}
                                                    </motion.div>
                                                    <span className={`mt-2 text-xs font-medium text-center transition-colors duration-300 ${isActive ? 'text-gray-900' : 'text-gray-400'}`}>
                                                        {step.label}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm"
                            >
                                {error}
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
