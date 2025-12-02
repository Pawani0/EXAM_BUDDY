import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { ThemeBackground } from "@/components/student/ThemeBackground";
import { FileUploadCard } from "@/components/student/FileUploadCard";
import { LoadingSpinner } from "@/components/student/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/lib/useAuth";
import { toast } from "sonner";
import { ArrowLeft, Download, Loader2 } from "lucide-react";

interface SyllabusUnit {
    unit: string;
    unit_name?: string | null;
    topics: string[];
}

interface ClusterResult {
    [unit: string]: {
        [topic: string]: string[];
    };
}

const QuestionClustering = () => {
    const navigate = useNavigate();
    const { user, clearUser, setUser } = useAuth();
    const apiBaseUrl = useMemo(() => import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000", []);

    const [syllabusFile, setSyllabusFile] = useState<File[]>([]);
    const [pyqFiles, setPyqFiles] = useState<File[]>([]);
    const [threshold, setThreshold] = useState([0.65]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [clusters, setClusters] = useState<ClusterResult | null>(null);
    const [syllabusUnits, setSyllabusUnits] = useState<SyllabusUnit[]>([]);
    const [extractedQuestions, setExtractedQuestions] = useState<string[]>([]);

    useEffect(() => {
        if (!user) {
            navigate("/login", { replace: true });
        }
    }, [user, navigate]);

    if (!user) return null;

    const handleLogout = () => {
        clearUser();
        toast.success("Logged out successfully");
        navigate("/login");
    };

    const refreshUser = async () => {
        try {
            // Fetch updated user data by ID
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

    const handleProcess = async () => {
        if (syllabusFile.length === 0 || pyqFiles.length === 0) {
            toast.error("Please upload both syllabus and PYQ files");
            return;
        }

        setIsProcessing(true);

        try {
            // Extract syllabus
            const syllabusFormData = new FormData();
            syllabusFormData.append("file", syllabusFile[0]);
            const syllabusRes = await fetch(`${apiBaseUrl}/extract_syllabus/`, {
                method: "POST",
                body: syllabusFormData,
            });
            if (!syllabusRes.ok) throw new Error("Failed to extract syllabus");
            const syllabusData = await syllabusRes.json();
            setSyllabusUnits(syllabusData);

            // Extract questions
            let allQuestions: string[] = [];
            for (const file of pyqFiles) {
                const fd = new FormData();
                fd.append("file", file);
                const res = await fetch(`${apiBaseUrl}/extract_questions/`, {
                    method: "POST",
                    body: fd,
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.questions) allQuestions = [...allQuestions, ...data.questions];
                }
            }
            setExtractedQuestions(allQuestions);

            // Cluster questions
            const clusterRes = await fetch(`${apiBaseUrl}/pyq/cluster`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "X-User-Id": String(user.id) },
                body: JSON.stringify({
                    syllabus: syllabusData,
                    questions: allQuestions,
                    threshold: threshold[0],
                }),
            });

            if (clusterRes.ok) {
                const data = await clusterRes.json();
                setClusters(data.clusters);
                toast.success("Questions clustered successfully!");
                await refreshUser();
            } else {
                const error = await clusterRes.json();
                throw new Error(error.detail || "Clustering failed");
            }
        } catch (e: any) {
            toast.error(e.message || "Failed to cluster questions");
        } finally {
            setIsProcessing(false);
        }
    };

    const downloadPDF = async (dataToDownload: ClusterResult, filename: string) => {
        setIsGeneratingPDF(true);
        try {
            const res = await fetch(`${apiBaseUrl}/pyq/generate-pdf`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ clusters: dataToDownload }),
            });
            if (!res.ok) throw new Error("PDF generation failed");
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success("PDF downloaded!");
        } catch (e) {
            toast.error("Failed to download PDF");
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    return (
        <div className="min-h-screen relative overflow-hidden">
            <ThemeBackground />
            <Header showAuth={false} showStudentActions onLogout={handleLogout} />

            <main className="container mx-auto px-4 py-8 relative z-10">
                <Button
                    variant="ghost"
                    onClick={() => navigate("/student")}
                    className="mb-6"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                </Button>

                <div className="max-w-6xl mx-auto space-y-8">
                    <div className="text-center space-y-2">
                        <h1 className="text-3xl font-bold">Question Clustering</h1>
                        <p className="text-muted-foreground">
                            Upload your syllabus and PYQ files to organize questions by topics
                        </p>
                    </div>

                    {!clusters ? (
                        <>
                            <div className="grid md:grid-cols-2 gap-6">
                                <FileUploadCard
                                    title="Upload Syllabus"
                                    description="Upload your course syllabus PDF"
                                    accept="application/pdf"
                                    multiple={false}
                                    files={syllabusFile}
                                    onFilesSelected={setSyllabusFile}
                                />

                                <FileUploadCard
                                    title="Upload PYQs"
                                    description="Upload previous year question papers"
                                    accept="application/pdf"
                                    multiple={true}
                                    files={pyqFiles}
                                    onFilesSelected={setPyqFiles}
                                />
                            </div>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Clustering Settings</CardTitle>
                                    <CardDescription>Adjust the similarity threshold for clustering</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <Label>Similarity Threshold: {threshold[0].toFixed(2)}</Label>
                                        <Slider
                                            value={threshold}
                                            onValueChange={setThreshold}
                                            min={0.5}
                                            max={0.9}
                                            step={0.05}
                                            className="py-4"
                                        />
                                        <p className="text-sm text-muted-foreground">
                                            Higher values create more specific clusters
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Button
                                className="w-full h-12 text-lg"
                                onClick={handleProcess}
                                disabled={isProcessing || syllabusFile.length === 0 || pyqFiles.length === 0}
                            >
                                Cluster Questions
                            </Button>
                        </>
                    ) : (
                        <Card className="bg-background/60 backdrop-blur-md">
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <CardTitle>Clustered Questions</CardTitle>
                                        <CardDescription>Questions organized by topics</CardDescription>
                                    </div>
                                    <Button
                                        onClick={() => downloadPDF(clusters, "All_Clusters.pdf")}
                                        disabled={isGeneratingPDF}
                                    >
                                        {isGeneratingPDF ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <Download className="mr-2 h-4 w-4" />
                                        )}
                                        Download All PDF
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-8 max-h-[calc(100vh-400px)] overflow-y-auto pr-2">
                                    {Object.entries(clusters).map(([unit, topics]) => {
                                        const hasQuestions = Object.values(topics).some((q) => q.length > 0);
                                        if (!hasQuestions) return null;

                                        return (
                                            <div key={unit} className="border rounded-lg p-4 bg-card/50">
                                                <div className="flex justify-between items-center mb-4 border-b pb-2">
                                                    <h3 className="font-bold text-lg text-primary">{unit}</h3>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() =>
                                                            downloadPDF({ [unit]: topics }, `${unit}_Clusters.pdf`)
                                                        }
                                                    >
                                                        <Download className="h-3 w-3 mr-1" /> Unit PDF
                                                    </Button>
                                                </div>

                                                <div className="space-y-4">
                                                    {Object.entries(topics).map(([topic, questions]) =>
                                                        questions.length > 0 ? (
                                                            <div key={topic} className="space-y-2">
                                                                <h4 className="font-semibold text-sm flex items-center gap-2 text-foreground/90">
                                                                    {topic}
                                                                    <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                                                                        {questions.length}
                                                                    </span>
                                                                </h4>
                                                                <ul className="list-disc pl-5 space-y-1">
                                                                    {questions.map((q, i) => (
                                                                        <li
                                                                            key={i}
                                                                            className="text-sm text-muted-foreground leading-relaxed"
                                                                        >
                                                                            {q}
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        ) : null
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="mt-6">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setClusters(null);
                                            setSyllabusFile([]);
                                            setPyqFiles([]);
                                        }}
                                        className="w-full"
                                    >
                                        Start New Clustering
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </main>

            {isProcessing && <LoadingSpinner message="Clustering your questions..." />}
        </div>
    );
};

export default QuestionClustering;
