import { useQuery } from '@tanstack/react-query';
import { getApiUrl } from '@/utils/api';

export interface FlightSearchParams {
    originLocationCode: string;
    destinationLocationCode: string;
    departureDate: string;
    returnDate?: string;
    adults: number;
    currencyCode?: string;
    tripId?: string;
}

export function useFlights(params: FlightSearchParams | null) {
    return useQuery({
        queryKey: ['flights', params],
        queryFn: async (): Promise<any> => {
            if (!params) return [];

            const queryParams = new URLSearchParams();
            Object.entries(params).forEach(([key, value]) => {
                if (value) queryParams.append(key, value.toString());
            });

            const baseUrl = getApiUrl();

            const response = await fetch(`${baseUrl}/flights/search?${queryParams.toString()}`);
            if (!response.ok) {
                throw new Error('Failed to fetch flights');
            }
            return response.json();
        },
        enabled: !!params && !!params.originLocationCode && !!params.destinationLocationCode && !!params.departureDate,
    });
};
