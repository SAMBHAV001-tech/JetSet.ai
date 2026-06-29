'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Plane, AlertTriangle } from 'lucide-react';
import { EmergencyPanel } from '@/components/emergency/EmergencyPanel';
import { useBackendHealth } from '@/components/layout/BackendHealthProvider';

export function Header() {
    const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);
    const { status } = useBackendHealth();

    return (
        <>
            <header className="fixed top-0 inset-x-0 z-50 bg-ink-900/40 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16 md:h-20">
                        {/* Logo */}
                        <Link href="/" className="flex items-center gap-2 group">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-indigo-600 flex items-center justify-center transform group-hover:scale-105 transition-all shadow-[0_0_20px_rgba(56,189,248,0.6),0_0_40px_rgba(99,102,241,0.2)]">
                                <Plane className="w-5.5 h-5.5 text-white -rotate-45" />
                            </div>
                            <span className="font-syne font-bold text-xl tracking-tight text-white hidden sm:block">
                                JetSet<span className="text-sky-400">.AI</span>
                            </span>
                            <div className="flex items-center gap-1.5 ml-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/5">
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                    status === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' :
                                    status === 'waking' ? 'bg-sky-400 animate-pulse shadow-[0_0_8px_#38bdf8]' :
                                    'bg-white/30'
                                }`} />
                                <span className="text-[10px] text-white/50 font-medium tracking-wide uppercase">
                                    {status === 'online' ? 'Active' : status === 'waking' ? 'Starting' : 'Connecting'}
                                </span>
                            </div>
                        </Link>

                        {/* Actions */}
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setIsEmergencyOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 md:px-5 md:py-2.5 rounded-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition-all font-medium text-sm shadow-[0_0_15px_rgba(239,68,68,0.15)] group"
                            >
                                <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 group-hover:scale-110 transition-transform" />
                                <span className="hidden sm:inline">Emergency Flights</span>
                                <span className="sm:hidden">Rescue</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Mount the Global Emergency Panel Drawer */}
            <EmergencyPanel isOpen={isEmergencyOpen} onClose={() => setIsEmergencyOpen(false)} />
        </>
    );
}
