import { SignUp } from "@clerk/nextjs";
import Link from "next/link";

export default function SignUpPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-soft-cream relative">
            {/* Background Pattern */}
            <div className="absolute inset-0 z-0 opacity-40">
                <div className="absolute top-0 -left-4 w-72 h-72 bg-primary/5 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
                <div className="absolute top-0 -right-4 w-72 h-72 bg-secondary/5 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-8 left-20 w-72 h-72 bg-primary/10 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
            </div>

            <div className="w-full max-w-md space-y-8 flex flex-col items-center relative z-10">
                <Link href="/" className="mb-2">
                    <span className="font-serif text-3xl font-bold text-primary tracking-tight">
                        JurisQuery.
                    </span>
                </Link>
                <div className="text-center mb-6">
                    <h1 className="font-serif text-2xl font-bold text-primary">Get Started</h1>
                    <p className="text-foreground/70 mt-2">Create your account to start analyzing</p>
                </div>

                <SignUp
                    appearance={{
                        elements: {
                            rootBox: "w-full",
                            card: "shadow-2xl border-0 rounded-2xl bg-white", // Removed transparency/blur
                            headerTitle: "hidden",
                            headerSubtitle: "hidden",
                            formButtonPrimary: "bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200 shadow-md hover:shadow-lg",
                            footerActionLink: "text-primary hover:text-primary/90 font-medium underline-offset-4 hover:underline",
                            formFieldInput: "bg-gray-50 border-gray-200 focus:border-primary/20 focus:ring-primary/20 transition-all duration-200",
                            dividerLine: "bg-gray-200",
                            dividerText: "text-gray-400 font-medium",
                            footer: "hidden", // Hide "Secured by Clerk"
                        },
                        variables: {
                            colorPrimary: "#2a3b4e",
                            colorText: "#1a1a1a",
                            colorBackground: "#ffffff", // Solid white
                            colorInputBackground: "#f9fafb", // Light gray
                            colorInputText: "#1a1a1a",
                            borderRadius: "0.75rem",
                        }
                    }}
                    fallbackRedirectUrl="/dashboard"
                    signInFallbackRedirectUrl="/dashboard"
                />
            </div>
        </div>
    );
}
