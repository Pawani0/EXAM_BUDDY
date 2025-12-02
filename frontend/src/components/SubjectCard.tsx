import { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SubjectCardProps {
  name: string;
  icon: LucideIcon;
  color: string;
  onClick: () => void;
}

const gradients = [
  "bg-gradient-to-br from-blue-500/20 to-cyan-500/20",
  "bg-gradient-to-br from-purple-500/20 to-pink-500/20",
  "bg-gradient-to-br from-green-500/20 to-emerald-500/20",
  "bg-gradient-to-br from-orange-500/20 to-red-500/20",
  "bg-gradient-to-br from-indigo-500/20 to-purple-500/20",
  "bg-gradient-to-br from-pink-500/20 to-rose-500/20",
];

export const SubjectCard = ({ name, icon: Icon, color, onClick }: SubjectCardProps) => {
  const randomGradient = gradients[Math.floor(Math.random() * gradients.length)];

  return (
    <Card
      className={cn(
        "glass-card group relative overflow-hidden cursor-pointer transition-all duration-200 ease-out",
        "hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/10",
        "border-2 border-transparent hover:border-primary/50",
        "will-change-transform"
      )}
      onClick={onClick}
    >
      {/* Gradient Background */}
      <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300", randomGradient)} />

      {/* Content */}
      <CardHeader className="relative z-10">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "h-14 w-14 rounded-xl flex items-center justify-center transition-all duration-200 ease-out",
              "bg-gradient-to-br from-primary/20 to-primary/5",
              "group-hover:scale-110 group-hover:rotate-6",
              "will-change-transform"
            )}
          >
            <Icon className="h-7 w-7 text-primary" />
          </div>

          <div className="flex-1">
            <CardTitle className="text-xl group-hover:text-primary transition-colors">{name}</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative z-10">
        <Button
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          size="sm"
          className="w-full bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 transition-opacity"
        >
          View Resources
        </Button>
      </CardContent>
    </Card>
  );
};
