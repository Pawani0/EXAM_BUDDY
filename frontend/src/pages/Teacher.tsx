import { useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, BookOpen, GraduationCap, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

interface Question {
    question: string;
    answer: string;
    type: string;
}

interface AssignmentQuestion {
    id: number;
    question: string;
    marks: number;
    blooms_level: string;
}

interface Assignment {
    title: string;
    questions: AssignmentQuestion[];
}

const Teacher = () => {
    const [loading, setLoading] = useState(false);

    // Question Bank State
    const [qbTopic, setQbTopic] = useState("");
    const [qbQuantity, setQbQuantity] = useState("5");
    const [qbDifficulty, setQbDifficulty] = useState("Medium");
    const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);

    // Assignment State
    const [asTopics, setAsTopics] = useState("");
    const [asBlooms, setAsBlooms] = useState("Apply");
    const [asTypes, setAsTypes] = useState("Conceptual, Theoretical");
    const [asQuantity, setAsQuantity] = useState("5");
    const [generatedAssignment, setGeneratedAssignment] = useState<Assignment | null>(null);

    const handleGenerateQuestions = async () => {
        if (!qbTopic) {
            toast.error("Please enter a topic");
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/teacher/question-bank`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    topic: qbTopic,
                    quantity: parseInt(qbQuantity),
                    difficulty: qbDifficulty,
                }),
            });

            if (!response.ok) throw new Error("Failed to generate questions");

            const data = await response.json();
            setGeneratedQuestions(data.questions);
            toast.success("Questions generated successfully!");
        } catch (error) {
            console.error(error);
            toast.error("Error generating questions");
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateAssignment = async () => {
        if (!asTopics) {
            toast.error("Please enter topics");
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/teacher/assignment`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    topics: asTopics.split(",").map((t) => t.trim()),
                    blooms_level: asBlooms,
                    question_types: asTypes.split(",").map((t) => t.trim()),
                    quantity: parseInt(asQuantity),
                }),
            });

            if (!response.ok) throw new Error("Failed to generate assignment");

            const data = await response.json();
            setGeneratedAssignment(data);
            toast.success("Assignment generated successfully!");
        } catch (error) {
            console.error(error);
            toast.error("Error generating assignment");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <Header />
            <main className="container mx-auto px-4 py-8 max-w-5xl">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Teacher Dashboard</h1>
                    <p className="text-slate-600 dark:text-slate-400">
                        Generate educational content using AI-powered tools.
                    </p>
                </div>

                <Tabs defaultValue="question-bank" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                        <TabsTrigger value="question-bank" className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            Question Bank
                        </TabsTrigger>
                        <TabsTrigger value="assignment" className="flex items-center gap-2">
                            <GraduationCap className="h-4 w-4" />
                            Assignment
                        </TabsTrigger>
                    </TabsList>

                    {/* QUESTION BANK TAB */}
                    <TabsContent value="question-bank" className="space-y-6">
                        <div className="grid md:grid-cols-3 gap-6">
                            <Card className="md:col-span-1 h-fit">
                                <CardHeader>
                                    <CardTitle>Configuration</CardTitle>
                                    <CardDescription>Set parameters for question generation</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="topic">Topic</Label>
                                        <Input
                                            id="topic"
                                            placeholder="e.g. Photosynthesis"
                                            value={qbTopic}
                                            onChange={(e) => setQbTopic(e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="difficulty">Difficulty</Label>
                                        <Select value={qbDifficulty} onValueChange={setQbDifficulty}>
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
                                        <Label htmlFor="quantity">Quantity</Label>
                                        <Input
                                            id="quantity"
                                            type="number"
                                            min="1"
                                            max="20"
                                            value={qbQuantity}
                                            onChange={(e) => setQbQuantity(e.target.value)}
                                        />
                                    </div>

                                    <Button
                                        className="w-full"
                                        onClick={handleGenerateQuestions}
                                        disabled={loading || !qbTopic}
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Generating...
                                            </>
                                        ) : (
                                            "Generate Questions"
                                        )}
                                    </Button>
                                </CardContent>
                            </Card>

                            <Card className="md:col-span-2 min-h-[500px]">
                                <CardHeader>
                                    <CardTitle>Generated Questions</CardTitle>
                                    <CardDescription>
                                        {generatedQuestions.length > 0
                                            ? `Showing ${generatedQuestions.length} questions for "${qbTopic}"`
                                            : "Generated questions will appear here"}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-[500px] pr-4">
                                        {generatedQuestions.length > 0 ? (
                                            <div className="space-y-6">
                                                {generatedQuestions.map((q, i) => (
                                                    <div key={i} className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm">
                                                        <div className="flex items-start justify-between gap-4 mb-2">
                                                            <h3 className="font-semibold text-lg">Q{i + 1}. {q.question}</h3>
                                                            <span className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary whitespace-nowrap">
                                                                {q.type}
                                                            </span>
                                                        </div>
                                                        <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-md text-sm text-slate-700 dark:text-slate-300">
                                                            <span className="font-medium text-slate-900 dark:text-slate-100">Answer: </span>
                                                            {q.answer}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-[400px] text-slate-400">
                                                <FileText className="h-16 w-16 mb-4 opacity-20" />
                                                <p>No questions generated yet</p>
                                            </div>
                                        )}
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* ASSIGNMENT TAB */}
                    <TabsContent value="assignment" className="space-y-6">
                        <div className="grid md:grid-cols-3 gap-6">
                            <Card className="md:col-span-1 h-fit">
                                <CardHeader>
                                    <CardTitle>Assignment Setup</CardTitle>
                                    <CardDescription>Design assignment based on Bloom's Taxonomy</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="as-topics">Topics (comma separated)</Label>
                                        <Textarea
                                            id="as-topics"
                                            placeholder="e.g. Newton's Laws, Friction, Gravity"
                                            value={asTopics}
                                            onChange={(e) => setAsTopics(e.target.value)}
                                            className="min-h-[80px]"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="blooms">Bloom's Level</Label>
                                        <Select value={asBlooms} onValueChange={setAsBlooms}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Remember">Remember</SelectItem>
                                                <SelectItem value="Understand">Understand</SelectItem>
                                                <SelectItem value="Apply">Apply</SelectItem>
                                                <SelectItem value="Analyze">Analyze</SelectItem>
                                                <SelectItem value="Evaluate">Evaluate</SelectItem>
                                                <SelectItem value="Create">Create</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="types">Question Types</Label>
                                        <Input
                                            id="types"
                                            placeholder="e.g. Conceptual, Numerical"
                                            value={asTypes}
                                            onChange={(e) => setAsTypes(e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="as-quantity">Quantity</Label>
                                        <Input
                                            id="as-quantity"
                                            type="number"
                                            min="1"
                                            max="20"
                                            value={asQuantity}
                                            onChange={(e) => setAsQuantity(e.target.value)}
                                        />
                                    </div>

                                    <Button
                                        className="w-full"
                                        onClick={handleGenerateAssignment}
                                        disabled={loading || !asTopics}
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Generating...
                                            </>
                                        ) : (
                                            "Generate Assignment"
                                        )}
                                    </Button>
                                </CardContent>
                            </Card>

                            <Card className="md:col-span-2 min-h-[500px]">
                                <CardHeader>
                                    <CardTitle>Generated Assignment</CardTitle>
                                    <CardDescription>
                                        {generatedAssignment
                                            ? generatedAssignment.title
                                            : "Assignment preview will appear here"}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-[500px] pr-4">
                                        {generatedAssignment ? (
                                            <div className="space-y-6">
                                                <div className="text-center mb-8 pb-4 border-b">
                                                    <h2 className="text-2xl font-bold mb-2">{generatedAssignment.title}</h2>
                                                    <div className="flex justify-center gap-4 text-sm text-slate-500">
                                                        <span>Total Questions: {generatedAssignment.questions.length}</span>
                                                        <span>Level: {asBlooms}</span>
                                                    </div>
                                                </div>

                                                {generatedAssignment.questions.map((q) => (
                                                    <div key={q.id} className="flex gap-4 p-4 rounded-lg border bg-card/50">
                                                        <div className="flex-none flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                                                            {q.id}
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-lg font-medium mb-2">{q.question}</p>
                                                            <div className="flex gap-3 text-xs text-slate-500">
                                                                <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                                                                    Marks: {q.marks}
                                                                </span>
                                                                <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                                                                    {q.blooms_level}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-[400px] text-slate-400">
                                                <CheckCircle2 className="h-16 w-16 mb-4 opacity-20" />
                                                <p>No assignment generated yet</p>
                                            </div>
                                        )}
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
};

export default Teacher;
