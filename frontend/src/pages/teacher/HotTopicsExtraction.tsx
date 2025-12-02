import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { ThemeBackground } from "@/components/student/ThemeBackground";
import { Button } from "@/components/ui/button";
import { FileUploadCard } from "@/components/student/FileUploadCard";
import { LoadingSpinner } from "@/components/student/LoadingSpinner";
import { HotTopicsViewer } from "@/components/student/HotTopicsViewer";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/useAuth";
import { TrialCounter } from "@/components/student/TrialCounter";

const HotTopicsExtraction = () => {
    const navigate = useNavigate();
    const { user, clearUser, setUser } = useAuth();
    const apiBaseUrl = useMemo(() => import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000", []);

    const [loading, setLoading] = useState(false);
    const [syllabusFile, setSyllabusFile] = useState<File[]>([]);
    const [pyqFiles, setPyqFiles] = useState<File[]>([]);
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
            const res = await fetch(`${apiBaseUrl}/users/${user.id}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            if (res.ok) {
                const userData = await res.json();
                console.log("Updated user data:", userData);
                setUser(userData);
            } else {
                console.error("Failed to refresh user:", res.status);
            }
        } catch (e) {
            console.error("Failed to refresh user", e);
        }
    };

    const handleExtractHotTopics = async () => {
        if (syllabusFile.length === 0 || pyqFiles.length === 0) {
            toast.error("Please upload both syllabus and PYQ files");
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append("syllabus", syllabusFile[0]);
            
            // Append all PYQ files with the correct field name
            for (const file of pyqFiles) {
                formData.append("pyq_files", file);
            }

            const res = await fetch(`${apiBaseUrl}/teacher/hot-topics`, {
                method: "POST",
                headers: { "X-User-Id": String(user.id) },
                body: formData,
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.detail || "Failed to extract hot topics");
            }

            const data = await res.json();
            // hot_topics is an object with topic names as keys and counts as values
            const topicNames = Object.keys(data.hot_topics);
            setHotTopics(topicNames);
            setImportance(data.hot_topics);
            toast.success("Hot topics extracted successfully!");
            await refreshUser();
        } catch (error: any) {
            toast.error(error.message || "Error extracting hot topics");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative overflow-hidden">
            <ThemeBackground />
            <Header showAuth={false} showStudentActions studentActionVariant="home" onLogout={handleLogout} />

            <main className="container mx-auto px-4 py-8 relative z-10">
                <Button
                    variant="ghost"
                    onClick={() => navigate("/teacher")}
                    className="mb-6"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                </Button>

                <div className="text-center mb-12 space-y-4">
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                        Hot Topics Extractor
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        Extract trending topics from syllabus and PYQ files
                    </p>
                </div>

                {user.role === "teacher" && (
                    <div className="max-w-md mx-auto mb-12">
                        <TrialCounter trialsUsed={user.trial_used || 0} maxTrials={3} />
                    </div>
                )}

                <div className="max-w-6xl mx-auto space-y-8">
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
                        onClick={handleExtractHotTopics}
                        disabled={loading || syllabusFile.length === 0 || pyqFiles.length === 0}
                    >
                        Extract Hot Topics
                    </Button>

                    {loading && <LoadingSpinner message="Extracting hot topics..." />}

                    {hotTopics.length > 0 && (
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
        </div>
    );
};

export default HotTopicsExtraction;
