"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { Button } from "@/components/common/Button";
import { Menu, X } from "lucide-react";
import {
    SignedIn,
    SignedOut,
    UserButton,
} from "@clerk/nextjs";

export function Header() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const navLinks = [
        { name: "Features", href: "/features" },
        { name: "Pricing", href: "/pricing" },
        { name: "How It Works", href: "/#how-it-works" },
    ];

    return (
        <header
            className={cn(
                "fixed z-50 transition-all duration-700 cubic-bezier(0.4, 0, 0.2, 1)",
                isScrolled
                    ? "top-6 left-1/2 -translate-x-1/2 w-[90%] max-w-5xl rounded-full bg-white/40 backdrop-blur-3xl backdrop-saturate-150 border border-white/50 shadow-2xl py-3 ring-1 ring-white/50"
                    : "top-0 left-0 right-0 w-full bg-transparent py-6 border-b border-transparent shadow-none rounded-none"
            )}
        >
            <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-3 group">
                    <span className="font-serif text-xl md:text-2xl font-bold text-primary tracking-tight group-hover:text-primary/90 transition-colors">
                        JurisQuery.
                    </span>
                </Link>

                {/* Desktop Nav */}
                <nav className="hidden md:flex items-center gap-8">
                    {navLinks.map((link) => (
                        <Link
                            key={link.name}
                            href={link.href}
                            className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors"
                        >
                            {link.name}
                        </Link>
                    ))}

                    <SignedOut>
                        <Link href="/sign-in">
                            <Button variant="ghost" className="font-medium">
                                Sign In
                            </Button>
                        </Link>
                        <Link href="/sign-up">
                            <Button className="rounded-full font-semibold shadow-md hover:shadow-lg">
                                Get Started
                            </Button>
                        </Link>
                    </SignedOut>

                    <SignedIn>
                        <UserButton
                            appearance={{
                                elements: {
                                    avatarBox: "w-10 h-10",
                                    userButtonPopoverCard: "shadow-2xl border-0 rounded-2xl bg-white",
                                    userButtonPopoverFooter: "hidden", // Hide "Secured by Clerk" from popover
                                    userButtonPopoverActionButton: "hover:bg-soft-cream text-foreground",
                                    userButtonPopoverActionButtonText: "text-foreground font-medium",
                                    userButtonPopoverActionButtonIcon: "text-primary",
                                },
                                variables: {
                                    colorPrimary: "#2a3b4e",
                                    colorText: "#1a1a1a",
                                    colorBackground: "#ffffff",
                                    colorInputBackground: "#f9fafb",
                                    borderRadius: "0.75rem",
                                }
                            }}
                            userProfileProps={{
                                appearance: {
                                    elements: {
                                        card: "shadow-2xl border-0 rounded-2xl bg-white",
                                        footer: "hidden", // Hide "Secured by Clerk" from modal
                                        navbar: "hidden",
                                        headerTitle: "font-serif text-2xl text-primary font-bold",
                                        headerSubtitle: "text-foreground/70",
                                    },
                                    variables: {
                                        colorPrimary: "#2a3b4e",
                                        colorText: "#1a1a1a",
                                        colorBackground: "#ffffff",
                                        borderRadius: "0.75rem",
                                    }
                                }
                            }}
                        />
                    </SignedIn>
                </nav>

                {/* Mobile Menu Toggle */}
                <button
                    className="md:hidden p-2 text-foreground"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile Nav */}
            {isMobileMenuOpen && (
                <div className="md:hidden absolute top-full left-0 right-0 bg-background border-b border-gray-200 p-4 shadow-lg animate-fade-in">
                    <nav className="flex flex-col gap-4">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                href={link.href}
                                className="text-base font-medium text-foreground hover:text-primary py-2"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                {link.name}
                            </Link>
                        ))}

                        <SignedOut>
                            <Link href="/sign-in" onClick={() => setIsMobileMenuOpen(false)}>
                                <Button variant="outline" className="w-full">
                                    Sign In
                                </Button>
                            </Link>
                            <Link href="/sign-up" onClick={() => setIsMobileMenuOpen(false)}>
                                <Button className="w-full">
                                    Get Started
                                </Button>
                            </Link>
                        </SignedOut>

                        <SignedIn>
                            <div className="flex items-center gap-3 py-2">
                                <UserButton
                                    appearance={{
                                        elements: {
                                            avatarBox: "w-10 h-10",
                                            userButtonPopoverCard: "shadow-2xl border-0 rounded-2xl bg-white",
                                            userButtonPopoverFooter: "hidden",
                                        },
                                        variables: {
                                            colorPrimary: "#2a3b4e",
                                            borderRadius: "0.75rem",
                                        }
                                    }}
                                />
                                <span className="text-sm text-foreground/70">My Account</span>
                            </div>
                        </SignedIn>
                    </nav>
                </div>
            )}
        </header>
    );
}
