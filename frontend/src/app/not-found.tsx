import Link from "next/link";

export default function NotFound() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-soft-cream relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 z-0 opacity-40">
                <div className="absolute top-0 -left-4 w-72 h-72 bg-primary/5 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
                <div className="absolute top-0 -right-4 w-72 h-72 bg-secondary/5 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-8 left-20 w-72 h-72 bg-primary/10 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
            </div>

            <div className="relative z-10 text-center px-4">
                <h1 className="font-serif text-9xl font-bold text-primary opacity-20 select-none">
                    404
                </h1>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full">
                    <h2 className="font-serif text-3xl md:text-4xl font-bold text-primary mb-4">
                        Page Not Found
                    </h2>
                    <p className="text-foreground/70 text-lg mb-8 max-w-md mx-auto">
                        We couldn't find the page you were looking for. It might have been removed or doesn't exist.
                    </p>
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-primary text-primary-foreground font-medium transition-all hover:bg-primary/90 hover:shadow-lg hover:-translate-y-0.5"
                    >
                        Return Home
                    </Link>
                </div>
            </div>
        </div>
    );
}
