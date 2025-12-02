import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface CategoryCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
  delay?: number;
  className?: string;
}

export const CategoryCard = ({
  title,
  description,
  icon: Icon,
  onClick,
  delay = 0,
  className = "",
}: CategoryCardProps) => {
  return (
    <Card
      onClick={onClick}
      className={cn(
        "glass-card group relative overflow-hidden cursor-pointer transition-all duration-200 ease-out p-8",
        "hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/10",
        "border-2 border-transparent hover:border-primary/50",
        "animate-scale-in will-change-transform",
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-purple-500/20 to-secondary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Content */}
      <div className="relative z-10 space-y-4">
        <div className={cn(
          "h-16 w-16 rounded-2xl flex items-center justify-center transition-all duration-200 ease-out",
          "bg-gradient-to-br from-primary/20 to-primary/5",
          "group-hover:scale-110 group-hover:rotate-6",
          "will-change-transform"
        )}>
          <Icon className="h-8 w-8 text-primary" />
        </div>

        <div>
          <h3 className="text-2xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">{title}</h3>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
      </div>
    </Card>
  );
};
