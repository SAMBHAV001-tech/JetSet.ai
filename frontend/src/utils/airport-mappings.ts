export const EMERGENCY_HUB = { code: 'LHR', label: 'London Heathrow (LHR)' };

export interface HubInfo {
    code: string;
    label: string;
}

export const getHubForCurrency = (currency?: string): HubInfo => {
    const code = (currency || 'USD').toUpperCase();
    switch (code) {
        case 'INR':
            return { code: 'DEL', label: 'Indira Gandhi International (DEL)' };
        case 'GBP':
            return { code: 'LHR', label: 'London Heathrow (LHR)' };
        case 'EUR':
            return { code: 'CDG', label: 'Paris Charles de Gaulle (CDG)' };
        case 'JPY':
            return { code: 'HND', label: 'Tokyo Haneda (HND)' };
        case 'AUD':
            return { code: 'SYD', label: 'Sydney Kingsford Smith (SYD)' };
        case 'CAD':
            return { code: 'YYZ', label: 'Toronto Pearson (YYZ)' };
        case 'SGD':
            return { code: 'SIN', label: 'Singapore Changi (SIN)' };
        case 'AED':
            return { code: 'DXB', label: 'Dubai International (DXB)' };
        case 'USD':
        default:
            return { code: 'JFK', label: 'New York John F. Kennedy (JFK)' };
    }
};

export const MAP_TO_IATA: Record<string, string> = {
    // US & Americas
    "New York": "JFK", "Los Angeles": "LAX", "Chicago": "ORD", "Miami": "MIA", "San Francisco": "SFO",
    "Dallas": "DFW", "Houston": "IAH", "Texas": "DFW", "Austin": "AUS", "San Antonio": "SAT",
    "Seattle": "SEA", "Denver": "DEN", "Boston": "BOS", "Atlanta": "ATL", "Phoenix": "PHX",
    "Las Vegas": "LAS", "Orlando": "MCO", "Washington": "IAD", "Minneapolis": "MSP",
    "Toronto": "YYZ", "Vancouver": "YVR", "Mexico City": "MEX", "Sao Paulo": "GRU",
    // Europe
    "London": "LHR", "Paris": "CDG", "Frankfurt": "FRA", "Amsterdam": "AMS", "Rome": "FCO",
    "Madrid": "MAD", "Barcelona": "BCN", "Berlin": "BER", "Munich": "MUC", "Zurich": "ZRH",
    // Asia/Pacific
    "Tokyo": "HND", "Kyoto": "ITM", "Osaka": "KIX", "Seoul": "ICN", "Beijing": "PEK",
    "Shanghai": "PVG", "Hong Kong": "HKG", "Singapore": "SIN", "Bangkok": "BKK",
    "Kuala Lumpur": "KUL", "Jakarta": "CGK", "Taipei": "TPE", "Manila": "MNL",
    // India (Comprehensive)
    "Delhi": "DEL", "New Delhi": "DEL", "Mumbai": "BOM", "Bangalore": "BLR", "Bengaluru": "BLR",
    "Chennai": "MAA", "Madras": "MAA", "Hyderabad": "HYD", "Kolkata": "CCU", "Calcutta": "CCU",
    "Ahmedabad": "AMD", "Pune": "PNQ", "Goa": "GOI", "Mopa": "GOX", "Kochi": "COK", "Cochin": "COK",
    "Bhubaneswar": "BBI", "Odisha": "BBI", "Jaipur": "JAI", "Lucknow": "LKO", "Guwahati": "GAU",
    "Thiruvananthapuram": "TRV", "Trivandrum": "TRV", "Kozhikode": "CCJ", "Calicut": "CCJ",
    "Patna": "PAT", "Bagdogra": "IXB", "Chandigarh": "IXC", "Madurai": "IXM", "Port Blair": "IXZ",
    "Srinagar": "SXR", "Amritsar": "ATQ", "Varanasi": "VNS", "Coimbatore": "CJB", "Visakhapatnam": "VTZ",
    "Nagpur": "NAG", "Bhopal": "BHO", "Indore": "IDR", "Ranchi": "IXR", "Vadodara": "BDQ",
    "Mangalore": "IXE", "Mangaluru": "IXE", "Tiruchirappalli": "TRZ", "Trichy": "TRZ",
    "Tirupati": "TIR", "Raipur": "RPR", "Jammu": "IXJ", "Dehradun": "DED", "Agartala": "IXA",
    "Imphal": "IMF", "Surat": "STV", "Udaipur": "UDR", "Jodhpur": "JDH", "Gaya": "GAY",
    "Dibrugarh": "DIB", "Silchar": "IXS", "Dimapur": "DMU", "Aurangabad": "IXU", "Rajkot": "RAJ",
    "Tuticorin": "TCR", "Hubli": "HBX", "Belgaum": "IXG", "Mysore": "MYQ",
    // Middle East & Africa
    "Dubai": "DXB", "Doha": "DOH", "Abu Dhabi": "AUH", "Istanbul": "IST", "Cairo": "CAI",
    "Johannesburg": "JNB", "Cape Town": "CPT",
    // Defaults/Fallbacks
    "India": "DEL", "USA": "JFK", "UK": "LHR",
    "United States": "JFK", "United Kingdom": "LHR", "Australia": "SYD",
    "Canada": "YYZ", "Germany": "FRA", "France": "CDG", "Japan": "NRT",
    "Qatar": "DOH", "Saudi Arabia": "RUH", "Kuwait": "KWI", "Bahrain": "BAH",
    "Colombo": "CMB", "Sri Lanka": "CMB", "Dhaka": "DAC", "Bangladesh": "DAC",
    "Kathmandu": "KTM", "Nepal": "KTM", "Karachi": "KHI", "Islamabad": "ISB",
    "Lagos": "LOS", "Nairobi": "NBO", "Addis Ababa": "ADD",
    // Himalayan & Tibetan routes
    "Simikot": "IMK", "Hilsa": "IMK",
    "Nepalganj": "KEP", "Nepalgunj": "KEP",
    "Kailash Mansarovar": "GXQ", "Kailash Mansrovar": "GXQ",
    "Kailash": "GXQ", "Mansarovar": "GXQ",
    "Darchen": "GXQ", "Taklakot": "GXQ", "Purang": "GXQ",
    "Lhasa": "LXA", "Shigatse": "RKZ", "Nyalam": "GXQ",
    "Ali": "GXQ", "Tibet": "GXQ",
    "Leh": "IXL", "Ladakh": "IXL", "Manali": "KUU",
    "Shimla": "SLV", "Dharamshala": "DHM", "Dharamsala": "DHM",
    "Haridwar": "DED", "Rishikesh": "DED",
    "Cuttack": "BBI", "Pokhara": "PKR"
};

/**
 * Normalizes an origin/destination string to a valid IATA code.
 * Reverts to "DEL" (or another default) if no mapping is found.
 */
export const getIataCode = (location: string, fallback: string = "DEL", allowCountryFallback: boolean = true): string => {
    if (!location) return fallback;
    const cleanLocation = location.trim();
    // Check if user literally typed "JFK" or something exactly 3 letters first.
    if (cleanLocation.length === 3 && /^[A-Za-z]{3}$/.test(cleanLocation)) {
        return cleanLocation.toUpperCase();
    }

    const lowerLocation = cleanLocation.toLowerCase();

    // 1. Exact case-insensitive match (highest priority to stop masking)
    for (const [key, value] of Object.entries(MAP_TO_IATA)) {
        if (key.toLowerCase() === lowerLocation) {
            return value;
        }
    }

    // List of country keys in MAP_TO_IATA to separate from cities
    const countries = [
        "india", "usa", "uk", "united states", "united kingdom", "australia",
        "canada", "germany", "france", "japan", "qatar", "saudi arabia", "kuwait",
        "bahrain", "colombo", "sri lanka", "dhaka", "bangladesh", "kathmandu", "nepal",
        "karachi", "islamabad", "lagos", "nairobi", "addis ababa"
    ];

    // 2. Longest-key partial match (excluding country fallbacks to prevent wrong resolution)
    const sortedKeys = Object.keys(MAP_TO_IATA).sort((a, b) => b.length - a.length);
    for (const key of sortedKeys) {
        if (countries.includes(key.toLowerCase())) continue;
        if (lowerLocation.includes(key.toLowerCase())) {
            return MAP_TO_IATA[key];
        }
    }

    // 3. Last resort: Country fallback match (only if allowed)
    if (allowCountryFallback) {
        for (const key of sortedKeys) {
            if (!countries.includes(key.toLowerCase())) continue;
            if (lowerLocation.includes(key.toLowerCase())) {
                return MAP_TO_IATA[key];
            }
        }
    }

    return allowCountryFallback ? fallback : "";
};
