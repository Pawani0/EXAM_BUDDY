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

const parseQuestions = (raw: string) =>
  raw
    .split(/\n+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

const Student = () => {
  const navigate = useNavigate();
  const { user, clearUser } = useAuth();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [syllabusUnits, setSyllabusUnits] = useState<SyllabusUnit[]>([]);
  const [manualSyllabus, setManualSyllabus] = useState("");
  const [questionsInput, setQuestionsInput] = useState("");
  const [threshold, setThreshold] = useState("0.65");
  const [clusters, setClusters] = useState<ClusterResult | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isClustering, setIsClustering] = useState(false);

  const apiBaseUrl = useMemo(() => import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000", []);

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
    }
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  const totalMatchedQuestions = useMemo(() => {
    if (!clusters) return 0;
    return Object.values(clusters).reduce((unitAcc, topics) => {
      const topicSum = Object.values(topics).reduce((topicAcc, questions) => topicAcc + questions.length, 0);
      return unitAcc + topicSum;
    }, 0);
  }, [clusters]);

  const handleLogout = () => {
    clearUser();
    toast.success("You have been logged out.");
    navigate("/login");
  };

  const handleSyllabusUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file.");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleExtractTopics = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedFile) {
      toast.error("Select a syllabus PDF to extract topics.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    setIsExtracting(true);

    try {
      const response = await fetch(`${apiBaseUrl}/extract_syllabus/`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        const message = error?.detail || error?.error || "Failed to extract topics.";
        throw new Error(message);
      }

      const data = await response.json();

      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("We couldn't identify any topics in that syllabus.");
      }

      setSyllabusUnits(data);
      setManualSyllabus(JSON.stringify(data, null, 2));
      toast.success("Important topics extracted successfully.");
    } catch (error) {
      console.error("Topic extraction failed", error);
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleClusterQuestions = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const questions = parseQuestions(questionsInput);
    if (!questions.length) {
      toast.error("Add at least one question to cluster.");
      return;
    }

    let syllabusPayload: SyllabusUnit[] = [];

    if (manualSyllabus.trim()) {
      try {
        const parsed = JSON.parse(manualSyllabus);
        if (!Array.isArray(parsed) || !parsed.length) {
          throw new Error();
        }
        syllabusPayload = parsed;
      } catch (error) {
        toast.error("Provide a valid syllabus JSON array before clustering.");
        return;
      }
    } else if (syllabusUnits.length) {
      syllabusPayload = syllabusUnits;
    } else {
      toast.error("Extract topics or paste syllabus JSON before clustering.");
      return;
    }

    const numericThreshold = Number(threshold);
    const validThreshold = Number.isFinite(numericThreshold) ? numericThreshold : 0.65;

    setIsClustering(true);

    try {
      const response = await fetch(`${apiBaseUrl}/pyq/cluster`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          syllabus: syllabusPayload,
          questions,
          threshold: validThreshold,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        const message = error?.detail || error?.error || "Failed to cluster questions.";
        throw new Error(message);
      }

      const data = await response.json();
      setClusters(data.clusters ?? {});
      toast.success("Questions clustered by topic.");
    } catch (error) {
      console.error("Clustering failed", error);
      toast.error(error instanceof Error ? error.message : "Unable to cluster questions right now.");
    } finally {
      setIsClustering(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/20">
      <Header showAuth={false} showStudentActions onLogout={handleLogout} />

      <main className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Student tools</CardTitle>
            <CardDescription>Upload a syllabus, tidy the extracted data, and cluster previous year questions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div>
              <p className="text-muted-foreground">Signed in as</p>
              <p className="text-base font-semibold text-foreground">{user.full_name}</p>
              <p className="truncate">{user.email}</p>
              <p className="mt-1 capitalize">Role: {user.role}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Syllabus topics</CardTitle>
            <CardDescription>Upload your syllabus PDF and keep the detected units in one editable place.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form className="space-y-3" onSubmit={handleExtractTopics}>
              <div className="space-y-2">
                <Label htmlFor="syllabus">Syllabus PDF</Label>
                <Input id="syllabus" type="file" accept="application/pdf" onChange={handleSyllabusUpload} />
                {selectedFile && (
                  <p className="text-xs text-muted-foreground">Selected: {selectedFile.name}</p>
                )}
              </div>
              <Button type="submit" disabled={isExtracting}>
                {isExtracting ? "Extracting..." : "Extract topics"}
              </Button>
            </form>

            <div className="space-y-2">
              <Label htmlFor="syllabus-json">Syllabus JSON (optional)</Label>
              <Textarea
                id="syllabus-json"
                placeholder="Paste or adjust the syllabus structure here."
                rows={8}
                value={manualSyllabus}
                onChange={(event) => setManualSyllabus(event.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    if (!navigator?.clipboard) {
                      toast.error("Clipboard access is not available in this browser.");
                      return;
                    }
                    try {
                      await navigator.clipboard.writeText(manualSyllabus || "");
                      toast.success("Syllabus JSON copied.");
                    } catch (error) {
                      console.error("Clipboard copy failed", error);
                      toast.error("Couldn't copy to clipboard.");
                    }
                  }}
                >
                  Copy JSON
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={!syllabusUnits.length}
                  onClick={() => setManualSyllabus(JSON.stringify(syllabusUnits, null, 2))}
                >
                  Reset to extracted
                </Button>
              </div>
            </div>

            {syllabusUnits.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">
                  Extracted units ({syllabusUnits.length})
                </p>
                <div className="max-h-72 space-y-3 overflow-y-auto rounded border p-3">
                  {syllabusUnits.map((unit, index) => (
                    <div key={`${unit.unit}-${index}`} className="space-y-2">
                      <div>
                        <p className="font-medium text-foreground">{unit.unit_name || unit.unit}</p>
                        {unit.unit_name && unit.unit_name !== unit.unit && (
                          <p className="text-xs text-muted-foreground">{unit.unit}</p>
                        )}
                      </div>
                      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                        {unit.topics.map((topic) => (
                          <li key={topic}>{topic}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Upload a syllabus to see units listed here.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cluster previous year questions</CardTitle>
            <CardDescription>
              Paste your questions, choose a similarity threshold, and we will map them to the syllabus topics.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form className="space-y-3" onSubmit={handleClusterQuestions}>
              <div className="space-y-2">
                <Label htmlFor="questions">Questions (one per line)</Label>
                <Textarea
                  id="questions"
                  placeholder={
                    "Describe the working principle of transmission lines...\nExplain the difference between TCP and UDP..."
                  }
                  rows={6}
                  value={questionsInput}
                  onChange={(event) => setQuestionsInput(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="threshold">Similarity threshold</Label>
                <Input
                  id="threshold"
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={threshold}
                  onChange={(event) => setThreshold(event.target.value)}
                />
              </div>

              <Button type="submit" disabled={isClustering}>
                {isClustering ? "Clustering..." : "Cluster questions"}
              </Button>
            </form>

            {clusters && Object.keys(clusters).length ? (
              <div className="space-y-4">
                <p className="text-sm font-medium text-foreground">
                  {totalMatchedQuestions} clustered question{totalMatchedQuestions === 1 ? "" : "s"}
                </p>
                <div className="max-h-80 space-y-4 overflow-y-auto rounded border p-3">
                  {Object.entries(clusters).map(([unitName, topics]) => (
                    <div key={unitName} className="space-y-3">
                      <p className="font-medium text-foreground">{unitName}</p>
                      {Object.entries(topics).map(([topicName, questions]) => (
                        <div key={topicName} className="space-y-2">
                          <p className="text-sm font-semibold text-foreground">{topicName}</p>
                          {questions.length ? (
                            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                              {questions.map((question, index) => (
                                <li key={`${topicName}-${index}`}>{question}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-muted-foreground">No questions matched this topic.</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Cluster results will appear here once you submit some questions.
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Student;