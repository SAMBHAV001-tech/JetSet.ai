"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { BackendHealthProvider } from "@/components/layout/BackendHealthProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
    // Initialize the QueryClient once per session
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 60 * 1000, // 1 minute
                retry: 1,
            },
        },
    }));

    return (
        <QueryClientProvider client={queryClient}>
            <BackendHealthProvider>
                {children}
            </BackendHealthProvider>
        </QueryClientProvider>
    );
}
