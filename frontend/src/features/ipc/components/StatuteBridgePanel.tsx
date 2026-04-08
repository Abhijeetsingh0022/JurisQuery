'use client';

import React, { useState, useCallback, useEffect } from 'react';
import type { BridgeResult } from '@/types/api.types';
import { useApi } from '@/hooks/use-api';
import { ChevronDown, Scale, Loader2, AlertCircle, Shield, Building2, Clock, CheckCircle2, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface StatuteBridgePanelProps {
  ipcSectionNumber: string;
  onClose?: () => void;
}

// ---------------------------------------------------------------------------
// Change type metadata
// ---------------------------------------------------------------------------

const CHANGE_TYPE_CONFIG: Record<string, {
  label: string;
  emoji: string;
  badgeClass: string;
}> = {
  equivalent: {
    label: 'Equivalent',
    emoji: '🟢',
    badgeClass: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  },
  modified: {
    label: 'Modified',
    emoji: '🟡',
    badgeClass: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  },
  abolished: {
    label: 'Abolished',
    emoji: '🔴',
    badgeClass: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
  },
  split: {
    label: 'Split',
    emoji: '🔵',
    badgeClass: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  },
  merged: {
    label: 'Merged',
    emoji: '🔵',
    badgeClass: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  },
  new_in_bns: {
    label: 'New in BNS',
    emoji: '🆕',
    badgeClass: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
  },
  unknown: {
    label: 'Unknown',
    emoji: '⚪',
    badgeClass: 'bg-[#f7f3f1] text-[#2a3b4e]/70 ring-1 ring-[#e8e2de]',
  },
};

const getChangeConfig = (type: string) =>
  CHANGE_TYPE_CONFIG[type] ?? CHANGE_TYPE_CONFIG.unknown;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function LoadingState() {
  return (
    <div className="flex flex-col justify-center items-center h-full gap-4 py-20">
        <div className="relative w-12 h-12 flex items-center justify-center">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#2a3b4e] to-[#4a6b8e] opacity-20 animate-pulse" />
            <Loader2 className="h-6 w-6 animate-spin text-[#2a3b4e]" />
        </div>
        <span className="text-[13px] text-[#2a3b4e]/50 font-medium tracking-wide">Analysing statute mapping...</span>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="bg-red-50 text-red-600 px-4 py-3.5 rounded-xl border border-red-100 text-[13px] flex items-start gap-2.5 mt-4">
        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
        <span>{message}</span>
    </div>
  );
}

function SectionCard({
  label,
  sectionNumber,
  sectionName,
  description,
  badgeText,
}: {
  label: string;
  sectionNumber: string;
  sectionName: string | null;
  description: string;
  badgeText: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const isLong = description.length > 200;

  return (
    <div className="bg-white rounded-xl border border-[#e8e2de] overflow-hidden flex-1 flex flex-col">
      <div className="px-5 py-4 flex-1 flex flex-col">
        {/* Header with section number box */}
        <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2a3b4e] to-[#3d5a80] flex items-center justify-center shrink-0 shadow-sm relative">
                    <span className="text-white font-bold text-[11px]">{sectionNumber}</span>
                    <div className="absolute -bottom-1 -right-1 bg-white rounded-md text-[8px] font-bold px-1 py-0.5 border border-[#e8e2de] text-[#2a3b4e] shadow-sm uppercase tracking-wider">
                      {badgeText}
                    </div>
                </div>
                <div>
                    <h3 className="font-bold text-[#1a2332] text-[14px]">
                        Section {sectionNumber}
                    </h3>
                    <p className="text-[11px] text-[#2a3b4e]/45 mt-0.5 line-clamp-1">
                        {sectionName || 'Unspecified Offense'}
                    </p>
                </div>
            </div>
            {/* Tag (IPC/BNS 2023) */}
            <span className="text-[10px] font-bold text-[#1a2332]/50 uppercase tracking-wider">
               {label}
            </span>
        </div>

        {/* Text Area */}
        <div className="bg-[#faf8f6] rounded-lg px-4 py-3 border border-[#e8e2de]/50 flex-1 relative">
            <p className={`text-[12px] text-[#1a2332]/60 leading-relaxed italic transition-all duration-300 ${!expanded && isLong ? 'line-clamp-4' : ''}`}>
                &ldquo;{description}&rdquo;
            </p>
            {!expanded && isLong && (
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#faf8f6] to-transparent pointer-events-none rounded-b-lg" />
            )}
        </div>

        {/* Expand button */}
        {isLong && (
            <div className="flex items-center justify-between mt-3">
                <button 
                  onClick={() => setExpanded(!expanded)}
                  className="flex items-center gap-1.5 text-[11px] font-semibold text-[#2a3b4e]/30 hover:text-[#2a3b4e]/60 transition-colors"
                >
                    {expanded ? 'Hide details' : 'View details'}
                    <ChevronRight className={`h-3 w-3 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} />
                </button>
            </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function StatuteBridgePanel({
  ipcSectionNumber,
  onClose,
}: StatuteBridgePanelProps) {
  const { fetcher } = useApi();
  const [result, setResult] = useState<BridgeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  const fetchBridge = useCallback(async () => {
    if (hasFetched || !ipcSectionNumber) return;
    setLoading(true);
    setError(null);
    try {
      const data: BridgeResult = await fetcher(`/api/v1/ipc/bridge/${encodeURIComponent(ipcSectionNumber)}`);
      setResult(data);
      setHasFetched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch BNS mapping data');
    } finally {
      setLoading(false);
    }
  }, [ipcSectionNumber, hasFetched, fetcher]);

  // Auto-fetch on mount
  useEffect(() => {
    fetchBridge();
  }, [fetchBridge]);

  const config = result ? getChangeConfig(result.change_type) : null;

  return (
    <div className="flex flex-col h-full bg-[#fdfcfb]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8e2de] bg-[#faf8f6] flex-none">
          <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2a3b4e] to-[#4a6b8e] flex items-center justify-center shadow-lg shadow-[#2a3b4e]/20">
                  <Scale className="h-5 w-5 text-white" />
              </div>
              <div>
                  <h1 className="text-2xl font-bold font-serif text-[#1a2332] tracking-tight">Statute Bridge</h1>
                  <p className="text-xs text-[#2a3b4e]/40">Legacy IPC Section {ipcSectionNumber} → BNS 2023</p>
              </div>
          </div>
          {onClose && (
              <button
                  onClick={onClose}
                  className="bg-white border border-[#2a3b4e]/10 text-[#2a3b4e]/60 px-3 py-2 rounded-lg text-xs font-medium flex items-center hover:text-[#2a3b4e] hover:border-[#2a3b4e]/20 transition-all"
              >
                  <X className="mr-1.5 h-3 w-3" />
                  Close
              </button>
          )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {loading && <LoadingState />}
        {error && <ErrorState message={error} />}

        {result && config && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-5"
          >
            {/* Status tags */}
            <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${config.badgeClass}`}>
                    {config.emoji} {config.label}
                </span>
                {result.is_verified && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                        <CheckCircle2 className="h-3 w-3" />
                        Verified Mapping
                    </span>
                )}
            </div>

            {/* AI Summary Callout using standard reasoning styling */}
            <div className="bg-[#faf8f6] rounded-lg px-4 py-3 border border-[#e8e2de]/50 relative">
                <div className="text-[11px] font-bold text-[#1a2332]/50 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <AlertCircle className="h-3 w-3 text-[#2a3b4e]/50" /> Translation Summary
                </div>
                <p className="text-[12px] text-[#1a2332]/60 leading-relaxed italic">
                    &ldquo;{result.change_summary}&rdquo;
                </p>
            </div>

            {/* Side-by-side Cards */}
            <div className="flex flex-col md:flex-row gap-4 items-stretch relative mt-2">
              {/* IPC Card */}
              {result.ipc_section ? (
                <SectionCard
                  label="Legacy Code"
                  sectionNumber={result.ipc_section.section_number}
                  sectionName={result.ipc_section.offense}
                  description={result.ipc_section.punishment ?? 'See full text in database.'}
                  badgeText="Indian Penal Code (IPC)"
                />
              ) : (
                <div className="bg-white rounded-xl border border-[#e8e2de] overflow-hidden flex-1 flex flex-col items-center justify-center py-10 text-center">
                    <AlertCircle className="h-6 w-6 text-[#2a3b4e]/20 mb-2" />
                    <p className="text-[13px] font-medium text-[#2a3b4e]/40">IPC Section Not Found</p>
                </div>
              )}

              {/* Transformation Arrow */}
              <div className="hidden md:flex flex-col items-center justify-center px-1">
                  <div className="w-8 h-8 rounded-xl bg-[#faf8f6] border border-[#e8e2de] shadow-sm flex items-center justify-center text-[#2a3b4e]/30 z-10">
                      <ChevronRight className="h-4 w-4" />
                  </div>
              </div>

              {/* BNS Card */}
              {result.bns_section ? (
                <SectionCard
                  label="Modern Code"
                  sectionNumber={result.bns_section.section_number}
                  sectionName={result.bns_section.section_name}
                  description={result.bns_section.description}
                  badgeText="Bharatiya Nyaya Sanhita (BNS)"
                />
              ) : (
                <div className="bg-white rounded-xl border border-[#e8e2de] overflow-hidden flex-1 flex flex-col items-center justify-center py-10 text-center">
                    <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center mb-3 text-red-500 ring-1 ring-red-100">
                      <Shield className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-semibold text-[#1a2332]">No Equivalent Provision</p>
                    <p className="text-[11px] text-[#2a3b4e]/40 mt-1 max-w-[200px]">
                      This section was abolished or merged.
                    </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
