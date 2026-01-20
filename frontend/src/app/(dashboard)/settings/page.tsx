"use client";

import { useUser } from "@clerk/nextjs";
import { User, Bell } from "lucide-react";

export default function SettingsPage() {
    const { user } = useUser();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold font-serif text-[#2a3b4e]">Settings</h1>
                <p className="text-[#2a3b4e]/70 mt-2">Manage your account preferences and settings.</p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Profile Section */}
                <section className="bg-white p-6 rounded-xl shadow-sm border border-[#2a3b4e]/10">
                    <div className="flex items-center space-x-3 mb-4">
                        <User className="h-6 w-6 text-[#2a3b4e]" />
                        <h2 className="text-xl font-bold text-[#2a3b4e]">Profile</h2>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-[#2a3b4e]/80">Full Name</label>
                            <input
                                type="text"
                                defaultValue={user?.fullName || ""}
                                readOnly
                                className="mt-1 block w-full rounded-md border-[#2a3b4e]/20 bg-[#f7f3f1] shadow-sm focus:border-[#2a3b4e] focus:ring focus:ring-[#2a3b4e]/20 sm:text-sm p-2 cursor-not-allowed opacity-75"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[#2a3b4e]/80">Email</label>
                            <input
                                type="email"
                                defaultValue={user?.primaryEmailAddress?.emailAddress || ""}
                                readOnly
                                className="mt-1 block w-full rounded-md border-[#2a3b4e]/20 bg-[#f7f3f1] shadow-sm focus:border-[#2a3b4e] focus:ring focus:ring-[#2a3b4e]/20 sm:text-sm p-2 cursor-not-allowed opacity-75"
                            />
                        </div>
                        <p className="text-xs text-[#2a3b4e]/60 italic">
                            Profile management is handled via the authentication provider.
                        </p>
                    </div>
                </section>

                {/* Notifications Section */}
                <section className="bg-white p-6 rounded-xl shadow-sm border border-[#2a3b4e]/10">
                    <div className="flex items-center space-x-3 mb-4">
                        <Bell className="h-6 w-6 text-[#2a3b4e]" />
                        <h2 className="text-xl font-bold text-[#2a3b4e]">Notifications</h2>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-[#2a3b4e]/80">Email Notifications</span>
                            <input type="checkbox" className="toggle" defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-[#2a3b4e]/80">Desktop Alerts</span>
                            <input type="checkbox" className="toggle" />
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
