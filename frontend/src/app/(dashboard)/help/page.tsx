import { ExternalLink, BookOpen, MessageCircle } from "lucide-react";
import Link from "next/link";

export default function HelpPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold font-serif text-[#2a3b4e]">Help & Support</h1>
                <p className="text-[#2a3b4e]/70 mt-2">Get help with using JurisQuery.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-[#2a3b4e]/10 hover:shadow-md transition-shadow">
                    <BookOpen className="h-8 w-8 text-[#2a3b4e] mb-4" />
                    <h3 className="text-lg font-bold text-[#2a3b4e] mb-2">Documentation</h3>
                    <p className="text-[#2a3b4e]/70 text-sm mb-4">
                        Comprehensive guides and API references.
                    </p>
                    <Link href="#" className="text-[#2a3b4e] font-medium text-sm flex items-center hover:underline">
                        Read Docs <ExternalLink className="ml-1 h-3 w-3" />
                    </Link>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-[#2a3b4e]/10 hover:shadow-md transition-shadow">
                    <MessageCircle className="h-8 w-8 text-[#2a3b4e] mb-4" />
                    <h3 className="text-lg font-bold text-[#2a3b4e] mb-2">Contact Support</h3>
                    <p className="text-[#2a3b4e]/70 text-sm mb-4">
                        Need help? Reach out to our support team.
                    </p>
                    <Link href="#" className="text-[#2a3b4e] font-medium text-sm flex items-center hover:underline">
                        Contact Us <ExternalLink className="ml-1 h-3 w-3" />
                    </Link>
                </div>
            </div>
        </div>
    );
}
