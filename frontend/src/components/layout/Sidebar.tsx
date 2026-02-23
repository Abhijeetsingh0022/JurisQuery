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
    LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Documents", href: "/documents", icon: FolderOpen },
    { name: "IPC Predictor", href: "/ipc-predictor", icon: Scale },
    { name: "History", href: "/history", icon: History },
    { name: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
    const pathname = usePathname();
    const { signOut } = useClerk();

    return (
        <div className="flex h-[calc(100vh-2rem)] w-[240px] m-4 flex-col bg-[#1a2332] text-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Logo / Brand */}
            <div className="px-6 pt-7 pb-6 flex items-center justify-center">
                <h1 className="text-2xl font-bold font-serif tracking-wide">JurisQuery</h1>
            </div>

            {/* Navigation */}
            <div className="flex flex-1 flex-col justify-between px-3 pb-5">
                <nav className="space-y-0.5">
                    <p className="px-3 mb-2 text-[9px] font-bold text-white/15 uppercase tracking-widest">Menu</p>
                    {navigation.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200",
                                    isActive
                                        ? "bg-white/10 text-white shadow-sm backdrop-blur-sm"
                                        : "text-white/35 hover:bg-white/5 hover:text-white/70"
                                )}
                            >
                                <div className={cn(
                                    "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                                    isActive
                                        ? "bg-gradient-to-br from-white/15 to-white/5"
                                        : "bg-white/[0.03] group-hover:bg-white/5"
                                )}>
                                    <item.icon
                                        className={cn(
                                            "h-4 w-4 transition-colors",
                                            isActive ? "text-white" : "text-white/25 group-hover:text-white/50"
                                        )}
                                    />
                                </div>
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                <div className="space-y-0.5">
                    <div className="border-t border-white/5 mb-3 mx-2" />
                    <Link
                        href="/help"
                        className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-white/30 transition-all hover:bg-white/5 hover:text-white/60"
                    >
                        <div className="w-8 h-8 rounded-lg bg-white/[0.03] flex items-center justify-center group-hover:bg-white/5 transition-all">
                            <HelpCircle className="h-4 w-4 text-white/20 group-hover:text-white/40 transition-colors" />
                        </div>
                        Help & Support
                    </Link>
                    <button
                        onClick={() => signOut({ redirectUrl: "/" })}
                        className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-white/30 transition-all hover:bg-red-500/10 hover:text-red-400"
                    >
                        <div className="w-8 h-8 rounded-lg bg-white/[0.03] flex items-center justify-center group-hover:bg-red-500/10 transition-all">
                            <LogOut className="h-4 w-4 text-white/20 group-hover:text-red-400 transition-colors" />
                        </div>
                        Logout
                    </button>
                </div>
            </div>
        </div>
    );
}
