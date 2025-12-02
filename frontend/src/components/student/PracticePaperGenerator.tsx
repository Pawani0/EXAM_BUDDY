import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { FileText, Loader2, Download, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { UnitSelector } from "@/components/student/UnitSelector";

interface PracticePaperGeneratorProps {
    syllabusUnits: any[];
    hotTopics: string[];
    onGenerate: (config: any) => Promise<any>;
    onDownload: (paper: any) => Promise<void>;
}

export const PracticePaperGenerator = ({ syllabusUnits, hotTopics, onGenerate, onDownload }: PracticePaperGeneratorProps) => {
    const [difficulty, setDifficulty] = useState("Medium");
    const [quantity, setQuantity] = useState([10]);
    const [selectedHotTopics, setSelectedHotTopics] = useState<string[]>([]);
    const [selectedUnits, setSelectedUnits] = useState<any[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [generatedPaper, setGeneratedPaper] = useState<any>(null);

    // Initialize selected units when syllabusUnits changes
    useEffect(() => {
        setSelectedUnits(syllabusUnits);
    }, [syllabusUnits]);

    const handleGenerate = async () => {
        if (selectedUnits.length === 0) {
            toast.error("Please select at least one unit.");
            return;
        }

        setIsGenerating(true);
        try {
            const paper = await onGenerate({
                difficulty,
                quantity: quantity[0],
                hot_topics: selectedHotTopics.length > 0 ? selectedHotTopics : undefined,
                syllabus: selectedUnits // Pass selected units explicitly
            });
            setGeneratedPaper(paper);
            toast.success("Practice paper generated!");
        } catch (error) {
            toast.error("Failed to generate paper.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownload = async () => {
        if (!generatedPaper) return;
        setIsDownloading(true);
        try {
            await onDownload(generatedPaper);
        } catch (error) {
            console.error(error);
        } finally {
            setIsDownloading(false);
        }
    };

    const toggleHotTopic = (topic: string) => {
        setSelectedHotTopics(prev =>
            prev.includes(topic)
                ? prev.filter(t => t !== topic)
                : [...prev, topic]
        );
    };

    return (
        <div className="grid md:grid-cols-2 gap-8">
            {/* Configuration */}
            <Card className="h-fit">
                <CardHeader>
                    <CardTitle>Configure Paper</CardTitle>
                    <CardDescription>Customize your practice exam settings.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>Difficulty Level</Label>
                        <Select value={difficulty} onValueChange={setDifficulty}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Easy">Easy</SelectItem>
                                <SelectItem value="Medium">Medium</SelectItem>
                                <SelectItem value="Hard">Hard</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Number of Questions: {quantity}</Label>
                        <Slider
                            value={quantity}
                            onValueChange={setQuantity}
                            min={5}
                            max={50}
                            step={5}
                            className="py-4"
                        />
                    </div>

                    <div className="space-y-2">
                        <UnitSelector
                            units={syllabusUnits}
                            onSelectionChange={setSelectedUnits}
                        />
                    </div>

                    {hotTopics.length > 0 && (
                        <div className="space-y-2">
                            <Label>Include Hot Topics (Optional)</Label>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {hotTopics.slice(0, 5).map(topic => (
                                    <Badge
                                        key={topic}
                                        variant={selectedHotTopics.includes(topic) ? "default" : "outline"}
                                        className="cursor-pointer hover:bg-primary/20 transition-colors"
                                        onClick={() => toggleHotTopic(topic)}
                                    >
                                        {topic}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}

                    <Button className="w-full" onClick={handleGenerate} disabled={isGenerating}>
                        {isGenerating ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...
                            </>
                        ) : (
                            <>
                                <FileText className="mr-2 h-4 w-4" /> Generate Paper
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* Preview */}
            <Card className="h-full min-h-[500px] flex flex-col">
                <CardHeader>
                    <CardTitle>Paper Preview</CardTitle>
                    <CardDescription>
                        {generatedPaper ? generatedPaper.title : "Generated paper will appear here."}
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden relative">
                    {generatedPaper ? (
                        <div className="h-full flex flex-col">
                            <div className="flex-1 overflow-y-auto pr-2 space-y-6 max-h-[600px]">
                                {generatedPaper.instructions && (
                                    <div className="bg-muted/50 p-4 rounded-lg text-sm">
                                        <h4 className="font-semibold mb-2">Instructions:</h4>
                                        <ul className="list-disc pl-4 space-y-1">
                                            {generatedPaper.instructions.map((inst: string, i: number) => (
                                                <li key={i}>{inst}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    {generatedPaper.questions.map((q: any, i: number) => (
                                        <div key={i} className="p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                                            <div className="flex justify-between items-start gap-4 mb-2">
                                                <span className="font-bold text-muted-foreground">Q{i + 1}.</span>
                                                <Badge variant="secondary">{q.marks} Marks</Badge>
                                            </div>
                                            <p className="font-medium mb-2">{q.question}</p>
                                            <div className="flex gap-2 text-xs text-muted-foreground">
                                                <Badge variant="outline" className="text-xs">{q.topic}</Badge>
                                                {q.is_hot_topic && (
                                                    <Badge variant="default" className="bg-orange-500/10 text-orange-500 border-orange-500/20 text-xs">
                                                        Hot Topic
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 mt-4 border-t">
                                <Button
                                    className="w-full"
                                    variant="secondary"
                                    onClick={handleDownload}
                                    disabled={isDownloading}
                                >
                                    {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                                    Download PDF
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                            <BookOpen className="h-16 w-16 mb-4" />
                            <p>Configure settings and click Generate</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
