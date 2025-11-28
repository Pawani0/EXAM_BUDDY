import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/lib/useAuth";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Upload, CheckCircle, ArrowRight, ArrowLeft, Download, Loader2, Trash2 } from "lucide-react";

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
  const { user, clearUser } = useAuth();

  const [step, setStep] = useState(1);
  const [syllabusFile, setSyllabusFile] = useState<File | null>(null);
  const [pyqFiles, setPyqFiles] = useState<File[]>([]);
  const [extractedQuestions, setExtractedQuestions] = useState<string[]>([]);

  const [syllabusUnits, setSyllabusUnits] = useState<SyllabusUnit[]>([]);
  const [manualSyllabus, setManualSyllabus] = useState("");
  const [threshold, setThreshold] = useState("0.65");
  const [clusters, setClusters] = useState<ClusterResult | null>(null);
  const [importance, setImportance] = useState<{ [key: string]: number } | null>(null);

  const [isExtractingSyllabus, setIsExtractingSyllabus] = useState(false);
  const [isExtractingQuestions, setIsExtractingQuestions] = useState(false);
  const [isClustering, setIsClustering] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const apiBaseUrl = useMemo(() => import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000", []);

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
    }
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  const handleLogout = () => {
    clearUser();
    toast.success("You have been logged out.");
    navigate("/login");
  };

  const handleSyllabusUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file.");
      return;
    }
    setSyllabusFile(file);
  };

  const handlePyqUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(f => f.type === "application/pdf");

    if (validFiles.length !== files.length) {
      toast.warning("Some files were skipped because they are not PDFs.");
    }

    setPyqFiles(prev => [...prev, ...validFiles]);
  };

  const removePyqFile = (index: number) => {
    setPyqFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleExtractSyllabus = async () => {
    if (!syllabusFile) {
      toast.error("Select a syllabus PDF first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", syllabusFile);

    setIsExtractingSyllabus(true);

    try {
      const response = await fetch(`${apiBaseUrl}/extract_syllabus/`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to extract syllabus.");

      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("No topics found in syllabus.");
      }

      setSyllabusUnits(data);
      setManualSyllabus(JSON.stringify(data, null, 2));
      toast.success("Syllabus extracted successfully!");
      setStep(2); // Move to next step
    } catch (error) {
      toast.error("Syllabus extraction failed.");
    } finally {
      setIsExtractingSyllabus(false);
    }
  };

  const handleExtractQuestions = async () => {
    if (pyqFiles.length === 0) {
      toast.error("Upload at least one PYQ PDF.");
      return;
    }

    setIsExtractingQuestions(true);
    let allQuestions: string[] = [];

    try {
      for (const file of pyqFiles) {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(`${apiBaseUrl}/extract_questions/`, {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          if (data.questions && Array.isArray(data.questions)) {
            allQuestions = [...allQuestions, ...data.questions];
          }
        }
      }

      if (allQuestions.length === 0) {
        throw new Error("No questions could be extracted.");
      }

      setExtractedQuestions(allQuestions);
      toast.success(`Extracted ${allQuestions.length} questions from ${pyqFiles.length} files.`);
      setStep(3); // Move to next step
    } catch (error) {
      toast.error("Question extraction failed.");
    } finally {
      setIsExtractingQuestions(false);
    }
  };

  const handleClusterQuestions = async () => {
    if (!extractedQuestions.length) {
      toast.error("No questions to cluster.");
      return;
    }

    let syllabusPayload: SyllabusUnit[] = [];
    try {
      syllabusPayload = manualSyllabus ? JSON.parse(manualSyllabus) : syllabusUnits;
    } catch (e) {
      toast.error("Invalid syllabus JSON.");
      return;
    }

    setIsClustering(true);

    try {
      const response = await fetch(`${apiBaseUrl}/pyq/cluster`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          syllabus: syllabusPayload,
          questions: extractedQuestions,
          threshold: Number(threshold) || 0.65,
        }),
      });

      if (!response.ok) throw new Error("Clustering failed.");

      const data = await response.json();
      setClusters(data.clusters);
      setImportance(data.importance);
      toast.success("Questions clustered successfully!");
    } catch (error) {
      toast.error("Failed to cluster questions.");
    } finally {
      setIsClustering(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!clusters) return;

    setIsGeneratingPDF(true);
    try {
      const response = await fetch(`${apiBaseUrl}/pyq/generate-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clusters }),
      });

      if (!response.ok) throw new Error("PDF generation failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Exam_Buddy_Analysis.pdf";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("PDF downloaded!");
    } catch (error) {
      toast.error("Failed to download PDF.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header showAuth={false} showStudentActions onLogout={handleLogout} />

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-2">Exam Preparation Assistant</h1>
          <p className="text-muted-foreground">Follow the steps to analyze your syllabus and previous year questions.</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-12">
          <div className="flex justify-between mb-2">
            {["Syllabus", "Upload PYQs", "Analysis"].map((label, index) => (
              <div key={label} className={`text-sm font-medium ${step > index + 1 ? "text-primary" : step === index + 1 ? "text-foreground" : "text-muted-foreground"}`}>
                Step {index + 1}: {label}
              </div>
            ))}
          </div>
          <Progress value={(step / 3) * 100} className="h-2" />
        </div>

        {/* Step 1: Syllabus */}
        {step === 1 && (
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle>Step 1: Upload Syllabus</CardTitle>
              <CardDescription>Upload your course syllabus PDF to identify units and topics.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border-2 border-dashed rounded-xl p-10 text-center hover:bg-muted/50 transition-colors">
                <input
                  type="file"
                  id="syllabus-upload"
                  className="hidden"
                  accept="application/pdf"
                  onChange={handleSyllabusUpload}
                />
                <label htmlFor="syllabus-upload" className="cursor-pointer flex flex-col items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileText className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <p className="text-lg font-medium">
                      {syllabusFile ? syllabusFile.name : "Click to upload Syllabus PDF"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {syllabusFile ? "Click to change file" : "Supported format: PDF"}
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleExtractSyllabus} disabled={!syllabusFile || isExtractingSyllabus} size="lg">
                  {isExtractingSyllabus ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Extracting...
                    </>
                  ) : (
                    <>
                      Next Step <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: PYQs */}
        {step === 2 && (
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle>Step 2: Upload Question Papers</CardTitle>
              <CardDescription>Upload multiple Previous Year Question (PYQ) PDFs.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border-2 border-dashed rounded-xl p-8 text-center hover:bg-muted/50 transition-colors">
                <input
                  type="file"
                  id="pyq-upload"
                  className="hidden"
                  accept="application/pdf"
                  multiple
                  onChange={handlePyqUpload}
                />
                <label htmlFor="pyq-upload" className="cursor-pointer flex flex-col items-center gap-3">
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <p className="font-medium">Click to upload PYQ PDFs</p>
                  <p className="text-xs text-muted-foreground">You can select multiple files</p>
                </label>
              </div>

              {pyqFiles.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium">Selected Files ({pyqFiles.length})</p>
                  <div className="grid gap-3">
                    {pyqFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-blue-500" />
                          <span className="text-sm truncate max-w-[300px]">{file.name}</span>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removePyqFile(index)} className="h-8 w-8 text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button onClick={handleExtractQuestions} disabled={pyqFiles.length === 0 || isExtractingQuestions} size="lg">
                  {isExtractingQuestions ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
                    </>
                  ) : (
                    <>
                      Extract & Analyze <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Analysis */}
        {step === 3 && (
          <div className="space-y-8 animate-fade-in">
            {/* Controls */}
            <Card>
              <CardHeader>
                <CardTitle>Analysis Controls</CardTitle>
                <CardDescription>Adjust clustering sensitivity and view results.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-6 items-end">
                  <div className="flex-1 space-y-2 w-full">
                    <Label>Similarity Threshold ({Number(threshold) * 100}%)</Label>
                    <Input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={threshold}
                      onChange={(e) => setThreshold(e.target.value)}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">Higher value = stricter matching</p>
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={handleClusterQuestions} disabled={isClustering}>
                      {isClustering ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {clusters ? "Re-Cluster" : "Start Clustering"}
                    </Button>
                    {clusters && (
                      <Button variant="default" className="bg-green-600 hover:bg-green-700" onClick={handleDownloadPDF} disabled={isGeneratingPDF}>
                        {isGeneratingPDF ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        Download PDF
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Results */}
            {clusters && (
              <div className="grid md:grid-cols-3 gap-8">
                {/* Important Topics */}
                <Card className="md:col-span-1 h-fit">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      Important Topics
                    </CardTitle>
                    <CardDescription>Topics with most questions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px] pr-4">
                      <div className="space-y-4">
                        {importance && Object.entries(importance)
                          .sort(([, a], [, b]) => b - a)
                          .map(([topic, count], i) => (
                            <div key={topic} className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                                  {i + 1}
                                </span>
                                <span className="text-sm font-medium">{topic}</span>
                              </div>
                              <Badge variant="secondary">{count}</Badge>
                            </div>
                          ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Clustered Questions */}
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>Clustered Questions</CardTitle>
                    <CardDescription>Questions grouped by syllabus units</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[600px] pr-4">
                      <div className="space-y-8">
                        {Object.entries(clusters).map(([unit, topics]) => (
                          <div key={unit} className="space-y-4">
                            <h3 className="font-bold text-lg text-primary sticky top-0 bg-card py-2 border-b">
                              {unit}
                            </h3>
                            <div className="pl-4 space-y-6">
                              {Object.entries(topics).map(([topic, questions]) => (
                                questions.length > 0 && (
                                  <div key={topic} className="space-y-2">
                                    <h4 className="font-semibold text-sm text-foreground/80">{topic}</h4>
                                    <ul className="list-disc pl-5 space-y-1">
                                      {questions.map((q, i) => (
                                        <li key={i} className="text-sm text-muted-foreground leading-relaxed">
                                          {q}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Student;