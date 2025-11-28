import React from 'react';
import { LucideIcon } from 'lucide-react';

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
        blue: "bg-blue-50 text-blue-600 group-hover:bg-blue-100",
        purple: "bg-purple-50 text-purple-600 group-hover:bg-purple-100",
        green: "bg-green-50 text-green-600 group-hover:bg-green-100",
        orange: "bg-orange-50 text-orange-600 group-hover:bg-orange-100",
    };

    const selectedColorClass = colorClasses[color as keyof typeof colorClasses] || colorClasses.blue;

    return (
        <div
            onClick={onClick}
            className="group bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer border border-gray-100 hover:border-blue-200 flex flex-col items-center text-center gap-4"
        >
            {Icon && (
                <div className={`p-4 rounded-full transition-colors duration-300 ${selectedColorClass}`}>
                    <Icon size={32} />
                </div>
            )}
            <div>
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {title}
                </h3>
                {subtitle && (
                    <p className="text-sm text-gray-500 mt-1">
                        {subtitle}
                    </p>
                )}
            </div>
        </div>
    );
};

export default SelectionCard;
