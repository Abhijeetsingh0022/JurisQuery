import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";

export default async function DashboardPage() {
    const user = await currentUser();

    return (
        <div className="min-h-screen bg-soft-cream relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 z-0 opacity-40">
                <div className="absolute top-0 -left-4 w-96 h-96 bg-primary/5 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
                <div className="absolute top-0 -right-4 w-96 h-96 bg-secondary/5 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-8 left-20 w-96 h-96 bg-primary/10 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
            </div>

            <div className="container mx-auto px-4 py-12 relative z-10">
                <header className="mb-16 text-center max-w-2xl mx-auto">
                    <span className="inline-block py-1 px-3 rounded-full bg-white/50 border border-white/60 text-xs font-semibold tracking-wider text-primary uppercase mb-4 shadow-sm backdrop-blur-sm">
                        Command Center
                    </span>
                    <h1 className="font-serif text-4xl md:text-5xl font-bold text-primary mb-6 tracking-tight">
                        Welcome, {user?.firstName || "User"}
                    </h1>
                    <p className="text-foreground/70 text-lg md:text-xl leading-relaxed">
                        Your legal assistant is ready. Upload a document or review your recent analysis to get started.
                    </p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {/* Upload Card */}
                    <div className="group relative bg-white/60 backdrop-blur-md rounded-3xl p-8 border border-white/60 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-500"></div>
                        <div className="relative z-10">
                            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm text-primary group-hover:scale-110 transition-transform duration-300">
                                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" /></svg>
                            </div>
                            <h3 className="font-serif text-2xl font-bold text-primary mb-3">Upload Document</h3>
                            <p className="text-foreground/70 mb-8 leading-relaxed">
                                Analyze a new contract, case file, or legal document with advanced AI.
                            </p>
                            <button className="w-full py-3 px-6 rounded-xl bg-primary text-primary-foreground font-medium flex items-center justify-center gap-2 group-hover:bg-primary/90 transition-colors shadow-md">
                                <span>Start Analysis</span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                            </button>
                        </div>
                    </div>

                    {/* Recent Analysis Card */}
                    <div className="group relative bg-white/60 backdrop-blur-md rounded-3xl p-8 border border-white/60 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-500"></div>
                        <div className="relative z-10">
                            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm text-secondary-foreground group-hover:scale-110 transition-transform duration-300">
                                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" x2="8" y1="13" y2="13" /><line x1="16" x2="8" y1="17" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
                            </div>
                            <h3 className="font-serif text-2xl font-bold text-primary mb-3">Recent Analysis</h3>
                            <p className="text-foreground/70 mb-8 leading-relaxed">
                                Pick up where you left off. View your recently analyzed documents.
                            </p>
                            <Link href="#" className="flex items-center text-primary font-medium group-hover:underline underline-offset-4">
                                View Usage History
                            </Link>
                        </div>
                    </div>

                    {/* History / Archive Card */}
                    <div className="group relative bg-white/60 backdrop-blur-md rounded-3xl p-8 border border-white/60 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-500"></div>
                        <div className="relative z-10">
                            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm text-primary group-hover:scale-110 transition-transform duration-300">
                                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                            </div>
                            <h3 className="font-serif text-2xl font-bold text-primary mb-3">Archive</h3>
                            <p className="text-foreground/70 mb-8 leading-relaxed">
                                Access your complete chat history and past legal consultations.
                            </p>
                            <Link href="#" className="flex items-center text-primary font-medium group-hover:underline underline-offset-4">
                                Browse Archive
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Quick Stats or Additional Info */}
                <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                    {[
                        { label: "Documents Analyzed", value: "0" },
                        { label: "Queries Solved", value: "0" },
                        { label: "Hours Saved", value: "0" },
                        { label: "Accuracy Rate", value: "99.9%" }
                    ].map((stat, i) => (
                        <div key={i} className="bg-white/40 backdrop-blur-sm rounded-2xl p-4 text-center border border-white/40">
                            <div className="text-2xl font-bold text-primary mb-1">{stat.value}</div>
                            <div className="text-xs text-foreground/60 uppercase tracking-wide font-medium">{stat.label}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
