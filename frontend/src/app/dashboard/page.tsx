import { currentUser } from "@clerk/nextjs/server";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
    const user = await currentUser();

    return <DashboardClient />;
}
