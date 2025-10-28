import { LucideIcon } from "lucide-react";

interface CategoryCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
  delay?: number;
}

export const CategoryCard = ({
  title,
  description,
  icon: Icon,
  onClick,
  delay = 0,
}: CategoryCardProps) => {
  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden glass-card rounded-3xl p-8 text-left hover-lift animate-scale-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 blur-3xl transition-all duration-500 group-hover:scale-150" />
      <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-secondary/20 blur-3xl" />
      
      <div className="relative space-y-4">
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center group-hover:shadow-lg group-hover:shadow-primary/30 transition-all duration-300">
          <Icon className="h-8 w-8 text-primary-foreground" />
        </div>
        
        <div>
          <h3 className="text-2xl font-bold text-foreground mb-2 group-hover:gradient-text transition-all">{title}</h3>
          <p className="text-muted-foreground">{description}</p>
        </div>
      </div>
    </button>
  );
};
