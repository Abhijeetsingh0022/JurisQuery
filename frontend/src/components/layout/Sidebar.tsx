"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import {
    LayoutDashboard,
    FolderOpen,
    Scale,
    History,
    Settings,
    HelpCircle,
    LogOut,
    CreditCard,
    ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Documents", href: "/documents", icon: FolderOpen },
    { name: "IPC Predictor", href: "/ipc-predictor", icon: Scale },
    { name: "History", href: "/history", icon: History },
    { name: "Subscription", href: "/subscription", icon: CreditCard },
    { name: "Admin Console", href: "/admin", icon: ShieldCheck },
    { name: "Settings", href: "/settings", icon: Settings },
];

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useApi } from "@/hooks/use-api";

export default function Sidebar({ onClose }: { onClose?: () => void }) {
    const pathname = usePathname();
    const { signOut } = useClerk();
    const { user } = useUser();
    const { fetcher } = useApi();
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        if (!user) return;
        fetcher("/api/auth/me")
            .then((res: any) => {
                if (res?.is_admin) setIsAdmin(true);
            })
            .catch(() => {});
    }, [user, fetcher]);

    return (
        <div className="flex h-full md:h-[calc(100vh-2rem)] w-[280px] md:m-4 flex-col bg-[#0f172a] text-white rounded-lg shadow-2xl border-r border-white/5 md:border-0 overflow-hidden relative shrink-0">
            <div className="flex-1 flex flex-col overflow-y-auto scrollbar-hide">
                {/* Header */}
            <div className="px-8 pt-10 pb-8">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#d97706] to-[#f59e0b] flex items-center justify-center shadow-lg shadow-amber-900/20">
                        <Scale className="h-5 w-5 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold font-serif tracking-tight">JurisQuery</h1>
                </div>
                <div className="mt-6 h-px w-full bg-gradient-to-r from-white/10 to-transparent" />
            </div>

            {/* Navigation */}
            <div className="flex flex-1 flex-col justify-between px-4 pb-8">
                <nav className="space-y-1.5">
                    <p className="px-4 mb-4 text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Operations</p>
                    {navigation.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={onClose}
                                className={cn(
                                    "group flex items-center gap-4 rounded-lg px-4 py-3 text-[14px] font-semibold transition-all duration-300 relative overflow-hidden",
                                    isActive
                                        ? "bg-white/10 text-white"
                                        : "text-white/40 hover:text-white/80 hover:bg-white/[0.03]"
                                )}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="active-pill"
                                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#d97706] rounded-r-full"
                                    />
                                )}
                                <item.icon
                                    className={cn(
                                        "h-5 w-5 transition-all duration-300",
                                        isActive ? "text-[#d97706] scale-110" : "text-white/20 group-hover:text-white/40"
                                    )}
                                />
                                <span className="flex-1 flex items-center justify-between">
                                    <span>{item.name}</span>
                                    {item.href === "/admin" && isAdmin && (
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                            Admin
                                        </span>
                                    )}
                                </span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="space-y-2 pt-6">
                    <div className="mx-4 h-px bg-white/5 mb-6" />
                    <Link
                        href="/help"
                        onClick={onClose}
                        className="group flex items-center gap-4 rounded-lg px-4 py-3 text-[13px] font-medium text-white/30 transition-all hover:bg-white/5 hover:text-white/60"
                    >
                        <HelpCircle className="h-5 w-5 text-white/20 group-hover:text-white/40" />
                        Help & Support
                    </Link>
                    <button
                        onClick={() => signOut({ redirectUrl: "/" })}
                        className="group flex w-full items-center gap-4 rounded-lg px-4 py-3 text-[13px] font-bold text-red-400/50 transition-all hover:bg-red-500/10 hover:text-red-400"
                    >
                        <LogOut className="h-5 w-5 opacity-40 group-hover:opacity-100" />
                        Log Out
                    </button>
                </div>
                </div>
            </div>
        </div>
    );
}
