import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SelectionCardProps {
    title: string;
    subtitle?: string;
    icon?: LucideIcon;
    onClick: () => void;
    color?: string;
}

const SelectionCard: React.FC<SelectionCardProps> = ({
    title,
    subtitle,
    icon: Icon,
    onClick,
    color = "blue"
}) => {
    const gradientClasses = {
        blue: "bg-gradient-to-br from-blue-500/20 to-cyan-500/20",
        purple: "bg-gradient-to-br from-purple-500/20 to-pink-500/20",
        green: "bg-gradient-to-br from-green-500/20 to-emerald-500/20",
        orange: "bg-gradient-to-br from-orange-500/20 to-red-500/20",
    };

    const selectedGradient = gradientClasses[color as keyof typeof gradientClasses] || gradientClasses.blue;

    return (
        <Card
            onClick={onClick}
            className={cn(
                "group relative overflow-hidden cursor-pointer transition-all duration-200 ease-out p-6",
                "hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/10",
                "border-2 border-transparent hover:border-primary/50",
                "flex flex-col items-center text-center gap-4",
                "will-change-transform"
            )}
        >
            {/* Gradient Background */}
            <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300", selectedGradient)} />

            {/* Glass Effect */}
            <div className="absolute inset-0 bg-background/80 backdrop-blur-xl" />

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center gap-4">
                {Icon && (
                    <div className={cn(
                        "p-4 rounded-2xl flex items-center justify-center transition-all duration-200 ease-out",
                        "bg-gradient-to-br from-primary/20 to-primary/5",
                        "group-hover:scale-110 group-hover:rotate-6",
                        "will-change-transform"
                    )}>
                        <Icon size={32} className="text-primary" />
                    </div>
                )}
                <div>
                    <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors duration-300">
                        {title}
                    </h3>
                    {subtitle && (
                        <p className="text-sm text-muted-foreground mt-1">
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>
        </Card>
    );
};

export default SelectionCard;
