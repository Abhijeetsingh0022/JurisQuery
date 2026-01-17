"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error(error);
    }, [error]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-soft-cream relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 z-0 opacity-40">
                <div className="absolute top-0 -left-4 w-72 h-72 bg-primary/5 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
                <div className="absolute top-0 -right-4 w-72 h-72 bg-secondary/5 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-8 left-20 w-72 h-72 bg-primary/10 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
            </div>

            <div className="relative z-10 text-center px-4 max-w-lg mx-auto">
                <div className="mb-6 flex justify-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" x2="12" y1="9" y2="13" /><line x1="12" x2="12.01" y1="17" y2="17" /></svg>
                    </div>
                </div>
                <h1 className="font-serif text-3xl md:text-4xl font-bold text-primary mb-4">
                    Something went wrong
                </h1>
                <p className="text-foreground/70 text-lg mb-8">
                    We apologize for the inconvenience. An unexpected error has occurred.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <button
                        onClick={reset}
                        className="px-8 py-3 rounded-full bg-primary text-primary-foreground font-medium transition-all hover:bg-primary/90 hover:shadow-lg hover:-translate-y-0.5 w-full sm:w-auto"
                    >
                        Try again
                    </button>
                    <Link
                        href="/"
                        className="px-8 py-3 rounded-full bg-white border border-gray-200 text-foreground font-medium transition-all hover:bg-gray-50 hover:shadow-md hover:-translate-y-0.5 w-full sm:w-auto"
                    >
                        Return Home
                    </Link>
                </div>
            </div>
        </div>
    );
}
