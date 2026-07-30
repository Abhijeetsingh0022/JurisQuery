'use client';

import { useUser } from '@clerk/nextjs';
import { User, Mail, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';

export default function SettingsPage() {
    const { user } = useUser();

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-serif font-bold text-[#2a3b4e]">Settings</h1>
                <p className="text-[#2a3b4e]/70 mt-2 font-medium">Manage your account preferences and settings.</p>
            </div>

            <div className="max-w-3xl mx-auto">
                {/* Profile Section */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-2xl shadow-sm border border-[#2a3b4e]/5 overflow-hidden"
                >
                    <div className="p-6 border-b border-[#2a3b4e]/5 bg-gradient-to-r from-[#f7f3f1]/50 to-transparent">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-[#2a3b4e]/5 rounded-xl text-[#2a3b4e]">
                                <User className="h-5 w-5" />
                            </div>
                            <h2 className="text-lg font-bold text-[#2a3b4e]">Profile Information</h2>
                        </div>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="relative h-20 w-20 rounded-2xl overflow-hidden ring-4 ring-[#f7f3f1]">
                                {user?.imageUrl ? (
                                    <Image
                                        src={user.imageUrl}
                                        alt="Profile"
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="h-full w-full bg-[#2a3b4e] flex items-center justify-center text-white text-2xl font-serif">
                                        {user?.firstName?.charAt(0) || 'U'}
                                    </div>
                                )}
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-[#2a3b4e]">{user?.fullName}</h3>
                                <p className="text-sm text-[#2a3b4e]/60">{user?.primaryEmailAddress?.emailAddress}</p>
                                <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                                    <Shield className="h-3 w-3 mr-1" />
                                    Verified Account
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="group">
                                <label className="block text-sm font-semibold text-[#2a3b4e]/80 mb-1.5 ml-1">Full Name</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        defaultValue={user?.fullName || ""}
                                        readOnly
                                        className="block w-full rounded-xl border-transparent bg-[#f7f3f1] text-[#2a3b4e] px-4 py-3 focus:border-[#2a3b4e]/20 focus:bg-white focus:ring-0 transition-all font-medium cursor-default"
                                    />
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                        <Shield className="h-4 w-4 text-[#2a3b4e]/20" />
                                    </div>
                                </div>
                            </div>

                            <div className="group">
                                <label className="block text-sm font-semibold text-[#2a3b4e]/80 mb-1.5 ml-1">Email Address</label>
                                <div className="relative">
                                    <input
                                        type="email"
                                        defaultValue={user?.primaryEmailAddress?.emailAddress || ""}
                                        readOnly
                                        className="block w-full rounded-xl border-transparent bg-[#f7f3f1] text-[#2a3b4e] px-4 py-3 focus:border-[#2a3b4e]/20 focus:bg-white focus:ring-0 transition-all font-medium cursor-default"
                                    />
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                        <Mail className="h-4 w-4 text-[#2a3b4e]/20" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-[#2a3b4e]/5">
                            <p className="text-xs text-[#2a3b4e]/50 flex items-center justify-center bg-[#f7f3f1]/50 py-2 rounded-lg">
                                <Shield className="h-3 w-3 mr-1.5" />
                                managed via secure authentication provider
                            </p>
                        </div>
                    </div>
                </motion.section>
            </div>
        </div>
    );
}
