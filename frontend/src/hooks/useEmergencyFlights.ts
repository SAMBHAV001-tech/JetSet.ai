import { useQuery } from '@tanstack/react-query';
import { getHubForCurrency } from '@/utils/airport-mappings';
import { getApiUrl } from '@/utils/api';

export interface EmergencyFlightParams {
    originLocationCode: string;
    destinationLocationCode?: string;
    currencyCode?: string;
}

/**
 * Triggers a search specifically for one-way flights leaving *today* or *tomorrow*
 * defaulting to the cheapest non-stop or 1-stop options.
 */
export const useEmergencyFlights = (params: EmergencyFlightParams | null) => {
    return useQuery({
        queryKey: ['emergencyFlights', params],
        queryFn: async () => {
            if (!params) return null;

            // Date processing
            const todayDateObj = new Date();
            const yyyy = todayDateObj.getFullYear();
            const mm = String(todayDateObj.getMonth() + 1).padStart(2, '0');
            const dd = String(todayDateObj.getDate()).padStart(2, '0');
            const todayStr = `${yyyy}-${mm}-${dd}`;

            const queryParams = new URLSearchParams();
            queryParams.append("originLocationCode", params.originLocationCode);

            if (params.destinationLocationCode && params.destinationLocationCode.trim() !== "") {
                queryParams.append("destinationLocationCode", params.destinationLocationCode);
            } else {
                // Defaulting emergency flights to the country's capital/major hub for the selected currency
                const defaultHub = getHubForCurrency(params.currencyCode);
                queryParams.append("destinationLocationCode", defaultHub.code);
            }
            queryParams.append("departureDate", todayStr);
            queryParams.append("adults", "1");
            queryParams.append("max", "10"); // fast response

            if (params.currencyCode) {
                queryParams.append("currencyCode", params.currencyCode);
            }

            const baseUrl = getApiUrl();

            const response = await fetch(`${baseUrl}/flights/search?${queryParams.toString()}`);
            if (!response.ok) {
                let errorBody = '';
                try {
                    errorBody = await response.text();
                } catch {
                    errorBody = 'Could not read response body';
                }
                throw new Error(`Failed to fetch emergency flights (Status: ${response.status}). URL: ${baseUrl}/flights/search?${queryParams.toString()} Body: ${errorBody}`);
            }
            return response.json();
        },
        enabled: !!params && !!params.originLocationCode,
        staleTime: 60 * 1000, // 1 min (emergencies are time sensitive)
    });
};
