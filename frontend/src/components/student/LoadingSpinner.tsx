import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
    message?: string;
}

export const LoadingSpinner = ({ message = "Processing..." }: LoadingSpinnerProps) => {
    return (
        <div className="fixed inset-0 bg-background/95 backdrop-blur-md z-[100] flex flex-col items-center justify-center space-y-4">
            <div className="relative">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
                <div className="absolute inset-0 h-16 w-16 animate-ping opacity-20">
                    <Loader2 className="h-16 w-16 text-primary" />
                </div>
            </div>
            <p className="text-lg font-medium text-foreground animate-pulse">{message}</p>
        </div>
    );
};
