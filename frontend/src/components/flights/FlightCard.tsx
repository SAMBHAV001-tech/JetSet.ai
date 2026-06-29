import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plane, ExternalLink, ChevronDown, ChevronUp, Leaf, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface SerpApiFlight {
    id: string;
    flightNumber?: string;
    airlineName?: string;
    travelDate?: string;
    flightStatus?: string;
    matchScore?: number;
    matchReason?: string;
    bookingToken?: string;
    googleFlightsUrl?: string;
    carbonEmissions?: {
        this_flight?: number;
        typical_for_this_route?: number;
        difference_percent?: number;
    } | null;
    extensions?: string[];
    itineraries?: Array<{
        duration?: string;
        segments: Array<{
            departure: { iataCode: string; at: string; name?: string };
            arrival: { iataCode: string; at: string; name?: string };
            carrierCode: string;
            flightNumber?: string;
            airlineName?: string;
            duration?: number;
            airplane?: string;
            travelClass?: string;
            legroom?: string;
            overnight?: boolean;
            operating?: { carrierCode: string };
        }>;
        layovers?: Array<{
            duration?: number;
            name?: string;
            id?: string;
            overnight?: boolean;
        }>;
    }>;
    price?: {
        curr?: string;
        currency?: string;
        total?: string | null;
    };
}

// Backward-compatible alias
export type AmadeusFlight = SerpApiFlight;

export interface FlightCardProps {
    flight: SerpApiFlight;
    /** Override the currency label shown in the card — use when the user's selected currency differs from what SerpAPI returns */
    currencyOverride?: string;
}

const MAP_TO_AIRLINE: Record<string, string> = {
    "AI": "Air India", "6E": "IndiGo", "UK": "Vistara", "SG": "SpiceJet",
    "QP": "Akasa Air", "I5": "AIX Connect", "IX": "Air India Express",
    "AA": "American Airlines", "DL": "Delta Air Lines", "UA": "United Airlines",
    "BA": "British Airways", "EK": "Emirates", "QR": "Qatar Airways",
    "EY": "Etihad Airways", "SQ": "Singapore Airlines", "LH": "Lufthansa",
    "AF": "Air France", "JL": "Japan Airlines", "NH": "ANA",
    "CX": "Cathay Pacific", "AC": "Air Canada", "QF": "Qantas",
    "VS": "Virgin Atlantic", "TK": "Turkish Airlines", "KL": "KLM",
    "FZ": "flydubai", "MH": "Malaysia Airlines", "TG": "Thai Airways",
    "ET": "Ethiopian Airlines", "WY": "Oman Air", "GF": "Gulf Air",
};

const AIRLINE_LOGO_URL = (code: string) =>
    `https://www.gstatic.com/flights/airline_logos/70px/${code}.png`;

function formatMinutes(mins: number): string {
    if (!mins || isNaN(mins)) return '';
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export function FlightCard({ flight, currencyOverride }: FlightCardProps) {
    const [showDetails, setShowDetails] = useState(false);

    const outbound = flight.itineraries?.[0];
    const segments = outbound?.segments || [];
    const layovers = outbound?.layovers || [];
    const firstSegment = segments[0];
    const lastSegment = segments[segments.length - 1];

    if (!firstSegment || !lastSegment) return null;

    const departure = new Date(firstSegment.departure.at);
    const arrival = new Date(lastSegment.arrival.at);
    const duration = outbound?.duration?.replace('PT', '').toLowerCase();
    const currency = currencyOverride || flight.price?.currency || flight.price?.curr || 'USD';
    const rawPrice = flight.price?.total;
    const hasPrice = rawPrice !== null && rawPrice !== undefined && rawPrice !== '' && rawPrice !== '0';
    const stops = segments.length - 1;
    const orgCode = firstSegment.departure.iataCode;
    const destCode = lastSegment.arrival.iataCode;

    const airlineName = flight.airlineName
        || MAP_TO_AIRLINE[firstSegment.carrierCode]
        || `${firstSegment.carrierCode} Airlines`;

    const displayFlightId = flight.flightNumber || flight.id;
    const isRecommended = flight.matchScore !== undefined && flight.matchScore >= 95;

    const carbonDiff = flight.carbonEmissions?.difference_percent;
    const carbonClass = carbonDiff !== undefined
        ? carbonDiff < -10 ? 'text-emerald-400' : carbonDiff > 10 ? 'text-red-400' : 'text-yellow-400'
        : null;

    const formatTime = (d: Date) => {
        if (isNaN(d.getTime())) return '--:--';
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const buildGoogleFlightsFallback = () => {
        const date = flight.travelDate || '';
        return `https://www.google.com/travel/flights/search?q=Flights+from+${orgCode}+to+${destCode}+on+${date}`;
    };

    const handleBookNow = () => {
        // Instantly open the best available booking URL — no backend round-trip needed
        const url = flight.googleFlightsUrl || buildGoogleFlightsFallback();
        window.open(url, '_blank', 'noopener,noreferrer');
    };


    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative w-full rounded-2xl overflow-hidden border ${isRecommended
                ? 'border-sky-500/40 shadow-[0_0_20px_rgba(14,165,233,0.15)] bg-sky-500/5'
                : 'border-white/15 bg-white/8'
                } p-4 group hover:bg-white/12 transition-all duration-300`}
        >
            {isRecommended && (
                <div className="absolute top-0 left-0 bg-gradient-to-r from-sky-500 to-indigo-500 text-white text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-br-xl shadow-md z-10">
                    AI Recommended
                </div>
            )}

            {/* ── Row 1: Airline | Route | Price — all in one line, no md: breakpoints ── */}
            <div className="flex items-center gap-3 w-full mt-1">

                {/* Airline logo + name */}
                <div className="flex items-center gap-2 shrink-0 min-w-0 w-[30%]">
                    <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center border border-white/20 overflow-hidden shadow-sm shrink-0">
                        <img
                            src={AIRLINE_LOGO_URL(firstSegment.carrierCode)}
                            alt={airlineName}
                            className="w-7 h-7 object-contain"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                (e.target as HTMLImageElement).parentElement!.innerHTML =
                                    `<span class="text-sm font-bold text-slate-700">${firstSegment.carrierCode}</span>`;
                            }}
                        />
                    </div>
                    <div className="min-w-0">
                        <h4 className="font-semibold text-sm text-white leading-tight truncate">{airlineName}</h4>
                        <p className="text-[10px] font-mono text-slate-500 truncate">
                            {displayFlightId !== airlineName ? displayFlightId : firstSegment.carrierCode}
                        </p>
                    </div>
                </div>

                {/* Route: dep time → arr time */}
                <div className="flex items-center gap-1 flex-1 font-mono justify-center min-w-0">
                    <div className="text-right shrink-0">
                        <p className="text-base font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-indigo-400">
                            {formatTime(departure)}
                        </p>
                        <p className="text-[11px] text-slate-500">{firstSegment.departure.iataCode}</p>
                    </div>
                    <div className="flex flex-col items-center flex-1 px-2 min-w-0">
                        <p className="text-[10px] text-slate-500 truncate">{duration && duration !== '0h0m' ? duration : ''}</p>
                        <div className="w-full h-[1.5px] bg-gradient-to-r from-transparent via-sky-500 to-transparent relative flex items-center justify-center my-0.5">
                            <Plane className="w-3 h-3 text-sky-400 absolute" />
                        </div>
                        <p className="text-[10px] text-slate-500">
                            {stops === 0 ? 'Direct' : `${stops} Stop${stops > 1 ? 's' : ''}`}
                        </p>
                    </div>
                    <div className="text-left shrink-0">
                        <p className="text-base font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-indigo-400">
                            {formatTime(arrival)}
                        </p>
                        <p className="text-[11px] text-slate-500">{lastSegment.arrival.iataCode}</p>
                    </div>
                </div>

                {/* Price */}
                <div className="text-right shrink-0 min-w-[80px]">
                    {hasPrice ? (
                        <>
                            <p className="text-[10px] text-slate-500">per adult</p>
                            <p className="text-sm font-bold text-white leading-snug">{currency}</p>
                            <p className="text-sm font-bold text-white leading-snug">{Number(rawPrice).toLocaleString()}</p>
                            {carbonDiff !== undefined && carbonClass && (
                                <div className={`flex items-center justify-end gap-0.5 text-[10px] mt-0.5 ${carbonClass}`}>
                                    <Leaf className="w-2.5 h-2.5 shrink-0" />
                                    <span>{carbonDiff > 0 ? '+' : ''}{carbonDiff}% CO₂</span>
                                </div>
                            )}
                        </>
                    ) : (
                        <p className="text-xs font-medium text-amber-400">Check →</p>
                    )}
                </div>
            </div>

            {/* ── Row 2: Book button full width ── */}
            <Button
                onClick={handleBookNow}
                className="w-full mt-3 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 text-white text-sm shadow border-none transition-all"
            >
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />Book on Google Flights
            </Button>

            {/* ── Row 3: AI match pill + layover toggle ── */}
            {(flight.matchReason || stops > 0) && (
                <div className="mt-2.5 pt-2.5 border-t border-white/8 flex items-center gap-2 flex-wrap">
                    {flight.matchReason && (
                        <>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold font-mono whitespace-nowrap shrink-0">
                                AI {flight.matchScore || 80}%
                            </span>
                            <p className="text-[11px] text-slate-400 italic truncate flex-1 min-w-0">{flight.matchReason}</p>
                        </>
                    )}
                    {stops > 0 && (
                        <button
                            onClick={() => setShowDetails(!showDetails)}
                            className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 px-2 py-0.5 border border-white/10 rounded-full hover:border-white/20 transition-colors shrink-0 ml-auto"
                        >
                            {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            {showDetails ? 'Hide' : `Show ${stops} layover${stops > 1 ? 's' : ''}`}
                        </button>
                    )}
                </div>
            )}

            {/* ── Layover Details (expandable) ── */}
            <AnimatePresence>
                {showDetails && stops > 0 && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="mt-3 pt-3 border-t border-white/8 space-y-2">
                            {segments.map((seg, i) => (
                                <React.Fragment key={i}>
                                    <div className="flex items-center gap-2 text-xs">
                                        <div className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center text-[10px] font-bold text-sky-400 shrink-0">
                                            {seg.carrierCode}
                                        </div>
                                        <span className="font-mono text-sky-300">{seg.departure.iataCode}</span>
                                        <Plane className="w-3 h-3 text-slate-500 shrink-0" />
                                        <span className="font-mono text-sky-300">{seg.arrival.iataCode}</span>
                                        <span className="text-slate-500 truncate">{seg.flightNumber || ''}</span>
                                        {seg.duration && (
                                            <span className="text-slate-500 flex items-center gap-0.5 shrink-0">
                                                <Clock className="w-2.5 h-2.5" />{formatMinutes(seg.duration)}
                                            </span>
                                        )}
                                    </div>
                                    {layovers[i] && (
                                        <div className="ml-8 text-[11px] text-amber-400/80 flex items-center gap-1">
                                            <Clock className="w-2.5 h-2.5 shrink-0" />
                                            <span>Layover at {layovers[i].name || layovers[i].id}: {formatMinutes(layovers[i].duration || 0)}{layovers[i].overnight ? ' (Overnight)' : ''}</span>
                                        </div>
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
