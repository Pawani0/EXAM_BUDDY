import { useQuery } from "@tanstack/react-query";

export interface Notification {
    id: number;
    title: string;
    message: string;
    link_url?: string | null;
    link_text?: string | null;
    priority: "info" | "warning" | "urgent";
    display_order: number;
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

const fetchNotifications = async (): Promise<Notification[]> => {
    const response = await fetch(`${apiBaseUrl}/api/notifications`);
    if (!response.ok) {
        throw new Error("Failed to fetch notifications");
    }
    return response.json();
};

export const useNotifications = () => {
    return useQuery({
        queryKey: ["notifications"],
        queryFn: fetchNotifications,
        staleTime: 1000 * 60 * 2, // 2 minutes (notifications might change more often)
        gcTime: 1000 * 60 * 10, // 10 minutes
        retry: 1,
        refetchOnWindowFocus: true, // Refetch on window focus to show latest alerts
    });
};
