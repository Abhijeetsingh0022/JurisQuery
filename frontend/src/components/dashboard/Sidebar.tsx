'use client';

import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import {
    LayoutDashboard, FolderOpen, History, Settings, HelpCircle
} from 'lucide-react';

const navLinks = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard', active: true },
    { icon: FolderOpen, label: 'Documents', href: '/dashboard', active: false },
    { icon: History, label: 'History', href: '#', active: false },
    { icon: Settings, label: 'Settings', href: '#', active: false },
];

export default function Sidebar() {
    const { user } = useUser();

    return (
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
            {/* Logo */}
            <div className="h-16 flex items-center px-6 border-b border-gray-100">
                <Link href="/" className="flex items-center gap-2">
                    <span className="font-serif font-bold text-xl text-primary">JurisQuery</span>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1">
                {navLinks.map((link) => (
                    <Link
                        key={link.label}
                        href={link.href}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${link.active
                            ? 'bg-primary/10 text-primary'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                            }`}
                    >
                        <link.icon className="h-5 w-5" />
                        {link.label}
                    </Link>
                ))}
            </nav>

            {/* Help & Support */}
            <div className="p-4 border-t border-gray-100">
                <Link
                    href="#"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                >
                    <HelpCircle className="h-5 w-5" />
                    Help & Support
                </Link>
            </div>

            {/* User Profile */}
            <div className="p-4 border-t border-gray-100">
                <div className="flex items-center gap-3 px-3 py-2">
                    <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                            {user?.firstName?.[0] || 'U'}
                        </span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                            {user?.firstName} {user?.lastName}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                            {user?.primaryEmailAddress?.emailAddress}
                        </p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
