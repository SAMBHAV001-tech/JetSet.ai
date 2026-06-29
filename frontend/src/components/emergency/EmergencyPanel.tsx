import { getApiUrl } from '@/utils/api';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plane, AlertTriangle, X, MapPin, Loader2, Navigation } from 'lucide-react';
import { useEmergencyFlights } from '@/hooks/useEmergencyFlights';
import { useUserCurrency } from '@/hooks/useUserCurrency';
import { useSearchParams } from 'next/navigation';
import { FlightCard } from '@/components/flights/FlightCard';
import { getIataCode, getHubForCurrency } from '@/utils/airport-mappings';

interface DestinationResult {
    id: string;
    name: string;
    country: string;
    lat: number;
    lon: number;
}

interface EmergencyPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export function EmergencyPanel({ isOpen, onClose }: EmergencyPanelProps) {
    const searchParams = useSearchParams();
    const localeCurrency = useUserCurrency();
    // Prefer the currency the user explicitly selected in the trip form (URL param),
    // fall back to browser-locale-derived currency only if not present.
    const currencyCode = searchParams.get('curr') || localeCurrency;
    const defaultHub = getHubForCurrency(currencyCode);
    const [cityInput, setCityInput] = useState('');
    const [destInput, setDestInput] = useState('');
    const [resolvedIata, setResolvedIata] = useState<string | null>(null);
    const [resolvedDestIata, setResolvedDestIata] = useState<string | null>(null);
    const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [destError, setDestError] = useState(false);

    // Origin autocomplete states
    const [origSuggestions, setOrigSuggestions] = useState<DestinationResult[]>([]);
    const [origLoading, setOrigLoading] = useState(false);
    const [showOrigDropdown, setShowOrigDropdown] = useState(false);
    const [origActiveIdx, setOrigActiveIdx] = useState(-1);
    const origSelectedRef = useRef<string | null>(null);

    // Destination autocomplete states
    const [destSuggestions, setDestSuggestions] = useState<DestinationResult[]>([]);
    const [destLoading, setDestLoading] = useState(false);
    const [showDestDropdown, setShowDestDropdown] = useState(false);
    const [destActiveIdx, setDestActiveIdx] = useState(-1);
    const destSelectedRef = useRef<string | null>(null);

    const originContainerRef = useRef<HTMLDivElement>(null);
    const destContainerRef = useRef<HTMLDivElement>(null);

    // Close dropdowns on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (originContainerRef.current && !originContainerRef.current.contains(event.target as Node)) {
                setShowOrigDropdown(false);
            }
            if (destContainerRef.current && !destContainerRef.current.contains(event.target as Node)) {
                setShowDestDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Origin Autocomplete debounce search
    useEffect(() => {
        if (!cityInput || cityInput.length < 2) {
            setOrigSuggestions([]);
            setShowOrigDropdown(false);
            return;
        }
        if (cityInput === origSelectedRef.current) return;

        const delayDebounceFn = setTimeout(async () => {
            setOrigLoading(true);
            try {
                const baseUrl = getApiUrl();
                const response = await fetch(`${baseUrl}/destinations/search?q=${encodeURIComponent(cityInput)}`);
                if (response.ok) {
                    const data = await response.json();
                    setOrigSuggestions(data);
                    setShowOrigDropdown(true);
                    setOrigActiveIdx(-1);
                } else {
                    setOrigSuggestions([]);
                    setShowOrigDropdown(false);
                }
            } catch (error) {
                setOrigSuggestions([]);
                setShowOrigDropdown(false);
                console.error("Geocoding fetch completely failed:", error);
            } finally {
                setOrigLoading(false);
            }
        }, 150);

        return () => clearTimeout(delayDebounceFn);
    }, [cityInput]);

    // Destination Autocomplete debounce search
    useEffect(() => {
        if (!destInput || destInput.length < 2) {
            setDestSuggestions([]);
            setShowDestDropdown(false);
            return;
        }
        if (destInput === destSelectedRef.current) return;

        const delayDebounceFn = setTimeout(async () => {
            setDestLoading(true);
            try {
                const baseUrl = getApiUrl();
                const response = await fetch(`${baseUrl}/destinations/search?q=${encodeURIComponent(destInput)}`);
                if (response.ok) {
                    const data = await response.json();
                    setDestSuggestions(data);
                    setShowDestDropdown(true);
                    setDestActiveIdx(-1);
                } else {
                    setDestSuggestions([]);
                    setShowDestDropdown(false);
                }
            } catch (error) {
                setDestSuggestions([]);
                setShowDestDropdown(false);
                console.error("Geocoding fetch completely failed:", error);
            } finally {
                setDestLoading(false);
            }
        }, 150);

        return () => clearTimeout(delayDebounceFn);
    }, [destInput]);

    const handleSelectOrigin = async (result: DestinationResult) => {
        origSelectedRef.current = result.name;
        setCityInput(result.name);
        setShowOrigDropdown(false);
        setOrigActiveIdx(-1);
        
        setLocationStatus('loading');
        let iata = getIataCode(result.name, "", false);
        if (!iata) {
            try {
                const baseUrl = getApiUrl();
                const res = await fetch(`${baseUrl}/destinations/resolve-airport?location=${encodeURIComponent(result.name)}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.iata) iata = data.iata;
                }
            } catch (e) {
                console.error("Dynamic resolve failed during selection", e);
            }
        }

        if (iata) {
            setResolvedIata(iata);
            setLocationStatus('success');
        } else {
            setResolvedIata(null);
            setLocationStatus('error');
        }
    };

    const handleSelectDestination = (result: DestinationResult) => {
        destSelectedRef.current = result.name;
        setDestInput(result.name);
        setShowDestDropdown(false);
        setDestActiveIdx(-1);
    };

    const handleOrigKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!showOrigDropdown || origSuggestions.length === 0) return;
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setOrigActiveIdx((prev) => (prev < origSuggestions.length - 1 ? prev + 1 : prev));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setOrigActiveIdx((prev) => (prev > 0 ? prev - 1 : prev));
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (origActiveIdx >= 0 && origActiveIdx < origSuggestions.length) {
                handleSelectOrigin(origSuggestions[origActiveIdx]);
            }
        } else if (e.key === "Escape") {
            setShowOrigDropdown(false);
        }
    };

    const handleDestKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!showDestDropdown || destSuggestions.length === 0) return;
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setDestActiveIdx((prev) => (prev < destSuggestions.length - 1 ? prev + 1 : prev));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setDestActiveIdx((prev) => (prev > 0 ? prev - 1 : prev));
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (destActiveIdx >= 0 && destActiveIdx < destSuggestions.length) {
                handleSelectDestination(destSuggestions[destActiveIdx]);
            }
        } else if (e.key === "Escape") {
            setShowDestDropdown(false);
        }
    };

    // We removed the automatic Geolocation trigger on mount to respect user privacy.
    // Geolocation is now exclusively triggered manually via the 'handleLocateMe' button.
    const [locateRequestId, setLocateRequestId] = useState<number>(0);

    const handleLocateMe = async () => {
        setLocationStatus('loading');
        setResolvedIata(null);

        // Generate a unique ID for this locate request to prevent race conditions
        const currentRequestId = Date.now();
        setLocateRequestId(currentRequestId);

        if (!navigator.geolocation) {
            setLocationStatus('error');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    // Free client-side reverse geocoding to city name. Note: Best-effort external dependency.
                    const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
                    if (!res.ok) throw new Error("Reverse geocode network fail");
                    const data = await res.json();
                    if (!data || Object.keys(data).length === 0) throw new Error("Missing geocode data");

                    const city = data.city || data.locality || data.principalSubdivision;
                    let resolvedCode = "";
                    if (city) {
                        resolvedCode = getIataCode(city, "", false);
                        if (!resolvedCode) {
                            try {
                                const baseUrl = getApiUrl();
                                const codeRes = await fetch(`${baseUrl}/destinations/resolve-airport?location=${encodeURIComponent(city)}`);
                                if (codeRes.ok) {
                                    const codeData = await codeRes.json();
                                    if (codeData.iata) resolvedCode = codeData.iata;
                                }
                            } catch (e) {
                                console.error("Dynamic resolve failed in geolocation", e);
                            }
                        }
                    }

                    // Only apply results if this is still the active request 
                    // (meaning the user hasn't typed a manual override or started a new request)
                    setLocateRequestId((activeId) => {
                        if (activeId !== currentRequestId) return activeId;

                        if (city && resolvedCode) {
                            setCityInput(city);
                            setResolvedIata(resolvedCode);
                            setLocationStatus('success');
                        } else {
                            if (city) setCityInput(city);
                            setLocationStatus('error');
                        }

                        return 0; // clear active token
                    });
                } catch (error) {
                    setLocateRequestId((activeId) => {
                        if (activeId === currentRequestId) {
                            setCityInput("");
                            setLocationStatus('error');
                        }
                        return activeId === currentRequestId ? 0 : activeId;
                    });
                }
            },
            (error) => {
                console.warn("Geolocation Error:", error);
                setLocateRequestId((activeId) => {
                    if (activeId === currentRequestId) {
                        setCityInput("");
                        setLocationStatus('error');
                    }
                    return activeId === currentRequestId ? 0 : activeId;
                });
            },
            { timeout: 10000 }
        );
    };

    const handleCityInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        origSelectedRef.current = null;
        setCityInput(e.target.value);
        setLocateRequestId(0); // Cancel any pending GPS results
        setLocationStatus('idle');
    };

    const handleDestInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        destSelectedRef.current = null;
        setDestInput(e.target.value);
        setDestError(false);
    };

    // Extract just the city part from a possibly comma-separated geocoded string
    // e.g. "Srikakulam, Andhra Pradesh, India" → "Srikakulam"
    const extractCityName = (input: string): string => {
        return input.split(',')[0].trim();
    };

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocateRequestId(0); // Cancel any pending GPS results
        setDestError(false);

        if (!cityInput) return;

        setLocationStatus('loading');

        const baseUrl = getApiUrl();

        let dIata: string | null = null;
        if (destInput) {
            dIata = getIataCode(destInput, "", false);
            if (!dIata) {
                // Extract just the city name, then try dynamic resolve via backend
                const destCity = extractCityName(destInput);
                try {
                    const res = await fetch(`${baseUrl}/destinations/resolve-airport?location=${encodeURIComponent(destCity)}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.iata) dIata = data.iata;
                    }
                } catch (err) {
                    console.error("Failed to dynamically resolve destination airport", err);
                }
            }
            if (!dIata) {
                setResolvedDestIata(null);
                setDestError(true);
                setLocationStatus('idle');
                return;
            }
        }

        // Resolve origin — extract city first so "Srikakulam, Andhra Pradesh, India" → "Srikakulam"
        const originCity = extractCityName(cityInput);
        let iata = getIataCode(originCity, "", false);
        if (!iata) {
            try {
                const res = await fetch(`${baseUrl}/destinations/resolve-airport?location=${encodeURIComponent(originCity)}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.iata) iata = data.iata;
                }
            } catch (err) {
                console.error("Failed to dynamically resolve origin airport", err);
            }
        }

        if (iata) {
            setResolvedIata(iata);
            setResolvedDestIata(dIata);
            setLocationStatus('success');
        } else {
            setResolvedIata(null);
            setLocationStatus('error');
        }
    };

    const { data: flightData, isLoading: flightsLoading, isError: flightsError } = useEmergencyFlights(
        resolvedIata ? { originLocationCode: resolvedIata, destinationLocationCode: resolvedDestIata || undefined, currencyCode } : null
    );

    const flights = flightData?.data || [];

    // Sort flights from Cheapest to highest
    const sortedFlights = [...flights].sort((a, b) => {
        const pA = parseFloat(a.price?.total || '0');
        const pB = parseFloat(b.price?.total || '0');
        return pA - pB;
    }).slice(0, 3); // Take top 3

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-all"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 h-full w-full max-w-2xl bg-ink-900 border-l border-white/10 z-[60] shadow-2xl flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-gradient-to-r from-red-500/10 to-transparent">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-500/20 rounded-xl">
                                    <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
                                </div>
                                <h2 className="text-xl font-bold font-syne text-white">Emergency Flights</h2>
                            </div>
                            <button
                                aria-label="Close panel"
                                onClick={onClose}
                                className="p-2 rounded-full hover:bg-white/10 transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-400 hover:text-white" />
                            </button>
                        </div>

                        {/* Body content */}
                        <div className="flex-1 overflow-y-auto w-full flex flex-col p-6 gap-6 no-scrollbar">
                            <div className="text-sm text-slate-300">
                                Need to get out immediately? We'll find you the cheapest flights leaving today or tomorrow from your nearest airport to {defaultHub.label}.
                            </div>

                            {/* Location Section */}
                            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                                <form onSubmit={handleManualSubmit} className="flex flex-col gap-4">
                                    <div className="flex flex-col gap-2 relative" ref={originContainerRef}>
                                        <label className="text-xs uppercase text-sky-200/50 font-bold tracking-wider">Current Location (Origin)</label>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-400" />
                                                <input
                                                    type="text"
                                                    value={cityInput}
                                                    onChange={handleCityInputChange}
                                                    onFocus={() => {
                                                        if (origSuggestions.length > 0) setShowOrigDropdown(true);
                                                    }}
                                                    onKeyDown={handleOrigKeyDown}
                                                    placeholder={locationStatus === 'error' ? "City unavailable. Please type manually." : "Enter origin city or IATA"}
                                                    className={`w-full bg-ink-900/50 border ${locationStatus === 'error' ? 'border-red-500/50' : 'border-white/10'} rounded-lg py-2.5 pl-9 pr-4 text-white text-sm focus:outline-none focus:border-sky-500/50 transition-colors`}
                                                    role="combobox"
                                                    aria-expanded={showOrigDropdown}
                                                    aria-autocomplete="list"
                                                />

                                                {showOrigDropdown && origSuggestions.length > 0 && (
                                                    <div className="absolute w-full top-full left-0 mt-1 autocomplete-dropdown rounded-xl overflow-hidden animate-in fade-in slide-in-from-top-1 z-[99]">
                                                        <ul role="listbox" className="max-h-48 overflow-y-auto custom-scrollbar">
                                                            {origSuggestions.map((s, idx) => (
                                                                <li key={s.id} role="option" aria-selected={origActiveIdx === idx}>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleSelectOrigin(s)}
                                                                        className={`w-full text-left px-3 py-2 flex items-center gap-2 transition-colors border-b border-white/5 last:border-0 ${origActiveIdx === idx ? "bg-sky-600/30" : "hover:bg-white/10"}`}
                                                                    >
                                                                        <MapPin className="text-sky-400 h-3.5 w-3.5 shrink-0" />
                                                                        <span className="text-white text-xs truncate">{s.name} ({s.country})</span>
                                                                    </button>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleLocateMe}
                                                disabled={locationStatus === 'loading'}
                                                className="bg-white/10 hover:bg-white/20 p-2.5 rounded-lg border border-white/5 transition-colors disabled:opacity-50 shrink-0"
                                                title="Use GPS Location"
                                            >
                                                {locationStatus === 'loading' ? (
                                                    <Loader2 className="w-4 h-4 text-sky-400 animate-spin" />
                                                ) : (
                                                    <Navigation className="w-4 h-4 text-sky-400" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2 relative" ref={destContainerRef}>
                                        <label className="text-xs uppercase text-indigo-200/50 font-bold tracking-wider">Destination (Optional)</label>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <Plane className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
                                                <input
                                                    type="text"
                                                    value={destInput}
                                                    onChange={handleDestInputChange}
                                                    onFocus={() => {
                                                        if (destSuggestions.length > 0) setShowDestDropdown(true);
                                                    }}
                                                    onKeyDown={handleDestKeyDown}
                                                    placeholder={`Enter destination \u2014 defaults to ${defaultHub.label}`}
                                                    className={`w-full bg-ink-900/50 border ${destError ? 'border-red-500/50' : 'border-white/10'} rounded-lg py-2.5 pl-9 pr-4 text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-colors`}
                                                    role="combobox"
                                                    aria-expanded={showDestDropdown}
                                                    aria-autocomplete="list"
                                                />

                                                {showDestDropdown && destSuggestions.length > 0 && (
                                                    <div className="absolute w-full top-full left-0 mt-1 autocomplete-dropdown rounded-xl overflow-hidden animate-in fade-in slide-in-from-top-1 z-[99]">
                                                        <ul role="listbox" className="max-h-48 overflow-y-auto custom-scrollbar">
                                                            {destSuggestions.map((s, idx) => (
                                                                <li key={s.id} role="option" aria-selected={destActiveIdx === idx}>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleSelectDestination(s)}
                                                                            className={`w-full text-left px-3 py-2 flex items-center gap-2 transition-colors border-b border-white/5 last:border-0 ${destActiveIdx === idx ? "bg-sky-600/30" : "hover:bg-white/10"}`}
                                                                        >
                                                                            <MapPin className="text-sky-400 h-3.5 w-3.5 shrink-0" />
                                                                            <span className="text-white text-xs truncate">{s.name} ({s.country})</span>
                                                                        </button>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="w-[42px] shrink-0 pointer-events-none" />
                                        </div>
                                        {destError && (
                                            <span className="text-xs text-red-400/90 font-medium px-1 mt-0.5">
                                                Unrecognized destination. Try a 3-letter IATA code or major city.
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        type="submit"
                                        className="w-full py-2 bg-gradient-to-r from-sky-500/20 to-indigo-500/20 hover:from-sky-500/30 hover:to-indigo-500/30 text-sky-300 text-sm font-medium rounded-lg transition-colors border border-sky-500/30"
                                    >
                                        Search Rescue Flights
                                    </button>
                                </form>

                                {resolvedIata && (
                                    <div className="mt-4 text-xs text-emerald-400 flex flex-wrap items-center justify-center gap-1.5 bg-emerald-500/10 py-2 rounded-md border border-emerald-500/20">
                                        <Plane className="w-4 h-4" />
                                        Monitoring <b>{resolvedIata}</b> {resolvedDestIata ? `to ${resolvedDestIata}` : `to ${defaultHub.label}`}
                                    </div>
                                )}
                            </div>

                            {/* Results Section */}
                            <div className="flex-1 flex flex-col gap-4">
                                {flightsLoading && (
                                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                                        <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
                                        <p className="text-xs text-sky-200/50 uppercase tracking-widest">Scanning live inventory...</p>
                                    </div>
                                )}

                                {flightsError && (
                                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-center text-red-400 text-sm">
                                        Failed to connect to Amadeus to fetch flights. Please try another city code!
                                    </div>
                                )}

                                {!flightsLoading && !flightsError && resolvedIata && sortedFlights.length === 0 && (
                                    <div className="p-4 border border-white/10 border-dashed rounded-xl text-center text-slate-400 text-sm">
                                        No viable rescue routes available for today from {resolvedIata}.
                                    </div>
                                )}

                                {!flightsLoading && sortedFlights.length > 0 && (
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-bold text-white">Cheapest Immediate Departures</h3>
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                                                {sortedFlights.length} Routes
                                            </span>
                                        </div>

                                        {/* Mobile Layout specialized cards to fit Drawer */}
                                        {sortedFlights.map((flight: any, idx) => (
                                            <motion.div
                                                key={flight.id || idx}
                                                initial={{ y: 10, opacity: 0 }}
                                                animate={{ y: 0, opacity: 1 }}
                                                transition={{ delay: idx * 0.1 }}
                                                className="w-full"
                                            >
                                                <FlightCard flight={flight} currencyOverride={currencyCode} />
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
