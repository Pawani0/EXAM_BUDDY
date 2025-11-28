import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';

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
    const colorClasses = {
        blue: "from-primary/20 to-primary/5 text-primary",
        purple: "from-accent/20 to-accent/5 text-accent",
        green: "from-secondary/20 to-secondary/5 text-secondary",
        orange: "from-orange-500/20 to-orange-500/5 text-orange-600 dark:text-orange-400",
    };

    const selectedColorClass = colorClasses[color as keyof typeof colorClasses] || colorClasses.blue;

    return (
        <Card
            onClick={onClick}
            className="group glass-card hover-lift cursor-pointer p-6 flex flex-col items-center text-center gap-4 animate-fade-in-up border-border/50 hover:border-primary/30 transition-all duration-300"
        >
            {Icon && (
                <div className={`p-4 rounded-2xl bg-gradient-to-br ${selectedColorClass} transition-all duration-300 group-hover:scale-110 shadow-lg`}>
                    <Icon size={32} className="transition-transform duration-300 group-hover:rotate-6" />
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
        </Card>
    );
};

export default SelectionCard;
