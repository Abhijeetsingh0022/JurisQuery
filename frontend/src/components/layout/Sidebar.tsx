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
        <div className="flex h-[calc(100vh-2rem)] w-64 m-4 flex-col bg-[#2a3b4e] text-[#f7f3f1] rounded-2xl shadow-xl overflow-hidden">
            <div className="flex h-16 items-center justify-center px-6">
                <h1 className="text-2xl font-bold font-serif tracking-wide">JurisQuery</h1>
            </div>

            <div className="flex flex-1 flex-col justify-between px-4 pb-6 pt-4">
                <nav className="space-y-1">
                    {navigation.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    "group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                                    isActive
                                        ? "bg-[#ffffff]/10 text-white"
                                        : "text-[#f7f3f1]/80 hover:bg-[#ffffff]/5 hover:text-white"
                                )}
                            >
                                <item.icon
                                    className={cn(
                                        "mr-3 h-5 w-5 flex-shrink-0",
                                        isActive ? "text-white" : "text-[#f7f3f1]/70 group-hover:text-white"
                                    )}
                                />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                <div className="border-t border-[#ffffff]/10 pt-4 space-y-1">
                    <Link
                        href="/help"
                        className="group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium text-[#f7f3f1]/80 transition-colors hover:bg-[#ffffff]/5 hover:text-white"
                    >
                        <HelpCircle className="mr-3 h-5 w-5 flex-shrink-0 text-[#f7f3f1]/70 group-hover:text-white" />
                        Help & Support
                    </Link>
                    <button
                        onClick={() => signOut({ redirectUrl: "/" })}
                        className="group flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium text-[#f7f3f1]/80 transition-colors hover:bg-[#ffffff]/5 hover:text-white hover:text-red-400"
                    >
                        <LogOut className="mr-3 h-5 w-5 flex-shrink-0 text-[#f7f3f1]/70 group-hover:text-white group-hover:text-red-400 transition-colors" />
                        Logout
                    </button>
                </div>
            </div>
        </div>
    );
}
