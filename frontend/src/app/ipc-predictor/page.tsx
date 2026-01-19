'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Scale,
    Search,
    AlertCircle,
    Shield,
    Clock,
    Building2,
    ChevronRight,
    Loader2,
    FileText
} from 'lucide-react';

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

export default function IPCPredictorPage() {
    const [description, setDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<PredictionResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handlePredict = async () => {
        if (!description.trim() || description.length < 20) {
            setError('Please provide a detailed description (at least 20 characters)');
            return;
        }

        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await fetch('/api/v1/ipc/predict', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    description: description.trim(),
                    max_sections: 5,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to predict IPC sections');
            }

            const data = await response.json();

            if (data.error) {
                setError(data.error);
                return;
            }

            setResult(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const getConfidenceColor = (confidence: number) => {
        if (confidence >= 0.8) return 'text-green-600';
        if (confidence >= 0.6) return 'text-yellow-600';
        return 'text-orange-600';
    };

    const getConfidenceBg = (confidence: number) => {
        if (confidence >= 0.8) return 'bg-green-50 border-green-200';
        if (confidence >= 0.6) return 'bg-yellow-50 border-yellow-200';
        return 'bg-orange-50 border-orange-200';
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-100 mb-4">
                        <Scale className="w-8 h-8 text-blue-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        IPC Section Predictor
                    </h1>
                    <p className="text-gray-600 max-w-xl mx-auto">
                        Describe a crime or incident and get predicted applicable IPC sections
                        with legal classification and punishment details.
                    </p>
                </div>

                {/* Input Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Describe the Crime or Incident
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="e.g., A person broke into a house at night and stole jewelry worth Rs. 50,000. The owner was not present at that time..."
                        className="w-full h-40 p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-900 placeholder:text-gray-400"
                    />
                    <div className="flex items-center justify-between mt-4">
                        <span className="text-sm text-gray-500">
                            {description.length} / 5000 characters
                        </span>
                        <button
                            onClick={handlePredict}
                            disabled={isLoading || description.length < 20}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    <Search className="w-5 h-5" />
                                    Predict IPC Sections
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Error Message */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl mb-6 text-red-700"
                        >
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <p>{error}</p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Results */}
                <AnimatePresence>
                    {result && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                        >
                            {/* Stats */}
                            <div className="flex items-center gap-4 mb-6 text-sm text-gray-500">
                                <span>Searched {result.total_sections_searched} sections</span>
                                <span>•</span>
                                <span>{result.processing_time_ms.toFixed(0)}ms</span>
                                <span>•</span>
                                <span>{result.predicted_sections.length} matches found</span>
                            </div>

                            {/* Predicted Sections */}
                            {result.predicted_sections.length > 0 ? (
                                <div className="space-y-4">
                                    {result.predicted_sections.map((prediction, index) => (
                                        <motion.div
                                            key={prediction.section.section_number}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                            className={`bg-white rounded-xl border p-5 ${getConfidenceBg(prediction.confidence)}`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gray-900 text-white font-bold">
                                                        {prediction.section.section_number}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-gray-900">
                                                            IPC Section {prediction.section.section_number}
                                                        </h3>
                                                        <p className="text-sm text-gray-600">
                                                            {prediction.section.offense || 'No offense title'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className={`text-right ${getConfidenceColor(prediction.confidence)}`}>
                                                    <div className="text-2xl font-bold">
                                                        {(prediction.confidence * 100).toFixed(0)}%
                                                    </div>
                                                    <div className="text-xs uppercase tracking-wide">
                                                        Confidence
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Reasoning */}
                                            <p className="mt-4 text-gray-700 bg-white/50 rounded-lg p-3">
                                                {prediction.reasoning}
                                            </p>

                                            {/* Legal Info */}
                                            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Clock className="w-4 h-4 text-gray-400" />
                                                    <span className="text-gray-600 truncate">
                                                        {prediction.section.punishment || 'N/A'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Shield className={`w-4 h-4 ${prediction.section.cognizable ? 'text-red-500' : 'text-green-500'}`} />
                                                    <span className="text-gray-600">
                                                        {prediction.section.cognizable ? 'Cognizable' : 'Non-Cognizable'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Building2 className={`w-4 h-4 ${prediction.section.bailable ? 'text-green-500' : 'text-red-500'}`} />
                                                    <span className="text-gray-600">
                                                        {prediction.section.bailable ? 'Bailable' : 'Non-Bailable'}
                                                    </span>
                                                </div>
                                                <button className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700">
                                                    View Details
                                                    <ChevronRight className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                                        No Matching Sections Found
                                    </h3>
                                    <p className="text-gray-500">
                                        Try providing more details about the incident.
                                    </p>
                                </div>
                            )}

                            {/* Disclaimer */}
                            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                                <p className="text-sm text-amber-800">
                                    <strong>Disclaimer:</strong> This tool provides AI-assisted predictions for educational
                                    purposes only. Always consult a qualified legal professional for accurate legal advice.
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
