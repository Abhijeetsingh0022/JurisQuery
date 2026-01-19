import { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Loader2, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, RotateCw } from 'lucide-react';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure worker only on client-side to avoid SSR issues
if (typeof window !== 'undefined') {
    pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

interface PDFViewerProps {
    url: string;
    className?: string;
    activeCitation?: {
        page_number: number | null;
        content?: string;
    } | null;
}

export default function PDFViewer({ url, className = '', activeCitation }: PDFViewerProps) {
    const [numPages, setNumPages] = useState<number>(0);
    const [pageNumber, setPageNumber] = useState<number>(1);
    const [scale, setScale] = useState<number>(1.0);
    const [rotation, setRotation] = useState<number>(0);
    const [containerWidth, setContainerWidth] = useState<number>(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const [highlightedPage, setHighlightedPage] = useState<number | null>(null);

    // Track if we are programmatically scrolling to avoid jittery updates
    const isScrollingRef = useRef(false);

    // Function to highlight text in the PDF text layer
    const highlightTextInPage = (pageNum: number, searchText: string) => {
        if (!searchText || searchText.length < 20) return;

        // Wait for text layer to render
        setTimeout(() => {
            const pageElement = document.getElementById(`page-${pageNum}`);
            if (!pageElement) return;

            const textLayer = pageElement.querySelector('.react-pdf__Page__textContent');
            if (!textLayer) return;

            // Clear previous highlights
            const prevHighlights = textLayer.querySelectorAll('.citation-highlight');
            prevHighlights.forEach(el => {
                el.classList.remove('citation-highlight');
            });

            // Get first 50 chars of the search text for matching
            const searchSnippet = searchText.slice(0, 50).toLowerCase().replace(/\s+/g, ' ').trim();

            // Find and highlight matching text spans
            const textSpans = textLayer.querySelectorAll('span');
            let foundMatch = false;

            textSpans.forEach((span) => {
                const text = span.textContent?.toLowerCase().replace(/\s+/g, ' ').trim() || '';
                if (text.length > 10 && searchSnippet.includes(text.slice(0, 20))) {
                    span.classList.add('citation-highlight');
                    foundMatch = true;
                }
            });

            // If no exact match, just log warning
            if (!foundMatch) {
                console.warn('Citation text match failed for:', searchSnippet);
            }
        }, 800);
    };

    useEffect(() => {
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.contentBoxSize) {
                    setContainerWidth(entry.contentBoxSize[0].inlineSize);
                } else {
                    setContainerWidth(entry.contentRect.width);
                }
            }
        });

        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        return () => {
            resizeObserver.disconnect();
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, []);

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
        // Reset to page 1 on new doc load
        if (pageNumber !== 1) {
            scrollToPage(1);
        }
    };

    // Scroll to specific page with optional highlight
    const scrollToPage = (page: number, highlight: boolean = false) => {
        const pageElement = document.getElementById(`page-${page}`);
        if (pageElement && containerRef.current) {
            isScrollingRef.current = true;
            setPageNumber(page);

            // Set highlight if requested
            if (highlight) {
                setHighlightedPage(page);
                // Clear highlight after 3 seconds
                setTimeout(() => {
                    setHighlightedPage(null);
                }, 3000);
            }

            pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // Reset scrolling lock after animation
            setTimeout(() => {
                isScrollingRef.current = false;
            }, 500);
        }
    };

    // Effect to jump to citation page with highlight
    useEffect(() => {
        if (activeCitation && activeCitation.page_number) {
            scrollToPage(activeCitation.page_number, true);

            // Highlight specific text if content is provided
            if (activeCitation.content) {
                highlightTextInPage(activeCitation.page_number, activeCitation.content);
            }
        }
    }, [activeCitation]);

    // Setup intersection observer to track current page
    useEffect(() => {
        if (numPages === 0) return;

        const options = {
            root: containerRef.current,
            rootMargin: '-40% 0px -40% 0px', // Trigger when page is in middle 20% of viewport
            threshold: 0
        };

        observerRef.current = new IntersectionObserver((entries) => {
            if (isScrollingRef.current) return;

            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const pageId = entry.target.id;
                    const pageNum = parseInt(pageId.replace('page-', ''));
                    if (!isNaN(pageNum)) {
                        setPageNumber(pageNum);
                    }
                }
            });
        }, options);

        // Observe all page elements
        for (let i = 1; i <= numPages; i++) {
            const el = document.getElementById(`page-${i}`);
            if (el) observerRef.current.observe(el);
        }

        return () => {
            if (observerRef.current) observerRef.current.disconnect();
        };
    }, [numPages]); // Re-run when numPages changes

    const changePage = (offset: number) => {
        const newPage = Math.min(Math.max(1, pageNumber + offset), numPages);
        scrollToPage(newPage);
    };

    const zoomOut = () => setScale(prev => Math.max(0.5, prev - 0.1));
    const zoomIn = () => setScale(prev => Math.min(2.5, prev + 0.1));

    return (
        <div className={`flex flex-col h-full bg-gray-100 rounded-lg overflow-hidden border border-gray-200 ${className}`}>
            {/* Toolbar */}
            <div className="flex items-center justify-between p-2 bg-white border-b border-gray-200 shadow-sm z-10">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => changePage(-1)}
                        disabled={pageNumber <= 1}
                        className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-50 text-gray-700"
                        title="Previous Page"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-sm font-medium text-gray-700 min-w-[4rem] text-center">
                        {pageNumber} / {numPages || '--'}
                    </span>
                    <button
                        onClick={() => changePage(1)}
                        disabled={pageNumber >= numPages}
                        className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-50 text-gray-700"
                        title="Next Page"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={zoomOut}
                        className="p-1.5 rounded-md hover:bg-gray-100 text-gray-700"
                        title="Zoom Out"
                    >
                        <ZoomOut className="h-4 w-4" />
                    </button>
                    <span className="text-xs text-gray-500 w-12 text-center">
                        {Math.round(scale * 100)}%
                    </span>
                    <button
                        onClick={zoomIn}
                        className="p-1.5 rounded-md hover:bg-gray-100 text-gray-700"
                        title="Zoom In"
                    >
                        <ZoomIn className="h-4 w-4" />
                    </button>
                    <div className="w-px h-4 bg-gray-300 mx-1" />
                    <button
                        onClick={() => setRotation(r => (r + 90) % 360)}
                        className="p-1.5 rounded-md hover:bg-gray-100 text-gray-700"
                        title="Rotate"
                    >
                        <RotateCw className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Viewer Area */}
            <div className="flex-1 overflow-auto relative bg-gray-50/50" ref={containerRef}>
                <Document
                    file={url}
                    onLoadSuccess={onDocumentLoadSuccess}
                    loading={
                        <div className="flex items-center justify-center p-10 h-full">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    }
                    error={
                        <div className="flex flex-col items-center justify-center p-10 h-full text-red-500">
                            <p className="font-medium">Failed to load PDF</p>
                            <p className="text-sm">Please try downloading directly.</p>
                        </div>
                    }
                    className="flex flex-col items-center py-8 gap-6"
                >
                    {numPages > 0 && Array.from(new Array(numPages), (el, index) => (
                        <div
                            key={`page-${index + 1}`}
                            id={`page-${index + 1}`}
                            className={`shadow-lg transition-all duration-300 ${highlightedPage === index + 1
                                ? 'ring-4 ring-blue-500 ring-offset-4 rounded-sm'
                                : ''
                                }`}
                        >
                            <Page
                                pageNumber={index + 1}
                                scale={scale}
                                width={containerWidth ? Math.min(containerWidth - 48, 800 * scale) : undefined}
                                rotate={rotation}
                                renderTextLayer={true}
                                renderAnnotationLayer={true}
                                className="bg-white"
                                loading={
                                    <div className="bg-white animate-pulse" style={{
                                        width: containerWidth ? Math.min(containerWidth - 48, 800 * scale) : 600,
                                        height: (containerWidth ? Math.min(containerWidth - 48, 800 * scale) : 600) * 1.4 // Approx A4 ratio
                                    }} />
                                }
                            />
                        </div>
                    ))}
                </Document>
            </div>
        </div>
    );
}
