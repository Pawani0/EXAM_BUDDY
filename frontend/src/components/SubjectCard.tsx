import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SubjectCardProps {
  name: string;
  icon: LucideIcon;
  color: string;
  onClick: () => void;
}

const gradients = [
  "bg-gradient-to-br from-primary to-accent",
  "bg-gradient-to-br from-secondary to-primary",
  "bg-gradient-to-br from-accent to-secondary",
  "bg-gradient-to-br from-primary via-secondary to-accent",
  "bg-gradient-to-br from-accent to-primary",
  "bg-gradient-to-br from-secondary to-accent",
];

export const SubjectCard = ({ name, icon: Icon, color, onClick }: SubjectCardProps) => {
  const randomGradient = gradients[Math.floor(Math.random() * gradients.length)];

  return (
    <div className="group glass-card rounded-2xl p-6 hover-lift animate-scale-in border-2 border-transparent hover:border-primary/30">
      <div className="flex items-start gap-4">
        <div
          className={`h-14 w-14 rounded-xl flex items-center justify-center ${randomGradient} group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-primary/30 transition-all duration-300`}
        >
          <Icon className="h-7 w-7 text-primary-foreground" />
        </div>

        <div className="flex-1">
          <h3 className="text-xl font-semibold text-foreground mb-3 group-hover:gradient-text transition-all">{name}</h3>
          <Button
            onClick={onClick}
            size="sm"
            className="w-full shine-effect bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-primary-foreground font-semibold border-0 shadow-md"
          >
            View Resources
          </Button>
        </div>
      </div>
    </div>
  );
};
