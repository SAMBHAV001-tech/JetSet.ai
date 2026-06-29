"use client";

import { getApiUrl } from '@/utils/api';

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Send, Bot, User, Share2, AlertTriangle } from "lucide-react";
import SkeletonLoader from "../SkeletonLoader";
import { ModuleProps } from "./types";
import { Button } from "@/components/ui/button";

interface ChatMessage {
    role: "user" | "model";
    content: string;
}

export default function SummaryModule({ tripId }: ModuleProps) {
    const router = useRouter();
    const [summary, setSummary] = useState("");
    const [isSummaryLoading, setIsSummaryLoading] = useState(true);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState("");
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [shareCopied, setShareCopied] = useState(false);

    const chatEndRef = useRef<HTMLDivElement>(null);
    const summaryLoadedRef = useRef(false);
    // Only auto-scroll after user has explicitly sent a chat message
    const hasChattedRef = useRef(false);

    useEffect(() => {
        // Load chat history from sessionStorage if available
        if (typeof window !== "undefined") {
            const savedHistory = sessionStorage.getItem(`chatHistory_${tripId}`);
            if (savedHistory) {
                try {
                    setChatHistory(JSON.parse(savedHistory));
                } catch (e) {
                    console.error("Failed to load chat history", e);
                }
            }
        }
        if (summaryLoadedRef.current) return;
        summaryLoadedRef.current = true;
        fetchSummary();
    }, [tripId]);

    useEffect(() => {
        // Only scroll to chat end when user is actively chatting, not during initial summary load
        if (hasChattedRef.current) {
            chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [chatHistory, isChatLoading]);

    const fetchSummary = async () => {
        setIsSummaryLoading(true);
        setSummary("");
        try {
            const baseUrl = getApiUrl();
            const response = await fetch(`${baseUrl}/ai/summary?tripId=${encodeURIComponent(tripId)}`);
            if (!response.ok) throw new Error("Failed to fetch summary");

            if (!response.body) {
                throw new Error("Streaming not supported or no body returned");
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            setIsSummaryLoading(false);

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
                        if (dataStr === "[DONE]") {
                            break;
                        }
                        try {
                            const parsed = JSON.parse(dataStr);
                            if (parsed.text) {
                                setSummary((prev) => prev + parsed.text);
                            }
                        } catch {
                            // Suppress json parsing errors on partial chunks
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Error loading summary stream:", error);
            setSummary("Could not load travel summary. Please ensure backend is running.");
            setIsSummaryLoading(false);
        }
    };

    const handleSendChatMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const text = chatInput.trim();
        if (!text || isChatLoading) return;

        // Mark that user has started chatting so scroll-to-bottom is enabled
        hasChattedRef.current = true;
        setChatInput("");
        const newHistory: ChatMessage[] = [...chatHistory, { role: "user", content: text }];
        setChatHistory(newHistory);
        setIsChatLoading(true);

        // Append temporary message for streaming response
        setChatHistory((prev) => [...prev, { role: "model", content: "" }]);

        try {
            const baseUrl = getApiUrl();
            const response = await fetch(`${baseUrl}/ai/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tripId, messages: newHistory }),
            });

            if (!response.ok) throw new Error("Failed to chat with assistant");

            if (!response.body) throw new Error("No readable stream in body");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            let fullModelResponse = "";
            let pendingUpdates: any = null;

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
                        if (dataStr === "[DONE]") {
                            break;
                        }
                        try {
                            const parsed = JSON.parse(dataStr);
                            if (parsed.text) {
                                fullModelResponse += parsed.text;
                                setChatHistory((prev) => {
                                    const updated = [...prev];
                                    const lastIndex = updated.length - 1;
                                    if (updated[lastIndex]?.role === "model") {
                                        updated[lastIndex] = {
                                            ...updated[lastIndex],
                                            content: updated[lastIndex].content + parsed.text,
                                        };
                                    }
                                    return updated;
                                });
                            }
                            if (parsed.refresh && parsed.updates) {
                                pendingUpdates = parsed.updates;
                            }
                        } catch {
                            // Ignore json parsing on partial lines
                        }
                    }
                }
            }

            // Persistence
            const finalHistory = [
                ...newHistory,
                { role: "model" as const, content: fullModelResponse }
            ];
            sessionStorage.setItem(`chatHistory_${tripId}`, JSON.stringify(finalHistory));

            if (pendingUpdates) {
                const searchParams = new URLSearchParams(window.location.search);
                if (pendingUpdates.origin) searchParams.set("org", pendingUpdates.origin);
                if (pendingUpdates.destination) searchParams.set("dest", pendingUpdates.destination);
                if (pendingUpdates.fromDate && pendingUpdates.toDate) {
                    searchParams.set("dates", `${pendingUpdates.fromDate}_${pendingUpdates.toDate}`);
                    searchParams.set("displayDates", `${pendingUpdates.fromDate} - ${pendingUpdates.toDate}`);
                }

                // Use router.replace instead of window.location to avoid full page reload
                // which would cause the summary to re-fetch and scroll to the top
                setTimeout(() => {
                    router.replace(`?${searchParams.toString()}`);
                }, 1500);
            }
        } catch (error) {
            console.error("Chat error:", error);
            setChatHistory((prev) => {
                const updated = [...prev];
                const lastIndex = updated.length - 1;
                if (updated[lastIndex]?.role === "model") {
                    updated[lastIndex] = {
                        role: "model",
                        content: "Sorry, I had trouble generating a response. Please check your backend connection.",
                    };
                }
                return updated;
            });
        } finally {
            setIsChatLoading(false);
        }
    };

    const handleCopyShareLink = () => {
        if (typeof window !== "undefined") {
            navigator.clipboard.writeText(window.location.href);
            setShareCopied(true);
            setTimeout(() => setShareCopied(false), 2000);
        }
    };

    // Track open/closed state for each collapsible sub-section (keyed by heading line index)
    const [collapsedSections, setCollapsedSections] = useState<Record<number, boolean>>({});

    const toggleSection = (idx: number) => {
        setCollapsedSections(prev => ({ ...prev, [idx]: !prev[idx] }));
    };

    // Section-aware Markdown renderer — ## always visible, ### and #### are collapsible
    const renderMarkdown = (text: string) => {
        if (!text) return null;

        const lines = text.split("\n");

        // Group lines into segments: each segment is { headingIdx, level, headingLabel, bodyLines[] }
        type Segment =
            | { type: "top"; lines: string[] }
            | { type: "section"; idx: number; level: 2 | 3 | 4; label: string; bodyLines: string[] };

        const segments: Segment[] = [];
        let currentSegment: Segment = { type: "top", lines: [] };

        lines.forEach((line, idx) => {
            const trimmed = line.trim();
            if (trimmed.startsWith("## ") && !trimmed.startsWith("### ") && !trimmed.startsWith("#### ")) {
                segments.push(currentSegment);
                currentSegment = { type: "section", idx, level: 2, label: trimmed.slice(3), bodyLines: [] };
            } else if (trimmed.startsWith("### ") && !trimmed.startsWith("#### ")) {
                segments.push(currentSegment);
                currentSegment = { type: "section", idx, level: 3, label: trimmed.slice(4), bodyLines: [] };
            } else if (trimmed.startsWith("#### ")) {
                segments.push(currentSegment);
                currentSegment = { type: "section", idx, level: 4, label: trimmed.slice(5), bodyLines: [] };
            } else {
                if (currentSegment.type === "top") {
                    currentSegment.lines.push(line);
                } else {
                    currentSegment.bodyLines.push(line);
                }
            }
        });
        segments.push(currentSegment);

        const renderLine = (line: string, idx: number) => {
            const trimmed = line.trim();
            if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
                return (
                    <ul key={idx} className="list-disc list-inside ml-4 my-1.5 text-white/90 font-sans leading-relaxed">
                        <li>{parseInlineFormatting(trimmed.slice(2))}</li>
                    </ul>
                );
            }
            if (/^\d+\.\s/.test(trimmed)) {
                return (
                    <ol key={idx} className="list-decimal list-inside ml-4 my-1.5 text-white/90 font-sans leading-relaxed">
                        <li>{parseInlineFormatting(trimmed.replace(/^\d+\.\s/, ""))}</li>
                    </ol>
                );
            }
            if (trimmed === "") return <div key={idx} className="h-2" />;
            return <p key={idx} className="my-2.5 text-white/95 font-sans leading-relaxed text-[15px]">{parseInlineFormatting(trimmed)}</p>;
        };

        return segments.map((seg, sIdx) => {
            if (seg.type === "top") {
                return <div key={`top-${sIdx}`}>{seg.lines.map(renderLine)}</div>;
            }

            const isOpen = collapsedSections[seg.idx] === true; // default collapsed

            if (seg.level === 2) {
                // ## heading — always visible, not collapsible
                return (
                    <div key={`sec-${sIdx}`} className="mt-6">
                        <h2 className="text-2xl font-bold font-syne text-white mb-3">{seg.label}</h2>
                        <div>{seg.bodyLines.map(renderLine)}</div>
                    </div>
                );
            }

            // ### and #### — collapsible accordion
            const HeadingTag = seg.level === 3 ? "h3" : "h4";
            const headingClass = seg.level === 3
                ? "text-[15px] font-bold font-syne text-violet-300"
                : "text-[14px] font-bold font-syne text-sky-300";

            return (
                <div key={`sec-${sIdx}`} className="mt-3 rounded-xl border border-white/8 overflow-hidden">
                    {/* Clickable header */}
                    <button
                        onClick={() => toggleSection(seg.idx)}
                        className="w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 transition-colors text-left group"
                    >
                        <HeadingTag className={headingClass}>{seg.label}</HeadingTag>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className={`w-4 h-4 flex-shrink-0 text-white/40 group-hover:text-white/70 transition-all duration-300 ${isOpen ? "rotate-180" : "rotate-0"}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {/* Collapsible body */}
                    <div
                        className="overflow-hidden transition-all duration-300 ease-in-out"
                        style={{ maxHeight: isOpen ? "2000px" : "0px", opacity: isOpen ? 1 : 0 }}
                    >
                        <div className="px-4 pt-2 pb-3">
                            {seg.bodyLines.map(renderLine)}
                        </div>
                    </div>
                </div>
            );
        });
    };

    // Bold (**text**) and custom tab link ([Link Text](tab:tabId)) formatting helper
    const parseInlineFormatting = (text: string) => {
        const parts = text.split(/(\*\*.*?\*\*|\[.*?\]\(tab:.*?\))/g);
        return parts.map((part, index) => {
            if (part.startsWith("**") && part.endsWith("**")) {
                return <strong key={index} className="font-bold text-sky-200">{part.slice(2, -2)}</strong>;
            }
            if (part.startsWith("[") && part.includes("](tab:")) {
                const linkText = part.substring(1, part.indexOf("]"));
                const tabId = part.substring(part.indexOf("](tab:") + 6, part.length - 1);
                return (
                    <button
                        key={index}
                        onClick={() => {
                            window.dispatchEvent(new CustomEvent("switch-tab", { detail: tabId }));
                        }}
                        className="text-amber-400 hover:text-amber-300 font-bold underline inline-flex items-center gap-0.5 mx-1 hover:scale-105 transition-transform bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded-lg border border-amber-500/20"
                    >
                        {linkText}
                    </button>
                );
            }
            return part;
        });
    };

    if (isSummaryLoading) {
        return <SkeletonLoader type="summary" />;
    }

    return (
        <div className="w-full flex flex-col gap-6 pb-12">
            {/* AI Summary Card */}
            <div className="glass-panel p-6 md:p-8 rounded-2xl border-l-4 border-l-violet-500 shadow-[0_0_20px_rgba(139,92,246,0.15)] relative overflow-hidden group">
                <div className="absolute top-[-30px] right-[-30px] w-24 h-24 bg-violet-600/10 rounded-full blur-2xl pointer-events-none group-hover:bg-violet-600/25 transition-colors duration-500" />
                
                <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-violet-500/20 rounded-xl">
                            <Sparkles className="w-5 h-5 text-violet-400" />
                        </div>
                        <h2 className="text-xl font-bold font-syne text-white">AI Blueprint Synthesis</h2>
                    </div>

                    <Button
                        variant="outline"
                        onClick={handleCopyShareLink}
                        className="text-xs h-9 bg-white/5 border-white/10 text-white/80 hover:bg-violet-500 hover:text-white hover:border-violet-500 flex items-center gap-1.5 transition-all"
                    >
                        <Share2 className="w-3.5 h-3.5" />
                        {shareCopied ? "Copied!" : "Share Link"}
                    </Button>
                </div>

                <div className="text-white/90 space-y-2 prose max-w-none">
                    {renderMarkdown(summary)}
                </div>
            </div>

            {/* Chat Assistant Section */}
            <div id="copilot-chat-section" className="glass-panel rounded-2xl flex flex-col h-[500px] border border-white/10 overflow-hidden shadow-xl">
                {/* Chat Header */}
                <div className="px-6 py-4 bg-white/5 border-b border-white/5 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center border border-sky-500/20">
                        <Bot className="w-4 h-4 text-sky-400 animate-pulse" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white font-syne">JetSet.AI Co-Pilot</h3>
                        <p className="text-[10px] font-mono text-sky-300 uppercase tracking-widest">Conversational Refinement</p>
                    </div>
                </div>

                {/* Message Streams */}
                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 custom-scrollbar">
                    {chatHistory.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-white/40 gap-3">
                            <Bot className="w-10 h-10 text-violet-500/50" />
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-white/60">Ask questions about this trip blueprint</p>
                                <p className="text-xs max-w-xs mx-auto">"Edit my itinerary", "Plan my day-by-day trip", "Search for local restaurants" or "Compare flight options"</p>
                            </div>
                        </div>
                    ) : (
                        chatHistory.map((msg, index) => (
                            <div
                                key={index}
                                className={`flex gap-3 max-w-[85%] ${msg.role === "user" ? "self-end flex-row-reverse" : "self-start"
                                    }`}
                            >
                                <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === "user"
                                            ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                                            : "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                                        }`}
                                >
                                    {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                                </div>
                                <div
                                    className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed border select-text ${msg.role === "user"
                                            ? "bg-sky-600/10 border-sky-500/20 text-white rounded-tr-none"
                                            : "bg-white/5 border-white/10 text-white/95 rounded-tl-none"
                                        }`}
                                >
                                    {msg.content === "" && isChatLoading && index === chatHistory.length - 1 ? (
                                        <div className="flex items-center gap-1 py-1">
                                            <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" />
                                            <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce [animation-delay:0.2s]" />
                                            <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce [animation-delay:0.4s]" />
                                        </div>
                                    ) : (
                                        <div className="prose max-w-none text-white/90">
                                            {renderMarkdown(msg.content)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                    <div ref={chatEndRef} />
                </div>

                {/* Input form */}
                <form onSubmit={handleSendChatMessage} className="p-4 bg-white/5 border-t border-white/5 flex gap-2">
                    <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Type a message or ask travel guidelines..."
                        disabled={isChatLoading}
                        className="flex-1 bg-ink-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-colors placeholder:text-white/30"
                    />
                    <Button
                        type="submit"
                        disabled={!chatInput.trim() || isChatLoading}
                        className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-10 w-10 flex items-center justify-center p-0 flex-shrink-0 shadow-[0_0_10px_rgba(139,92,246,0.4)]"
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </form>
            </div>
        </div>
    );
}
