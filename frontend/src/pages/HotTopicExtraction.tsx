import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { ThemeBackground } from "@/components/student/ThemeBackground";
import { FileUploadCard } from "@/components/student/FileUploadCard";
import { LoadingSpinner } from "@/components/student/LoadingSpinner";
import { HotTopicsViewer } from "@/components/student/HotTopicsViewer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/useAuth";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";

interface SyllabusUnit {
    unit: string;
    unit_name?: string | null;
    topics: string[];
}

const HotTopicExtraction = () => {
    const navigate = useNavigate();
    const { user, clearUser, setUser } = useAuth();
    const apiBaseUrl = useMemo(() => import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000", []);

    const [syllabusFile, setSyllabusFile] = useState<File[]>([]);
    const [pyqFiles, setPyqFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [hotTopics, setHotTopics] = useState<string[]>([]);
    const [importance, setImportance] = useState<{ [key: string]: number }>({});

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
            // Create FormData with all files
            const formData = new FormData();
            formData.append("syllabus", syllabusFile[0]);
            
            // Append all PYQ files
            for (const file of pyqFiles) {
                formData.append("pyq_files", file);
            }

            // Extract hot topics
            const hotTopicsRes = await fetch(`${apiBaseUrl}/student/hot-topics`, {
                method: "POST",
                headers: { "X-User-Id": String(user.id) },
                body: formData,
            });

            if (hotTopicsRes.ok) {
                const data = await hotTopicsRes.json();
                // hot_topics is an object with topic names as keys and counts as values
                const topicNames = Object.keys(data.hot_topics);
                setHotTopics(topicNames);
                setImportance(data.hot_topics);
                toast.success("Hot topics extracted successfully!");
                await refreshUser();
            } else {
                const error = await hotTopicsRes.json();
                throw new Error(error.detail || "Failed to extract hot topics");
            }
        } catch (e: any) {
            toast.error(e.message || "Failed to extract hot topics");
        } finally {
            setIsProcessing(false);
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
                        <h1 className="text-3xl font-bold">Hot Topic Extraction</h1>
                        <p className="text-muted-foreground">
                            Identify the most important topics based on previous year questions
                        </p>
                    </div>

                    {hotTopics.length === 0 ? (
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

                            <Button
                                className="w-full h-12 text-lg"
                                onClick={handleProcess}
                                disabled={isProcessing || syllabusFile.length === 0 || pyqFiles.length === 0}
                            >
                                Extract Hot Topics
                            </Button>

                            {isProcessing && <LoadingSpinner message="Analyzing question patterns..." />}
                        </>
                    ) : (
                        <>
                            <HotTopicsViewer hotTopics={hotTopics} importance={importance} />
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setHotTopics([]);
                                    setImportance({});
                                    setSyllabusFile([]);
                                    setPyqFiles([]);
                                }}
                                className="w-full"
                            >
                                Start New Analysis
                            </Button>
                        </>
                    )}
                </div>
            </main>

            {isProcessing && <LoadingSpinner message="Analyzing question patterns..." />}
        </div>
    );
};

export default HotTopicExtraction;
