export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Dashboard has its own sidebar layout, so we don't need the main header/footer
    return <>{children}</>;
}
