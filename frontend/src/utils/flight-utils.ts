export const parseIsoDuration = (dur: string): number => {
    if (!dur) return 0;
    const timeStr = dur.replace('PT', '');
    let hours = 0, mins = 0;
    const hMatch = timeStr.match(/(\d+)H/);
    const mMatch = timeStr.match(/(\d+)M/);
    if (hMatch) hours = parseInt(hMatch[1]);
    if (mMatch) mins = parseInt(mMatch[1]);
    return hours * 60 + mins;
};

export const getFlightScore = (flight: any): { price: number; duration: number; score: number } => {
    const price = parseFloat(flight.price?.total || '0');
    const duration = parseIsoDuration(flight.itineraries?.[0]?.duration || '');
    const score = price + (duration * 0.5);
    return { price, duration, score };
};

export const compareFlights = (a: any, b: any, sortBy: 'CHEAPEST' | 'FASTEST' | 'BEST' | 'DIRECT'): number => {
    if (sortBy === 'CHEAPEST') {
        const priceA = parseFloat(a.price?.total || '0');
        const priceB = parseFloat(b.price?.total || '0');
        return priceA - priceB;
    }
    if (sortBy === 'FASTEST') {
        const durA = parseIsoDuration(a.itineraries?.[0]?.duration || '');
        const durB = parseIsoDuration(b.itineraries?.[0]?.duration || '');
        return durA - durB;
    }
    if (sortBy === 'DIRECT') {
        const stopsA = (a.itineraries?.[0]?.segments?.length || 1) - 1;
        const stopsB = (b.itineraries?.[0]?.segments?.length || 1) - 1;
        if (stopsA !== stopsB) {
            return stopsA - stopsB;
        }
        const priceA = parseFloat(a.price?.total || '0');
        const priceB = parseFloat(b.price?.total || '0');
        return priceA - priceB;
    }

    // BEST: AI matchScore descending (highest match first). Fallback to standard heuristic score.
    const scoreA = a.matchScore ?? 80;
    const scoreB = b.matchScore ?? 80;
    if (scoreA !== scoreB) {
        return scoreB - scoreA;
    }

    const algScoreA = getFlightScore(a).score;
    const algScoreB = getFlightScore(b).score;
    return algScoreA - algScoreB;
};
