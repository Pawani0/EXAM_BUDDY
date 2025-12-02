import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/lib/useAuth";
import { FileText, Upload, Loader2, Download, Sparkles, Flame, BookOpen } from "lucide-react";

import { ThemeBackground } from "@/components/student/ThemeBackground";
import { TrialCounter } from "@/components/student/TrialCounter";
import { HotTopicsViewer } from "@/components/student/HotTopicsViewer";
import { PracticePaperGenerator } from "@/components/student/PracticePaperGenerator";
import { UnitSelector } from "@/components/student/UnitSelector";

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

const Student = () => {
  const navigate = useNavigate();
  const { user, clearUser, setUser } = useAuth();
  const apiBaseUrl = useMemo(() => import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000", []);

  // State
  const [activeFeature, setActiveFeature] = useState<"clustering" | "hot_topics" | "practice" | null>(null);

  const [syllabusFile, setSyllabusFile] = useState<File | null>(null);
  const [pyqFiles, setPyqFiles] = useState<File[]>([]);

  const [extractedQuestions, setExtractedQuestions] = useState<string[]>([]);
  const [syllabusUnits, setSyllabusUnits] = useState<SyllabusUnit[]>([]);

  const [clusters, setClusters] = useState<ClusterResult | null>(null);
  const [importance, setImportance] = useState<{ [key: string]: number }>({});
  const [hotTopics, setHotTopics] = useState<string[]>([]);

  // Loading States
  const [isExtractingSyllabus, setIsExtractingSyllabus] = useState(false);
  const [isExtractingQuestions, setIsExtractingQuestions] = useState(false);
  const [isClustering, setIsClustering] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isFetchingHotTopics, setIsFetchingHotTopics] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
    }
  }, [user, navigate]);

  // Refresh user data on mount to sync trial counter
  useEffect(() => {
    if (user) {
      refreshUser();
    }
  }, []);

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
        setUser(userData);
      }
    } catch (e) {
      console.error("Failed to refresh user", e);
    }
  };

  const handleSyllabusUpload = async (file: File) => {
    setSyllabusFile(file);
    setIsExtractingSyllabus(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${apiBaseUrl}/extract_syllabus/`, { method: "POST", body: formData });
      if (!res.ok) throw new Error("Failed to extract syllabus");
      const data = await res.json();
      setSyllabusUnits(data);
      toast.success("Syllabus extracted!");
    } catch (e) {
      toast.error("Syllabus extraction failed");
    } finally {
      setIsExtractingSyllabus(false);
    }
  };

  const handlePyqUpload = async (files: File[]) => {
    setPyqFiles(prev => [...prev, ...files]);
  };

  const extractQuestions = async () => {
    if (pyqFiles.length === 0) return toast.error("Upload PYQs first");
    setIsExtractingQuestions(true);
    let allQs: string[] = [];

    try {
      for (const file of pyqFiles) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch(`${apiBaseUrl}/extract_questions/`, { method: "POST", body: fd });
        if (res.ok) {
          const data = await res.json();
          if (data.questions) allQs = [...allQs, ...data.questions];
        }
      }
      setExtractedQuestions(allQs);
      toast.success(`Extracted ${allQs.length} questions`);
    } catch (e) {
      toast.error("Question extraction failed");
    } finally {
      setIsExtractingQuestions(false);
    }
  };

  const clusterQuestions = async () => {
    if (!extractedQuestions.length || !syllabusUnits.length) {
      toast.error("Please upload syllabus and PYQs first");
      return;
    }

    setIsClustering(true);
    setActiveFeature("clustering");
    try {
      const res = await fetch(`${apiBaseUrl}/pyq/cluster`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Id": String(user.id) },
        body: JSON.stringify({
          syllabus: syllabusUnits,
          questions: extractedQuestions,
          threshold: 0.65,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setClusters(data.clusters);
        setImportance(data.importance);
        toast.success("Questions clustered successfully!");
        await refreshUser();
      } else {
        const error = await res.json();
        throw new Error(error.detail || "Clustering failed");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to cluster questions");
    } finally {
      setIsClustering(false);
    }
  };

  const fetchHotTopics = async () => {
    if (!extractedQuestions.length || !syllabusUnits.length) {
      toast.error("Please upload syllabus and PYQs first");
      return;
    }

    setIsFetchingHotTopics(true);
    setActiveFeature("hot_topics");
    try {
      const res = await fetch(`${apiBaseUrl}/student/hot-topics`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Id": String(user.id) },
        body: JSON.stringify({ syllabus: syllabusUnits, questions: extractedQuestions }),
      });
      if (res.ok) {
        const data = await res.json();
        setHotTopics(data.hot_topics);
        setImportance(data.importance);
        await refreshUser();
      } else {
        const error = await res.json();
        throw new Error(error.detail || "Failed to fetch hot topics");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to fetch hot topics");
    } finally {
      setIsFetchingHotTopics(false);
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

  const generatePracticePaper = async (config: any) => {
    const res = await fetch(`${apiBaseUrl}/student/practice-paper`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Id": String(user.id) },
      body: JSON.stringify({
        syllabus: syllabusUnits,
        ...config
      }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || "Failed to generate paper");
    }
    await refreshUser();
    return await res.json();
  };

  return (
    <div className="min-h-screen p-6 relative overflow-hidden">
      <ThemeBackground />
      <Header showAuth={false} showStudentActions onLogout={handleLogout} />

      <main className="container mx-auto px-4 py-8 relative z-10">
        <div className="grid md:grid-cols-12 gap-8">

          {/* LEFT CONTROL PANEL - STICKY - WIDER */}
          <div className="md:col-span-5 lg:col-span-4 space-y-6">
            <div className="sticky top-24 space-y-6">
              <Card className="bg-background/80 backdrop-blur-md border-primary/20 shadow-lg">
                <CardHeader>
                  <CardTitle>Control Panel</CardTitle>
                  <CardDescription>Upload materials and select tools</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Uploads */}
                  <div className="space-y-4">
                    <div className="border-2 border-dashed rounded-lg p-4 text-center hover:bg-muted/50 transition-colors">
                      <input
                        type="file"
                        id="syllabus-upload"
                        className="hidden"
                        accept="application/pdf"
                        onChange={(e) => e.target.files?.[0] && handleSyllabusUpload(e.target.files[0])}
                      />
                      <label htmlFor="syllabus-upload" className="cursor-pointer flex flex-col items-center gap-2">
                        <FileText className={`h-6 w-6 ${syllabusUnits.length > 0 ? "text-green-500" : "text-muted-foreground"}`} />
                        <span className="text-sm font-medium">
                          {syllabusFile ? syllabusFile.name : "Upload Syllabus"}
                        </span>
                      </label>
                    </div>

                    <div className="border-2 border-dashed rounded-lg p-4 text-center hover:bg-muted/50 transition-colors">
                      <input
                        type="file"
                        id="pyq-upload"
                        className="hidden"
                        accept="application/pdf"
                        multiple
                        onChange={(e) => e.target.files && handlePyqUpload(Array.from(e.target.files))}
                      />
                      <label htmlFor="pyq-upload" className="cursor-pointer flex flex-col items-center gap-2">
                        <Upload className="h-6 w-6 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          Upload PYQs ({pyqFiles.length})
                        </span>
                      </label>
                    </div>

                    <Button
                      className="w-full"
                      onClick={extractQuestions}
                      disabled={pyqFiles.length === 0 || isExtractingQuestions}
                      variant="secondary"
                      size="sm"
                    >
                      {isExtractingQuestions ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Analyze Uploads
                    </Button>
                  </div>

                  <div className="border-t pt-4 space-y-3">
                    <Button
                      className="w-full justify-start"
                      onClick={clusterQuestions}
                      disabled={isClustering || !syllabusUnits.length || !extractedQuestions.length}
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      Cluster Questions
                    </Button>

                    <Button
                      className="w-full justify-start"
                      onClick={fetchHotTopics}
                      disabled={isFetchingHotTopics || !syllabusUnits.length || !extractedQuestions.length}
                    >
                      <Flame className="mr-2 h-4 w-4" />
                      Find Hot Topics
                    </Button>

                    <Button
                      className="w-full justify-start"
                      onClick={() => setActiveFeature("practice")}
                      disabled={!syllabusUnits.length}
                    >
                      <BookOpen className="mr-2 h-4 w-4" />
                      Practice Paper
                    </Button>
                  </div>

                  {user.role === "student" && (
                    <div className="pt-4">
                      <TrialCounter trialsUsed={user.trial_used || 0} maxTrials={3} />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* RIGHT RESULTS PANEL - ADJUSTED WIDTH */}
          <div className="md:col-span-7 lg:col-span-8 space-y-6">
            {!activeFeature && (
              <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4 animate-fade-in">
                <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                  Exam Buddy
                </h1>
                <p className="text-xl text-muted-foreground max-w-lg">
                  Upload your syllabus and PYQs on the left to get started. Select a tool to see results here.
                </p>
              </div>
            )}

            {activeFeature === "clustering" && clusters && (
              <Card className="bg-background/60 backdrop-blur-md animate-slide-up">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Clustered Questions</CardTitle>
                      <CardDescription>Questions organized by topics</CardDescription>
                    </div>
                    <Button onClick={() => downloadPDF(clusters, "All_Clusters.pdf")} disabled={isGeneratingPDF} size="sm">
                      {isGeneratingPDF ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                      Download All PDF
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-8 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
                    {Object.entries(clusters).map(([unit, topics]) => {
                      const hasQuestions = Object.values(topics).some(q => q.length > 0);
                      if (!hasQuestions) return null;

                      return (
                        <div key={unit} className="border rounded-lg p-4 bg-card/50">
                          <div className="flex justify-between items-center mb-4 border-b pb-2">
                            <h3 className="font-bold text-lg text-primary">{unit}</h3>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadPDF({ [unit]: topics }, `${unit}_Clusters.pdf`)}
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
                                    <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{questions.length}</span>
                                  </h4>
                                  <ul className="list-disc pl-5 space-y-1">
                                    {questions.map((q, i) => (
                                      <li key={i} className="text-sm text-muted-foreground leading-relaxed">{q}</li>
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
                </CardContent>
              </Card>
            )}

            {activeFeature === "hot_topics" && hotTopics.length > 0 && (
              <div className="animate-slide-up">
                <HotTopicsViewer hotTopics={hotTopics} importance={importance} />
              </div>
            )}

            {activeFeature === "practice" && (
              <div className="animate-slide-up">
                <PracticePaperGenerator
                  syllabusUnits={syllabusUnits}
                  hotTopics={hotTopics}
                  onGenerate={generatePracticePaper}
                  onDownload={async (paper) => {
                    const formattedData = {
                      "Practice Paper": {
                        "Questions": paper.questions.map((q: any) =>
                          `${q.question} (${q.marks} Marks) - [${q.topic}]`
                        )
                      }
                    };
                    await downloadPDF(formattedData, "Practice_Paper.pdf");
                  }}
                />
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
};

export default Student;