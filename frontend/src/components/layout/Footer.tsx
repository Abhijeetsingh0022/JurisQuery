import Link from "next/link";
import Image from "next/image";

export function Footer() {
    return (
        <footer className="bg-primary text-primary-foreground py-12">
            <div className="container mx-auto px-4 md:px-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                    <div className="col-span-1 md:col-span-2">
                        <Link href="/" className="inline-flex items-center gap-3 group mb-4">
                            <div className="relative w-12 h-12 md:w-16 md:h-16 bg-white rounded-xl p-1.5 shadow-sm">
                                <Image
                                    src="/JurisQuery-logo.svg"
                                    alt="JurisQuery Logo"
                                    fill
                                    className="object-contain p-0.5"
                                />
                            </div>
                            <span className="font-serif text-2xl font-bold tracking-tight text-white">
                                JurisQuery.
                            </span>
                        </Link>
                        <p className="mt-4 text-primary-foreground/80 max-w-sm">
                            Your intelligent legal assistant powered by advanced RAG technology.
                            Simplify complex document analysis in seconds.
                        </p>
                    </div>

                    <div>
                        <h3 className="font-bold mb-4">Product</h3>
                        <ul className="space-y-2">
                            <li><Link href="/features" className="text-primary-foreground/70 hover:text-white transition-colors">Features</Link></li>
                            <li><Link href="/security" className="text-primary-foreground/70 hover:text-white transition-colors">Security</Link></li>
                            <li><Link href="/pricing" className="text-primary-foreground/70 hover:text-white transition-colors">Pricing</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-bold mb-4">Company</h3>
                        <ul className="space-y-2">
                            <li><Link href="/about" className="text-primary-foreground/70 hover:text-white transition-colors">About</Link></li>
                            <li><Link href="/contact" className="text-primary-foreground/70 hover:text-white transition-colors">Contact</Link></li>
                            <li><Link href="/privacy-policy" className="text-primary-foreground/70 hover:text-white transition-colors">Privacy Policy</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="pt-8 border-t border-primary-foreground/20 text-center md:text-left text-sm text-primary-foreground/60">
                    &copy; {new Date().getFullYear()} JurisQuery AI. All rights reserved.
                </div>
            </div>
        </footer>
    );
}
