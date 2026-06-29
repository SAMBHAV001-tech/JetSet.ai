import { getApiUrl } from '@/utils/api';
"use client";

import React, { useState, useEffect, useRef } from "react";
import { CloudSun, Sun, Cloud, Umbrella, Thermometer, Wind, AlertCircle } from "lucide-react";
import { ModuleProps } from "./types";

const MONTH_ICONS: Record<string, React.ReactNode> = {
    Jan: <Thermometer className="w-5 h-5 text-blue-400" />,
    Feb: <Thermometer className="w-5 h-5 text-blue-300" />,
    Mar: <CloudSun className="w-5 h-5 text-yellow-300" />,
    Apr: <Sun className="w-5 h-5 text-yellow-400" />,
    May: <Sun className="w-5 h-5 text-orange-400" />,
    Jun: <Sun className="w-5 h-5 text-orange-500" />,
    Jul: <Umbrella className="w-5 h-5 text-sky-400" />,
    Aug: <Umbrella className="w-5 h-5 text-sky-500" />,
    Sep: <CloudSun className="w-5 h-5 text-amber-400" />,
    Oct: <Cloud className="w-5 h-5 text-slate-400" />,
    Nov: <Wind className="w-5 h-5 text-slate-500" />,
    Dec: <Thermometer className="w-5 h-5 text-blue-500" />,
};

export default function SeasonModule({ tripId, dest }: ModuleProps) {
    const [content, setContent] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const fetchedRef = useRef(false);

    useEffect(() => {
        if (fetchedRef.current) return;
        fetchedRef.current = true;
        fetchSeason();
    }, [tripId]);

    const fetchSeason = async () => {
        setIsLoading(true);
        setError("");
        setContent("");
        try {
            const baseUrl = getApiUrl();
            const destination = dest || "the destination";

            const prompt = `Give a concise, markdown-formatted "Best Time to Visit ${destination}" guide.

Include:
## Best Months
List the top 2-3 months with reasons (weather, events, crowd levels).

## Month-by-Month Snapshot
A short table or bullet list for each month: weather, crowd level (Low/Medium/High), and a one-line tip.

## Travel Tips by Season
- Peak season: what to expect
- Shoulder season: best value
- Off-season: hidden gems

Keep it factual, traveller-focused, and formatted in markdown. Be concise.`;

            const response = await fetch(`${baseUrl}/ai/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tripId,
                    messages: [{ role: "user", content: prompt }],
                }),
            });

            if (!response.ok) throw new Error(`Backend returned ${response.status}`);
            if (!response.body) throw new Error("No stream");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            let fullText = "";

            setIsLoading(false);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed.startsWith("data: ")) {
                        const dataStr = trimmed.slice(6).trim();
                        if (dataStr === "[DONE]") break;
                        try {
                            const parsed = JSON.parse(dataStr);
                            if (parsed.text) {
                                fullText += parsed.text;
                                setContent(fullText);
                            }
                        } catch { /* partial chunk */ }
                    }
                }
            }
        } catch (err: any) {
            setIsLoading(false);
            setError(err.message || "Failed to load season guide.");
        }
    };

    const parseSeasonGuide = (text: string) => {
        const monthsList: { month: string; text: string }[] = [];
        let whyText = "";

        if (!text) return { months: monthsList, why: whyText };

        // Match "## Why" section
        const whyMatch = text.match(/## Why\n([\s\S]*)$/i);
        if (whyMatch) {
            whyText = whyMatch[1].trim();
        }

        // Match "## Best Months to Visit" section
        const monthsSectionMatch = text.match(/## Best Months to Visit\n([\s\S]*?)(?:## Why|$)/i) || 
                                    text.match(/## Best Months\n([\s\S]*?)(?:## Why|$)/i);
        
        if (monthsSectionMatch) {
            const lines = monthsSectionMatch[1].split("\n");
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;

                // Match formats:
                // 1. "- **May**: desc"
                // 2. "* **May**: desc"
                // 3. "- May: desc"
                // 4. "MAY: desc"
                const match = trimmed.match(/^(?:-|\*|\s)*\*\*?([A-Za-z]{3,9})\*\*?(?:\s*|-|:)\s*(.*)$/) ||
                              trimmed.match(/^([A-Za-z]{3,9})\s*(?::|-)\s*(.*)$/);
                
                if (match) {
                    const monthRaw = match[1].trim();
                    let desc = match[2].trim();
                    // Strip leading colons, dashes, and extra spaces
                    desc = desc.replace(/^[:-\s]+/, "").trim();
                    const isMonth = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(monthRaw);
                    if (isMonth && desc.length > 5) {
                        monthsList.push({ month: monthRaw, text: desc });
                    }
                }
            }
        }

        return { months: monthsList, why: whyText };
    };

    const renderMarkdown = (text: string) => {
        if (!text) return null;
        return text.split("\n").map((line, idx) => {
            const trimmed = line.trim();
            if (trimmed.startsWith("## ")) {
                return <h2 key={idx} className="text-xl font-bold font-syne text-amber-300 mt-6 mb-3">{trimmed.slice(3)}</h2>;
            }
            if (trimmed.startsWith("### ")) {
                return <h3 key={idx} className="text-base font-bold font-syne text-white mt-4 mb-1.5">{trimmed.slice(4)}</h3>;
            }
            if (trimmed.startsWith("| ")) {
                return <p key={idx} className="font-mono text-sm text-white/70 my-0.5 pl-1">{trimmed}</p>;
            }
            if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
                const content = trimmed.slice(2);
                const monthMatch = content.match(/^\*\*(\w{3})\*\*/);
                const icon = monthMatch ? MONTH_ICONS[monthMatch[1]] : null;
                return (
                    <div key={idx} className="flex items-start gap-2 my-1.5">
                        {icon && <span className="mt-0.5 flex-shrink-0">{icon}</span>}
                        <p className="text-white/80 text-sm leading-relaxed">{content.replace(/\*\*/g, "")}</p>
                    </div>
                );
            }
            if (trimmed === "" || trimmed === "---") return <div key={idx} className="h-1" />;
            return <p key={idx} className="text-white/80 text-sm leading-relaxed my-1.5">{trimmed.replace(/\*\*/g, "")}</p>;
        });
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-5">
                <div className="relative">
                    <div className="w-16 h-16 rounded-full border-2 border-amber-500/20 border-t-amber-400 animate-spin" />
                    <CloudSun className="absolute inset-0 m-auto w-7 h-7 text-amber-400" />
                </div>
                <p className="text-white/60 font-sans text-sm">Analyzing best travel seasons...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="glass-panel p-8 rounded-2xl flex flex-col items-center gap-4 text-center border border-red-500/20">
                <AlertCircle className="w-10 h-10 text-red-400" />
                <p className="text-white/80 font-sans">{error}</p>
                <button
                    onClick={() => { fetchedRef.current = false; fetchSeason(); }}
                    className="text-amber-400 border border-amber-500/30 rounded-xl px-4 py-2 text-sm hover:bg-amber-500/10 transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    const { months, why } = parseSeasonGuide(content);

    const renderCustomSeasonLayout = () => {
        return (
            <div className="space-y-8">
                {/* Best Months Grid */}
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {months.map((item, idx) => {
                            const cleanMonth = item.month.substring(0, 3);
                            const capitalizedMonth = cleanMonth.charAt(0).toUpperCase() + cleanMonth.slice(1).toLowerCase();
                            const icon = MONTH_ICONS[capitalizedMonth] || <CloudSun className="w-6 h-6 text-amber-400" />;
                            
                            return (
                                <div key={idx} className="glass-panel p-6 rounded-2xl border border-white/5 bg-ink-950/20 flex gap-4 hover:border-amber-500/20 hover:bg-white/[0.02] transition-all duration-300 group">
                                    <div className="flex flex-col items-center justify-center bg-amber-500/10 rounded-2xl border border-amber-500/20 w-16 h-16 flex-shrink-0 group-hover:scale-105 group-hover:bg-amber-500/20 transition-all duration-300">
                                        {icon}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <span className="text-xl font-bold font-syne text-white uppercase tracking-wider block">{item.month.replace(/\*\*/g, "")}</span>
                                        <p className="text-white/70 text-sm leading-relaxed font-sans">{item.text.replace(/\*\*/g, "")}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Why Section */}
                {why && (
                    <div className="glass-panel p-6 md:p-8 rounded-2xl border-l-4 border-l-amber-500 bg-ink-950/10 space-y-2.5">
                        <h3 className="text-lg font-bold font-syne text-amber-300 uppercase tracking-wider">Why these months?</h3>
                        <p className="text-white/80 text-sm leading-relaxed font-sans">{why.replace(/\*\*/g, "")}</p>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-4">
            <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-amber-500 flex items-center gap-4">
                <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                    <CloudSun className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                    <h2 className="text-xl font-bold font-syne text-white">When to Go</h2>
                    <p className="text-white/50 text-sm font-sans mt-0.5">
                        {dest ? `Seasonal guide for ${dest}` : "Best travel seasons guide"}
                    </p>
                </div>
            </div>

            <div className="glass-panel p-6 md:p-8 rounded-2xl">
                {months.length > 0 ? (
                    renderCustomSeasonLayout()
                ) : (
                    <div className="prose max-w-none">
                        {renderMarkdown(content)}
                    </div>
                )}
            </div>
        </div>
    );
}
