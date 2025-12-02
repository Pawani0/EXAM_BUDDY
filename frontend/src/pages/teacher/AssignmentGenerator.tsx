import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { ThemeBackground } from "@/components/student/ThemeBackground";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ArrowLeft, Download } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/useAuth";
import { TrialCounter } from "@/components/student/TrialCounter";
import { FileUploadCard } from "@/components/student/FileUploadCard";
import { LoadingSpinner } from "@/components/student/LoadingSpinner";

interface UnitData {
    unit: string;
    topics: string[];
}

interface Assignment {
    title: string;
    questions: {
        id: number;
        question: string;
        marks: number;
        blooms_level: string;
    }[];
}

const AssignmentGenerator = () => {
    const navigate = useNavigate();
    const { user, clearUser, setUser } = useAuth();
    const apiBaseUrl = useMemo(() => import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000", []);

    const [loading, setLoading] = useState(false);
    const [extracting, setExtracting] = useState(false);
    const [syllabusFile, setSyllabusFile] = useState<File[]>([]);
    const [extractedUnits, setExtractedUnits] = useState<UnitData[]>([]);
    const [selectedUnit, setSelectedUnit] = useState("");
    const [asBlooms, setAsBlooms] = useState("Apply");
    const [asTypes, setAsTypes] = useState("MCQ");
    const [asQuantity, setAsQuantity] = useState("5");
    const [generatedAssignment, setGeneratedAssignment] = useState<Assignment | null>(null);

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
        console.log("refreshUser called for user ID:", user.id);
        try {
            const url = `${apiBaseUrl}/users/${user.id}`;
            console.log("Fetching user data from:", url);
            const res = await fetch(url, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            console.log("Response status:", res.status);
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

    const handleExtractUnits = async () => {
        if (syllabusFile.length === 0) {
            toast.error("Please upload a syllabus file");
            return;
        }

        setExtracting(true);
        try {
            const formData = new FormData();
            formData.append("syllabus", syllabusFile[0]);

            const response = await fetch(`${apiBaseUrl}/teacher/extract-units`, {
                method: "POST",
                headers: { "X-User-Id": String(user.id) },
                body: formData,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || "Failed to extract units");
            }

            const data = await response.json();
            setExtractedUnits(data.units);
            toast.success("Units and topics extracted successfully!");
        } catch (error: any) {
            toast.error(error.message || "Error extracting units");
        } finally {
            setExtracting(false);
        }
    };

    const downloadAssignment = () => {
        if (!generatedAssignment) return;

        let content = `${generatedAssignment.title || 'Assignment'}\n\n`;
        generatedAssignment.questions?.forEach((q: any, index: number) => {
            content += `${index + 1}. ${q.question}\n`;
            content += `   Marks: ${q.marks} | Bloom's Level: ${q.blooms_level}\n\n`;
        });

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedUnit}_assignment.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleGenerateAssignment = async () => {
        if (!selectedUnit) {
            toast.error("Please select a unit");
            return;
        }

        const selectedUnitData = extractedUnits.find(u => u.unit === selectedUnit);
        if (!selectedUnitData) {
            toast.error("Invalid unit selection");
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${apiBaseUrl}/teacher/assignment`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "X-User-Id": String(user.id) },
                body: JSON.stringify({
                    unit: selectedUnit,
                    topics: selectedUnitData.topics.join(", "),
                    blooms_level: asBlooms,
                    question_types: asTypes,
                    quantity: parseInt(asQuantity),
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || "Failed to generate assignment");
            }

            const data = await response.json();
            console.log("Assignment data:", data); // Debug log
            setGeneratedAssignment(data);
            toast.success("Assignment generated successfully!");
            console.log("About to call refreshUser...");
            await refreshUser();
            console.log("refreshUser completed");
        } catch (error: any) {
            toast.error(error.message || "Error generating assignment");
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
                        Assignment Generator
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        Generate unit-wise assignments with Bloom's Taxonomy controls
                    </p>
                </div>

                {user.role === "teacher" && (
                    <div className="max-w-md mx-auto mb-12">
                        <TrialCounter trialsUsed={user.trial_used || 0} maxTrials={3} />
                    </div>
                )}

                <div className="max-w-4xl mx-auto space-y-8">
                    {!extractedUnits.length && !generatedAssignment && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Step 1: Upload Syllabus</CardTitle>
                                <CardDescription>Upload your course syllabus to extract units and topics</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <FileUploadCard
                                    title="Upload Syllabus"
                                    description="Upload your course syllabus PDF"
                                    accept="application/pdf"
                                    multiple={false}
                                    files={syllabusFile}
                                    onFilesSelected={setSyllabusFile}
                                />

                                {extracting && <LoadingSpinner message="Extracting units and topics..." />}

                                <Button
                                    className="w-full h-12 text-lg"
                                    onClick={handleExtractUnits}
                                    disabled={extracting || syllabusFile.length === 0}
                                >
                                    {extracting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Extracting...
                                        </>
                                    ) : (
                                        "Extract Units & Topics"
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {extractedUnits.length > 0 && !generatedAssignment && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Step 2: Configure Assignment Generation</CardTitle>
                                <CardDescription>Select unit and set parameters</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="unit-select">Select Unit</Label>
                                        <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Choose a unit" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {extractedUnits.map((unitData, idx) => (
                                                    <SelectItem key={idx} value={unitData.unit}>
                                                        {unitData.unit}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
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
                                        <Select value={asTypes} onValueChange={setAsTypes}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="MCQ">Multiple Choice</SelectItem>
                                                <SelectItem value="Short Answer">Short Answer</SelectItem>
                                                <SelectItem value="Long Answer">Long Answer</SelectItem>
                                                <SelectItem value="Mixed">Mixed</SelectItem>
                                            </SelectContent>
                                        </Select>
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
                                </div>

                                {selectedUnit && (
                                    <div className="p-4 rounded-lg bg-muted">
                                        <h4 className="font-semibold mb-2">Topics in {selectedUnit}:</h4>
                                        <ul className="list-disc list-inside text-sm space-y-1">
                                            {extractedUnits.find(u => u.unit === selectedUnit)?.topics.map((topic, idx) => (
                                                <li key={idx}>{topic}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {loading && <LoadingSpinner message="Generating assignment..." />}

                                <Button
                                    className="w-full h-12 text-lg mt-4"
                                    onClick={handleGenerateAssignment}
                                    disabled={loading || !selectedUnit}
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
                    )}

                    {generatedAssignment && (
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>{generatedAssignment.title || "Generated Assignment"}</CardTitle>
                                        <CardDescription>Assignment for {selectedUnit}</CardDescription>
                                    </div>
                                    <Button onClick={downloadAssignment} variant="outline" size="sm">
                                        <Download className="mr-2 h-4 w-4" />
                                        Download
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[500px] pr-4">
                                    <div className="space-y-6">
                                        {generatedAssignment.questions?.map((question: any, index: number) => (
                                            <div key={question.id || index} className="p-4 rounded-lg border bg-card/50">
                                                <div className="flex items-start gap-4">
                                                    <span className="text-lg font-semibold text-muted-foreground">
                                                        {index + 1}.
                                                    </span>
                                                    <div className="flex-1 space-y-2">
                                                        <p className="text-base leading-relaxed">{question.question}</p>
                                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                            <span className="font-medium">Marks: {question.marks}</span>
                                                            <span className="font-medium">
                                                                Bloom's Level: {question.blooms_level}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </main>
        </div>
    );
};

export default AssignmentGenerator;
