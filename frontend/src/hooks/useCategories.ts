import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

export interface Category {
    id: number;
    title: string;
    description?: string | null;
    icon_name?: string | null;
    display_order: number;
    classes: Class[];
}

export interface Class {
    id: number;
    category_id: number;
    name: string;
    display_order: number;
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

const fetchCategories = async (): Promise<Category[]> => {
    const response = await fetch(`${apiBaseUrl}/api/categories`);
    if (!response.ok) {
        throw new Error("Failed to fetch categories");
    }
    return response.json();
};

export const useCategories = () => {
    return useQuery({
        queryKey: ["categories"],
        queryFn: fetchCategories,
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 30, // 30 minutes
        retry: 1,
        refetchOnWindowFocus: false,
    });
};
