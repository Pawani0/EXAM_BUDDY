import { useQuery } from "@tanstack/react-query";

export interface Subject {
    id: number;
    class_id: number;
    name: string;
    icon_name?: string | null;
    display_order: number;
}

export interface ClassData {
    id: number;
    category_id: number;
    name: string;
    display_order: number;
    subjects: Subject[];
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

const fetchClassData = async (classId: number): Promise<ClassData> => {
    const response = await fetch(`${apiBaseUrl}/api/classes/${classId}`);
    if (!response.ok) {
        throw new Error("Failed to fetch class data");
    }
    return response.json();
};

export const useClassData = (classId: string | undefined) => {
    return useQuery({
        queryKey: ["class", classId],
        queryFn: () => fetchClassData(parseInt(classId!)),
        enabled: !!classId, // Only run if classId is available
        staleTime: 1000 * 60 * 10, // 10 minutes (class subjects rarely change)
        gcTime: 1000 * 60 * 60, // 1 hour
        retry: 1,
        refetchOnWindowFocus: false,
    });
};
