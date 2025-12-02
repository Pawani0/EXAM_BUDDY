import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { ThemeBackground } from "@/components/student/ThemeBackground";
import { FileUploadCard } from "@/components/student/FileUploadCard";
import { LoadingSpinner } from "@/components/student/LoadingSpinner";
import { UnitSelector } from "@/components/student/UnitSelector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/useAuth";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Download, BookOpen } from "lucide-react";

interface SyllabusUnit {
    unit: string;
    unit_name?: string | null;
    topics: string[];
}

const PracticePaperGeneration = () => {
    const navigate = useNavigate();
    const { user, clearUser, setUser } = useAuth();
    const apiBaseUrl = useMemo(() => import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000", []);

    const [syllabusFile, setSyllabusFile] = useState<File[]>([]);
    const [syllabusUnits, setSyllabusUnits] = useState<SyllabusUnit[]>([]);
    const [selectedUnits, setSelectedUnits] = useState<SyllabusUnit[]>([]);
    const [difficulty, setDifficulty] = useState("Medium");
    const [quantity, setQuantity] = useState([10]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [generatedPaper, setGeneratedPaper] = useState<any>(null);

    useEffect(() => {
        if (!user) {
            navigate("/login", { replace: true });
        }
    }, [user, navigate]);

    useEffect(() => {
        setSelectedUnits(syllabusUnits);
    }, [syllabusUnits]);

    if (!user) return null;

    const handleLogout = () => {
        clearUser();
        toast.success("Logged out successfully");
        navigate("/login");
    };

    const refreshUser = async () => {
        try {
            const res = await fetch(`${apiBaseUrl}/auth/user/${user.id}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            if (res.ok) {
                const userData = await res.json();
                setUser(userData);
            }
        } catch (e) {
            console.error("Failed to refresh user", e);
        }
    };

    const handleSyllabusUpload = async () => {
        if (syllabusFile.length === 0) {
            toast.error("Please upload syllabus file");
            return;
        }

        try {
            const formData = new FormData();
            formData.append("file", syllabusFile[0]);
            const res = await fetch(`${apiBaseUrl}/extract_syllabus/`, {
                method: "POST",
                body: formData,
            });
            if (!res.ok) throw new Error("Failed to extract syllabus");
            const data = await res.json();
            setSyllabusUnits(data);
            toast.success("Syllabus extracted!");
        } catch (e) {
            toast.error("Syllabus extraction failed");
        }
    };

    const handleGenerate = async () => {
        if (selectedUnits.length === 0) {
            toast.error("Please select at least one unit");
            return;
        }

        setIsProcessing(true);

        try {
            const res = await fetch(`${apiBaseUrl}/student/practice-paper`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "X-User-Id": String(user.id) },
                body: JSON.stringify({
                    syllabus: selectedUnits,
                    difficulty,
                    quantity: quantity[0],
                }),
            });

            if (res.ok) {
                const paper = await res.json();
                setGeneratedPaper(paper);
                toast.success("Practice paper generated!");
                await refreshUser();
            } else {
                const error = await res.json();
                throw new Error(error.detail || "Failed to generate paper");
            }
        } catch (e: any) {
            toast.error(e.message || "Failed to generate paper");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownload = async () => {
        if (!generatedPaper) return;
        setIsDownloading(true);

        try {
            const formattedData = {
                "Practice Paper": {
                    Questions: generatedPaper.questions.map(
                        (q: any) => `${q.question} (${q.marks} Marks) - [${q.topic}]`
                    ),
                },
            };

            const res = await fetch(`${apiBaseUrl}/pyq/generate-pdf`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ clusters: formattedData }),
            });

            if (!res.ok) throw new Error("PDF generation failed");
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "Practice_Paper.pdf";
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success("PDF downloaded!");
        } catch (e) {
            toast.error("Failed to download PDF");
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="min-h-screen relative overflow-hidden">
            <ThemeBackground />
            <Header showAuth={false} showStudentActions onLogout={handleLogout} />

            <main className="container mx-auto px-4 py-8 relative z-10">
                <Button variant="ghost" onClick={() => navigate("/student")} className="mb-6">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                </Button>

                <div className="max-w-6xl mx-auto space-y-8">
                    <div className="text-center space-y-2">
                        <h1 className="text-3xl font-bold">Practice Paper Generation</h1>
                        <p className="text-muted-foreground">
                            Generate custom practice papers tailored to your syllabus
                        </p>
                    </div>

                    {!generatedPaper ? (
                        <>
                            <FileUploadCard
                                title="Upload Syllabus"
                                description="Upload your course syllabus PDF"
                                accept="application/pdf"
                                multiple={false}
                                files={syllabusFile}
                                onFilesSelected={setSyllabusFile}
                            />

                            {syllabusFile.length > 0 && syllabusUnits.length === 0 && (
                                <Button onClick={handleSyllabusUpload} className="w-full">
                                    Extract Syllabus
                                </Button>
                            )}

                            {syllabusUnits.length > 0 && (
                                <>
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Paper Configuration</CardTitle>
                                            <CardDescription>Customize your practice paper settings</CardDescription>
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
                                                <Label>Number of Questions: {quantity[0]}</Label>
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
                                                <UnitSelector units={syllabusUnits} onSelectionChange={setSelectedUnits} />
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Button
                                        className="w-full h-12 text-lg"
                                        onClick={handleGenerate}
                                        disabled={isProcessing || selectedUnits.length === 0}
                                    >
                                        Generate Practice Paper
                                    </Button>

                                    {isProcessing && <LoadingSpinner message="Generating your practice paper..." />}
                                </>
                            )}
                        </>
                    ) : (
                        <Card className="bg-background/60 backdrop-blur-md">
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <CardTitle>Paper Preview</CardTitle>
                                        <CardDescription>{generatedPaper.title}</CardDescription>
                                    </div>
                                    <Button onClick={handleDownload} disabled={isDownloading}>
                                        {isDownloading ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <Download className="mr-2 h-4 w-4" />
                                        )}
                                        Download PDF
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2 will-change-transform contain-content">
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
                                                    <Badge variant="outline" className="text-xs">
                                                        {q.topic}
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-6">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setGeneratedPaper(null);
                                            setSyllabusFile([]);
                                            setSyllabusUnits([]);
                                        }}
                                        className="w-full"
                                    >
                                        Generate New Paper
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </main>

            {isProcessing && <LoadingSpinner message="Generating your practice paper..." />}
        </div>
    );
};

export default PracticePaperGeneration;
