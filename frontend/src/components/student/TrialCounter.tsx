import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sparkles } from "lucide-react";

interface TrialCounterProps {
    trialsUsed: number;
    maxTrials: number;
}

export const TrialCounter = ({ trialsUsed, maxTrials }: TrialCounterProps) => {
    const percentage = (trialsUsed / maxTrials) * 100;
    const remaining = maxTrials - trialsUsed;

    return (
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        Free Trial
                    </CardTitle>
                    <Badge variant={remaining > 0 ? "default" : "destructive"} className="text-sm">
                        {remaining} / {maxTrials} left
                    </Badge>
                </div>
                <CardDescription>
                    {remaining > 0
                        ? `You have ${remaining} free ${remaining === 1 ? "use" : "uses"} remaining`
                        : "Trial limit reached. Upgrade to continue!"}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Progress value={percentage} className="h-2" />
            </CardContent>
        </Card>
    );
};
