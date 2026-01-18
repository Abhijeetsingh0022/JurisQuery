'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface Stat {
    label: string;
    value: number;
    icon: LucideIcon;
    color: string;
}

interface StatsCardsProps {
    stats: Stat[];
}

export default function StatsCards({ stats }: StatsCardsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {stats.map((stat, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">{stat.label}</p>
                            <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                        </div>
                        <div className={`p-3 rounded-xl ${stat.color}/10`}>
                            <stat.icon className={`h-6 w-6 ${stat.color.replace('bg-', 'text-')}`} />
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
