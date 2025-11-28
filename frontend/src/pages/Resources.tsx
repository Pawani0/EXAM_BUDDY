import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { cache } from "@/lib/cache";
import { Skeleton } from "@/components/ui/skeleton";

type PyqResource = {
  id: number;
  title: string;
  year: string;
  embedUrl: string;
  downloadUrl: string;
};

export default function Resources() {
  const { classId, subject } = useParams();
  const navigate = useNavigate();
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

  const [pyqs, setPyqs] = useState<PyqResource[]>([]);
  const [syllabusUrl, setSyllabusUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [subjectName, setSubjectName] = useState<string>("");

  useEffect(() => {
    if (classId && subject) {
      loadResources(classId, subject);
    }
  }, [classId, subject]);

  const loadResources = async (clsId: string, subjectSlug: string) => {
    setLoading(true);
    try {
      const cacheKey = `resources_${clsId}_${subjectSlug}`;
      interface CachedResourceData {
        subjectName: string;
        pyqs: PyqResource[];
        syllabusUrl: string;
      }
      const cachedData = cache.get<CachedResourceData>(cacheKey);

      if (cachedData) {
        setSubjectName(cachedData.subjectName);
        setPyqs(cachedData.pyqs);
        setSyllabusUrl(cachedData.syllabusUrl);
        setLoading(false);
        return;
      }

      // First, find the subject by slug
      const subjectRes = await fetch(`${apiBaseUrl}/api/classes/${clsId}/subjects/${subjectSlug}`);
      if (!subjectRes.ok) {
        toast.error("Subject not found");
        setLoading(false);
        return;
      }

      const subjectData = await subjectRes.json();
      const newSubjectName = subjectData.name;
      setSubjectName(newSubjectName);

      // Fetch PYQs
      let newPyqs: PyqResource[] = [];
      const pyqRes = await fetch(`${apiBaseUrl}/api/subjects/${subjectData.id}/materials?material_type=pyq`);
      if (pyqRes.ok) {
        const pyqData = await pyqRes.json();
        newPyqs = pyqData.pyqs || [];
        setPyqs(newPyqs);
      }

      // Fetch Syllabus
      let newSyllabusUrl = "";
      const syllabusRes = await fetch(`${apiBaseUrl}/api/subjects/${subjectData.id}/materials?material_type=syllabus`);
      if (syllabusRes.ok) {
        const syllabusData = await syllabusRes.json();
        newSyllabusUrl = syllabusData.syllabusUrl || "";
        setSyllabusUrl(newSyllabusUrl);
      }

      cache.set(cacheKey, {
        subjectName: newSubjectName,
        pyqs: newPyqs,
        syllabusUrl: newSyllabusUrl
      });

    } catch (error) {
      toast.error("Failed to load resources");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/class/${classId}`)}
            className="hover:bg-primary/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-4xl font-bold gradient-text">
              {subjectName || subject?.replace(/-/g, " ").toUpperCase() || "Subject"} Resources
            </h1>
            <p className="text-muted-foreground mt-2">
              Previous Year Question Papers
            </p>
          </div>
        </div>

        {/* PYQ List */}
        <div className="grid gap-6">
          {/* Syllabus Download Button */}
          <div className="flex justify-end">
            {loading ? (
              <Skeleton className="h-10 w-40" />
            ) : syllabusUrl ? (
              <Button asChild className="mb-4">
                <a href={syllabusUrl} target="_blank" rel="noopener noreferrer" download>
                  <Download className="h-4 w-4 mr-2" />
                  Download Syllabus
                </a>
              </Button>
            ) : (
              <Button disabled className="mb-4 opacity-80" title="Syllabus not available">
                <Download className="h-4 w-4 mr-2" />
                Syllabus not available
              </Button>
            )}
          </div>
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="glass-card p-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <Skeleton className="h-12 w-12 rounded-xl" />
                      <div className="space-y-2">
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-10 w-32" />
                  </div>
                  <Skeleton className="w-full h-[400px] rounded-lg" />
                </div>
              </Card>
            ))
          ) : pyqs.length > 0 ? (
            pyqs.map((pyq, index) => (
              <Card
                key={pyq.id}
                className="glass-card p-6 hover-lift animate-scale-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="space-y-4">
                  {/* PYQ Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
                        <FileText className="h-6 w-6 text-primary-foreground" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-foreground">
                          {pyq.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Year: {pyq.year}
                        </p>
                      </div>
                    </div>

                    {pyq.downloadUrl && (
                      <Button
                        asChild
                        className="shine-effect bg-gradient-to-r from-primary via-accent to-secondary hover:opacity-90"
                      >
                        <a
                          href={pyq.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </a>
                      </Button>
                    )}
                  </div>

                  {/* PDF Embed */}
                  {pyq.embedUrl ? (
                    <div className="w-full h-[600px] rounded-lg overflow-hidden border-2 border-border">
                      <iframe
                        src={pyq.embedUrl}
                        className="w-full h-full"
                        title={pyq.title}
                        allow="autoplay"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-[400px] rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/30">
                      <div className="text-center space-y-3">
                        <FileText className="h-16 w-16 text-muted-foreground mx-auto" />
                        <p className="text-muted-foreground">
                          PDF embed link not added yet
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Add your Google Drive embed URL to display the PDF here
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ))
          ) : (
            <Card className="glass-card p-12 text-center">
              <FileText className="h-20 w-20 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-2xl font-semibold text-foreground mb-2">
                No Resources Available
              </h3>
              <p className="text-muted-foreground">
                PYQ papers will be added soon
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
