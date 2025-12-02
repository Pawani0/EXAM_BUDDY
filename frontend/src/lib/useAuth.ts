import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Role = "student" | "teacher" | "admin";

export interface AuthUser {
	id: number;
	full_name: string;
	email: string;
	role: Role;
	trial_used: number;
}

interface AuthState {
	user: AuthUser | null;
	setUser: (user: AuthUser) => void;
	clearUser: () => void;
}

export const useAuth = create<AuthState>()(
	persist(
		(set) => ({
			user: null,
			setUser: (user) => set({ user }),
			clearUser: () => set({ user: null }),
		}),
		{
			name: "exam-buddy-auth",
		}
	)
);
