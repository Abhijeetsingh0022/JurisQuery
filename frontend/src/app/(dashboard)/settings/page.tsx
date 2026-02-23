'use client';

import { useUser } from '@clerk/nextjs';
import { User, Mail, Shield, Key, Calendar, ExternalLink, Settings } from 'lucide-react';
import Image from 'next/image';

export default function SettingsPage() {
    const { user } = useUser();

    const memberSince = user?.createdAt
        ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        : null;

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2a3b4e] to-[#4a6b8e] flex items-center justify-center shadow-lg shadow-[#2a3b4e]/15">
                    <Settings className="h-4.5 w-4.5 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold font-serif text-[#1a2332]">Settings</h1>
                    <p className="text-xs text-[#2a3b4e]/35">Manage your account and preferences</p>
                </div>
            </div>

            <div className="max-w-2xl space-y-4">
                {/* Profile Card */}
                <div className="bg-white rounded-xl border border-[#e8e2de] overflow-hidden">
                    <div className="px-5 py-3.5 bg-[#faf8f6] border-b border-[#e8e2de] flex items-center gap-2">
                        <User className="h-3.5 w-3.5 text-[#2a3b4e]/25" />
                        <span className="text-[11px] font-bold text-[#2a3b4e]/30 uppercase tracking-wider">Profile</span>
                    </div>

                    <div className="p-5">
                        <div className="flex items-center gap-4 mb-5">
                            <div className="relative w-16 h-16 rounded-xl overflow-hidden ring-2 ring-[#e8e2de] shrink-0">
                                {user?.imageUrl ? (
                                    <Image
                                        src={user.imageUrl}
                                        alt="Profile"
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="h-full w-full bg-gradient-to-br from-[#2a3b4e] to-[#4a6b8e] flex items-center justify-center text-white text-xl font-serif">
                                        {user?.firstName?.charAt(0) || 'U'}
                                    </div>
                                )}
                            </div>
                            <div>
                                <h3 className="text-[15px] font-bold text-[#1a2332]">{user?.fullName}</h3>
                                <p className="text-[12px] text-[#2a3b4e]/30 font-medium mt-0.5">{user?.primaryEmailAddress?.emailAddress}</p>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200">
                                        <Shield className="h-2.5 w-2.5" />
                                        Verified
                                    </span>
                                    {memberSince && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#f7f3f1] text-[#2a3b4e]/25 ring-1 ring-[#e8e2de]">
                                            <Calendar className="h-2.5 w-2.5" />
                                            Since {memberSince}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Info Fields */}
                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] font-bold text-[#2a3b4e]/20 uppercase tracking-wider mb-1.5 block">Full Name</label>
                                <div className="flex items-center gap-3 bg-[#faf8f6] border border-[#e8e2de] rounded-lg px-3.5 py-2.5">
                                    <User className="h-3.5 w-3.5 text-[#2a3b4e]/15 shrink-0" />
                                    <span className="text-[13px] font-medium text-[#1a2332]">{user?.fullName || '—'}</span>
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-[#2a3b4e]/20 uppercase tracking-wider mb-1.5 block">Email Address</label>
                                <div className="flex items-center gap-3 bg-[#faf8f6] border border-[#e8e2de] rounded-lg px-3.5 py-2.5">
                                    <Mail className="h-3.5 w-3.5 text-[#2a3b4e]/15 shrink-0" />
                                    <span className="text-[13px] font-medium text-[#1a2332]">{user?.primaryEmailAddress?.emailAddress || '—'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Security Card */}
                <div className="bg-white rounded-xl border border-[#e8e2de] overflow-hidden">
                    <div className="px-5 py-3.5 bg-[#faf8f6] border-b border-[#e8e2de] flex items-center gap-2">
                        <Key className="h-3.5 w-3.5 text-[#2a3b4e]/25" />
                        <span className="text-[11px] font-bold text-[#2a3b4e]/30 uppercase tracking-wider">Security</span>
                    </div>

                    <div className="p-5 space-y-3">
                        <div className="flex items-center justify-between bg-[#faf8f6] border border-[#e8e2de] rounded-lg px-4 py-3">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                                    <Shield className="h-3.5 w-3.5 text-emerald-500" />
                                </div>
                                <div>
                                    <p className="text-[12px] font-semibold text-[#1a2332]">Authentication</p>
                                    <p className="text-[10px] text-[#2a3b4e]/25 font-medium">Managed by Clerk</p>
                                </div>
                            </div>
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                Active
                            </span>
                        </div>

                        <div className="flex items-center justify-between bg-[#faf8f6] border border-[#e8e2de] rounded-lg px-4 py-3">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                    <Mail className="h-3.5 w-3.5 text-blue-500" />
                                </div>
                                <div>
                                    <p className="text-[12px] font-semibold text-[#1a2332]">Email Verification</p>
                                    <p className="text-[10px] text-[#2a3b4e]/25 font-medium">{user?.primaryEmailAddress?.emailAddress}</p>
                                </div>
                            </div>
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                Verified
                            </span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-center gap-1.5 text-[10px] text-[#2a3b4e]/12 font-medium py-2">
                    <Shield className="h-3 w-3" />
                    Account managed via secure authentication provider
                </div>
            </div>
        </div>
    );
}
