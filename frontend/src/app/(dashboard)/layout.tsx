import Sidebar from "@/components/layout/Sidebar";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen bg-[#f7f3f1]">
            <Sidebar />
            <main className="flex-1 overflow-y-auto">
                <div className="min-h-full p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
