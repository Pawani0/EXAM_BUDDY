import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeatureCardProps {
    title: string;
    description: string;
    icon: LucideIcon;
    gradient: string;
    onClick: () => void;
    badge?: string;
    disabled?: boolean;
}

export const FeatureCard = ({
    title,
    description,
    icon: Icon,
    gradient,
    onClick,
    badge,
    disabled = false,
}: FeatureCardProps) => {
    return (
        <Card
            className={cn(
                "glass-card group relative overflow-hidden cursor-pointer transition-all duration-200 ease-out",
                "hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/10",
                "border-2 border-transparent hover:border-primary/50",
                "will-change-transform",
                disabled && "opacity-50 cursor-not-allowed"
            )}
            onClick={!disabled ? onClick : undefined}
        >
            {/* Gradient Background */}
            <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300", gradient)} />

            {/* Content */}
            <CardHeader className="relative z-10">
                <div className="flex items-start justify-between">
                    <div className={cn(
                        "h-14 w-14 rounded-2xl flex items-center justify-center transition-all duration-200 ease-out",
                        "bg-gradient-to-br from-primary/20 to-primary/5",
                        "group-hover:scale-110 group-hover:rotate-6",
                        "will-change-transform"
                    )}>
                        <Icon className="h-7 w-7 text-primary" />
                    </div>
                    {badge && (
                        <Badge variant="secondary" className="animate-pulse">
                            {badge}
                        </Badge>
                    )}
                </div>
                <CardTitle className="mt-4 text-xl group-hover:text-primary transition-colors">
                    {title}
                </CardTitle>
                <CardDescription className="text-sm">
                    {description}
                </CardDescription>
            </CardHeader>
        </Card>
    );
};
