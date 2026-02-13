
import React from 'react';
import { Award, Zap, ShieldCheck, User } from 'lucide-react';

export type ClientTier = 'GOLD' | 'SILVER' | 'BRONZE' | 'NEW';

interface TierConfig {
    id: ClientTier;
    label: string;
    minOrders: number;
    color: string;
    bgColor: string;
    borderColor: string;
    icon: React.ReactNode;
    style: string;
    animation?: string;
}

export const classifyClient = (totalOrders: number, thresholds = { bronze: 3, silver: 5, gold: 10 }): TierConfig => {
    if (totalOrders > thresholds.gold) {
        return {
            id: 'GOLD',
            label: 'Cliente Ouro',
            minOrders: thresholds.gold + 1,
            color: '#F59E0B', // Amber 500
            bgColor: 'bg-amber-400/10',
            borderColor: 'border-amber-400/50',
            icon: <Zap size={14} className="text-amber-400 fill-amber-400" />,
            style: 'text-amber-400 font-bold',
            animation: 'animate-pulse'
        };
    }

    if (totalOrders > thresholds.silver) {
        return {
            id: 'SILVER',
            label: 'Cliente Prata',
            minOrders: thresholds.silver + 1, // Next is Gold maybe? No, this is min to be Silver.
            color: '#9CA3AF', // Gray 400
            bgColor: 'bg-gray-100 dark:bg-gray-400/10',
            borderColor: 'border-gray-300 dark:border-gray-400/50',
            icon: <ShieldCheck size={14} className="text-gray-500 dark:text-gray-300" />,
            style: 'text-gray-600 dark:text-gray-300 font-bold'
        };
    }

    if (totalOrders > thresholds.bronze) {
        return {
            id: 'BRONZE',
            label: 'Cliente Bronze',
            minOrders: thresholds.bronze + 1,
            color: '#CD7F32',
            bgColor: 'bg-orange-700/10',
            borderColor: 'border-orange-700/50',
            icon: <Award size={14} className="text-[#CD7F32]" />,
            style: 'text-[#CD7F32] font-bold'
        };
    }

    return {
        id: 'NEW',
        label: 'Novo Cliente',
        minOrders: 0,
        color: '#10B981', // Emerald 500
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/30',
        icon: <User size={14} className="text-emerald-500" />,
        style: 'text-emerald-500 font-medium'
    };
};
