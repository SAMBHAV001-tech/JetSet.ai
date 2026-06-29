import React, { useState } from "react";
import { Hotel, Star, MapPin, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface HotelData {
    hotelId: string;
    name: string;
    latitude?: number;
    longitude?: number;
    rating?: number;
    price?: string;
    distance?: number;
    matchScore?: number;
    matchReason?: string;
    image?: string;
}

const getCurrencySymbol = (currency?: string) => {
    if (!currency) return "$";
    const clean = currency.toUpperCase();
    if (clean === "INR") return "₹";
    if (clean === "EUR") return "€";
    if (clean === "GBP") return "£";
    if (clean === "JPY") return "¥";
    return clean + " ";
};

const FALLBACK_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="500" height="300" viewBox="0 0 500 300"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%231e293b"/><stop offset="100%" stop-color="%230f172a"/></linearGradient></defs><rect width="500" height="300" fill="url(%23g)"/><circle cx="250" cy="130" r="40" fill="%2310b981" fill-opacity="0.15"/><path d="M235 150 V120 H265 V150" stroke="%2310b981" stroke-width="2" fill="none"/><path d="M230 150 H270" stroke="%2310b981" stroke-width="2"/><path d="M245 110 L230 120 H270 L255 110 Z" fill="%2310b981"/><text x="250" y="200" fill="%2394a3b8" font-family="sans-serif" font-size="14" text-anchor="middle" font-weight="bold">Premium Stay</text></svg>`;

export default function HotelCard({ 
    hotel, 
    isSelected, 
    onClick, 
    cityCode, 
    checkin, 
    checkout,
    curr
}: { 
    hotel: HotelData, 
    isSelected?: boolean, 
    onClick?: () => void, 
    cityCode?: string, 
    checkin?: string, 
    checkout?: string,
    curr?: string
}) {
    const bookingDotComUrl = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(hotel.name)}${checkin ? `&checkin=${checkin}` : ''}${checkout ? `&checkout=${checkout}` : ''}&group_adults=1&no_rooms=1`;

    const bookingLinks = [
        { name: 'MakeMyTrip', url: `https://www.makemytrip.com/hotels/hotel-search?city=${cityCode}&hotelName=${encodeURIComponent(hotel.name)}&searchText=${encodeURIComponent(hotel.name)}` },
        { name: 'Booking.com', url: bookingDotComUrl },
        { name: 'Goibibo', url: `https://www.goibibo.com/hotels/hotels-in-${cityCode}-ct/?searchText=${encodeURIComponent(hotel.name)}` },
        { name: 'Skyscanner', url: `https://www.skyscanner.net/hotels/search?q=${encodeURIComponent(hotel.name)}` },
    ];

    // Deterministic random placeholder image and price based on hotelId for visually distinct cards
    const hash = hotel.hotelId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const photos = [
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=75",
        "https://images.unsplash.com/photo-1551882547-ff40c0d5b5df?auto=format&fit=crop&w=400&q=75",
        "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=400&q=75",
        "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=400&q=75",
        "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=400&q=75",
        "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=400&q=75"
    ];
    const imageSrc = hotel.image || photos[hash % photos.length];

    // State for local image handling with derived state reset
    const [prevHotelId, setPrevHotelId] = useState(hotel.hotelId);
    const [imgSrc, setImgSrc] = useState(imageSrc);

    if (hotel.hotelId !== prevHotelId) {
        setPrevHotelId(hotel.hotelId);
        setImgSrc(imageSrc);
    }

    const hasAiBadge = hotel.matchScore !== undefined && hotel.matchScore >= 90;

    return (
        <div
            onClick={onClick}
            className={`flex flex-col h-[385px] bg-[#1c2130] rounded-2xl overflow-hidden transition-all group cursor-pointer border ${isSelected ? 'border-emerald-500 shadow-emerald-500/20 shadow-lg' : 'border-black/20 hover:border-emerald-500/50 hover:shadow-xl'}`}
        >
            {/* Top Image Section - uses custom dark gradient background to look beautiful even if image loading fails */}
            <div className="relative h-48 w-full bg-gradient-to-br from-[#1d2436] to-[#0e131f] overflow-hidden">
                <img 
                    src={imgSrc} 
                    alt={hotel.name} 
                    onError={() => setImgSrc(FALLBACK_SVG)}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                {/* AI Badge */}
                {hasAiBadge && (
                    <div className="absolute top-3 left-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[9px] uppercase font-bold tracking-wider px-2 py-1 rounded-lg shadow-md z-10">
                        AI Recommended
                    </div>
                )}

                {/* Rating Badge - Only render if genuine rating exists */}
                {hotel.rating && (
                    <div className="absolute top-3 right-3 bg-[#151923]/80 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1 border border-white/10 z-10">
                        <Star className="w-3 h-3 text-emerald-400 fill-emerald-400" />
                        <span className="text-white text-xs font-bold">{hotel.rating}</span>
                    </div>
                )}

                {/* Favorite Heart - Non-interactive until feature implemented */}
                <div className="absolute bottom-3 right-3 p-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 transition-colors z-10" role="img" aria-label="Save hotel (Coming soon)">
                    <Heart className="w-4 h-4 text-white" />
                </div>
            </div>

            {/* Bottom Content Section */}
            <div className="p-4 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-1 gap-2">
                    <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors leading-tight line-clamp-2">
                        {hotel.name}
                    </h3>
                    {hotel.price && (
                        <div className="text-right flex-shrink-0">
                            <span className="text-base font-bold text-white">
                                {getCurrencySymbol(curr)}{Number(hotel.price).toLocaleString()}
                            </span>
                            <span className="text-white/40 text-[9px] ml-0.5 uppercase">/night</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center text-white/50 text-[11px] mb-2 mt-1">
                    <MapPin className="w-3 h-3 mr-1" />
                    <span className="truncate">Distance {hotel.distance ? `• ${hotel.distance.toFixed(1)}km` : ''}</span>
                </div>

                {/* AI Match Reason and score */}
                {hotel.matchReason && (
                    <div className="mb-2 flex items-start gap-2">
                        <div className="flex-shrink-0 flex items-center justify-center px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold font-mono whitespace-nowrap" title="AI match score based on your budget, companions, interests & convenience — not just reviews">
                            ✦ {hotel.matchScore || 80}% AI Match
                        </div>
                        <p className="text-[10px] text-white/60 line-clamp-2 italic leading-tight">
                            "{hotel.matchReason}"
                        </p>
                    </div>
                )}

                <div className="mt-auto pt-1 flex flex-col gap-2">
                    {isSelected ? (
                        <>
                            <Button 
                                className="w-full h-10 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(bookingDotComUrl, '_blank', 'noopener,noreferrer');
                                }}
                            >
                                <Hotel className="w-4 h-4" />
                                Book Now on Booking.com
                            </Button>
                            <div className="grid grid-cols-3 gap-1.5 mt-0.5">
                                {bookingLinks.filter(l => l.name !== 'Booking.com').map(link => (
                                    <Button 
                                        key={link.name} 
                                        variant="outline" 
                                        className="w-full text-[9px] px-0.5 h-8 bg-white/5 hover:bg-white/10 hover:text-white border-white/10 text-white/70 transition-colors" 
                                        onClick={(e) => { 
                                            e.stopPropagation(); 
                                            window.open(link.url, '_blank', 'noopener,noreferrer'); 
                                        }}
                                    >
                                        {link.name}
                                    </Button>
                                ))}
                            </div>
                        </>
                    ) : (
                        <Button className="w-full h-10 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-semibold rounded-xl transition-colors">
                            Select to View Deals
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
