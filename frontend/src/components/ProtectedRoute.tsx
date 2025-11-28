import { Navigate, useLocation } from "react-router-dom";
import { useAuth, Role } from "@/lib/useAuth";
import { toast } from "sonner";
import { useEffect } from "react";

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles: Role[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
    const { user } = useAuth();
    const location = useLocation();

    useEffect(() => {
        if (user && !allowedRoles.includes(user.role)) {
            toast.error("You don't have permission to access this page");
        }
    }, [user, allowedRoles]);

    if (!user) {
        // Redirect to login if not authenticated
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (!allowedRoles.includes(user.role)) {
        // Redirect based on role if authorized
        if (user.role === "admin") return <Navigate to="/admin" replace />;
        if (user.role === "teacher") return <Navigate to="/teacher" replace />;
        return <Navigate to="/student" replace />;
    }

    return <>{children}</>;
};
