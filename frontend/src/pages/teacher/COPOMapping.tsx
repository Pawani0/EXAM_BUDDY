import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { ThemeBackground } from "@/components/student/ThemeBackground";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/useAuth";
import { TrialCounter } from "@/components/student/TrialCounter";

interface CoPoMapping {
    course_outcomes: string[];
    program_outcomes: string[];
    mapping: Record<string, string[]>;
}

const COPOMapping = () => {
    const navigate = useNavigate();
    const { user, clearUser, setUser } = useAuth();
    const apiBaseUrl = useMemo(() => import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000", []);

    const [loading, setLoading] = useState(false);
    const [courseDetails, setCourseDetails] = useState("");
    const [coPoMapping, setCoPoMapping] = useState<CoPoMapping | null>(null);

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
                setUser(userData);
            }
        } catch (e) {
            console.error("Failed to refresh user", e);
        }
    };

    const handleGenerateCoPo = async () => {
        if (!courseDetails.trim()) {
            toast.error("Please enter course details");
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${apiBaseUrl}/teacher/co-po-mapping`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "X-User-Id": String(user.id) },
                body: JSON.stringify({ course_details: courseDetails }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || "Failed to generate CO-PO mapping");
            }

            const data = await response.json();
            setCoPoMapping(data);
            toast.success("CO-PO mapping generated successfully!");
            await refreshUser();
        } catch (error: any) {
            toast.error(error.message || "Error generating CO-PO mapping");
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
                        CO-PO Mapping
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        Generate Course Outcomes and Program Outcomes mapping
                    </p>
                </div>

                {user.role === "teacher" && (
                    <div className="max-w-md mx-auto mb-12">
                        <TrialCounter trialsUsed={user.trial_used || 0} maxTrials={3} />
                    </div>
                )}

                <div className="max-w-5xl mx-auto space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Course Details</CardTitle>
                            <CardDescription>Enter course information to generate CO-PO mapping</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="course-details">Course Description</Label>
                                <Textarea
                                    id="course-details"
                                    placeholder="Enter course name, objectives, syllabus..."
                                    value={courseDetails}
                                    onChange={(e) => setCourseDetails(e.target.value)}
                                    rows={10}
                                    className="resize-none"
                                />
                            </div>

                            <Button
                                className="w-full h-12 text-lg"
                                onClick={handleGenerateCoPo}
                                disabled={loading || !courseDetails.trim()}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="mr-2 h-4 w-4" />
                                        Generate Mapping
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>

                    {coPoMapping && (
                        <Card>
                            <CardHeader>
                                <CardTitle>CO-PO Mapping Results</CardTitle>
                                <CardDescription>Course and Program Outcomes mapping</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[600px] pr-4">
                                    <div className="space-y-6">
                                        <div className="space-y-3">
                                            <h3 className="font-semibold text-lg text-primary">Course Outcomes</h3>
                                            <div className="space-y-2">
                                                {coPoMapping.course_outcomes.map((co, i) => (
                                                    <div key={i} className="p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                                                        <span className="font-medium text-blue-700 dark:text-blue-400">CO{i + 1}: </span>
                                                        <span className="text-sm">{co}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <h3 className="font-semibold text-lg text-purple-600 dark:text-purple-400">Program Outcomes</h3>
                                            <div className="space-y-2">
                                                {coPoMapping.program_outcomes.map((po, i) => (
                                                    <div key={i} className="p-3 rounded-lg bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
                                                        <span className="font-medium text-purple-700 dark:text-purple-400">PO{i + 1}: </span>
                                                        <span className="text-sm">{po}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <h3 className="font-semibold text-lg text-green-600 dark:text-green-400">CO-PO Mapping Matrix</h3>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm border-collapse">
                                                    <thead>
                                                        <tr className="bg-slate-100 dark:bg-slate-800">
                                                            <th className="border p-2 text-left font-semibold">CO</th>
                                                            {coPoMapping.program_outcomes.map((_, i) => (
                                                                <th key={i} className="border p-2 text-center font-semibold">
                                                                    PO{i + 1}
                                                                </th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {coPoMapping.course_outcomes.map((_, coIndex) => (
                                                            <tr key={coIndex}>
                                                                <td className="border p-2 font-medium bg-blue-50/50 dark:bg-blue-950/20">
                                                                    CO{coIndex + 1}
                                                                </td>
                                                                {coPoMapping.program_outcomes.map((_, poIndex) => {
                                                                    const coKey = `CO${coIndex + 1}`;
                                                                    const poKey = `PO${poIndex + 1}`;
                                                                    const hasMapping = coPoMapping.mapping[coKey]?.includes(poKey);
                                                                    return (
                                                                        <td
                                                                            key={poIndex}
                                                                            className={`border p-2 text-center ${
                                                                                hasMapping
                                                                                    ? "bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 font-bold"
                                                                                    : "bg-slate-50 dark:bg-slate-900"
                                                                            }`}
                                                                        >
                                                                            {hasMapping ? "✓" : "—"}
                                                                        </td>
                                                                    );
                                                                })}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
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

export default COPOMapping;
