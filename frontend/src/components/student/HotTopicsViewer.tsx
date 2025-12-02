import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, TrendingUp } from "lucide-react";

interface HotTopicsViewerProps {
    hotTopics: string[];
    importance: { [key: string]: number };
}

export const HotTopicsViewer = ({ hotTopics, importance }: HotTopicsViewerProps) => {
    // Handle null/undefined importance object
    const importanceValues = importance && typeof importance === 'object' 
        ? Object.values(importance) 
        : [];
    const maxImportance = importanceValues.length > 0 ? Math.max(...importanceValues) : 1;

    return (
        <Card className="border-orange-500/20 bg-orange-500/5 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-500">
                    <Flame className="h-6 w-6 animate-pulse" />
                    Hot Topics
                </CardTitle>
                <CardDescription>
                    High-frequency topics extracted from previous year questions.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-wrap gap-3">
                    {hotTopics.map((topic, index) => {
                        const count = importance[topic];

                        return (
                            <Badge
                                key={topic}
                                variant="outline"
                                className={`
                                    px-4 py-2 text-sm cursor-default transition-all duration-300
                                    ${index < 3 ? "border-orange-500 text-orange-500 bg-orange-500/10" : "border-muted-foreground/30"}
                                    hover:scale-105 hover:border-orange-400
                                `}
                            >
                                {topic}
                                <span className="ml-2 text-xs opacity-70">({count})</span>
                                {index < 3 && <TrendingUp className="ml-2 h-3 w-3 inline" />}
                            </Badge>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
};
