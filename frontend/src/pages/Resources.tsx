import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type PyqResource = {
  id: number;
  title: string;
  year: string;
  embedUrl: string;
  downloadUrl: string;
};

// Map allows class/subject specific overrides while keeping a global default.
const pyqLibrary: Record<string, PyqResource[]> = {
  "class-1-evs": [
    {
      id: 1,
      title: "Class 1 EVS PYQ 2023",
      year: "2023",
      embedUrl: "https://drive.google.com/file/d/1Bv8dZ-HmExamplePreviewId/preview",
      downloadUrl: "https://drive.google.com/file/d/1Bv8dZ-HmExampleDownloadId/view?usp=sharing",
    },
    {
      id: 2,
      title: "Class 1 EVS PYQ 2022",
      year: "2022",
      embedUrl: "",
      downloadUrl: "",
    },
  ],
  "class-7-mathematics": [
    {
      id: 1,
      title: "Class 7 Mathematics PYQ 2023",
      year: "2023",
      embedUrl: "https://drive.google.com/file/d/1Bv8dZ-HmExamplePreviewId/preview",
      downloadUrl: "https://drive.google.com/file/d/1Bv8dZ-HmExampleDownloadId/view?usp=sharing",
    },
    {
      id: 2,
      title: "Class 7 Mathematics PYQ 2022",
      year: "2022",
      embedUrl: "",
      downloadUrl: "",
    },
  ],
};

const sampleSyllabi: Record<string, string> = {
  "class-7-mathematics": "https://drive.google.com/uc?export=download&id=YOUR_FILE_ID",
};

export default function Resources() {
  const { classId, subject } = useParams();
  const navigate = useNavigate();
  const subjectSlug = subject?.toLowerCase().replace(/\s+/g, "-") || "";
  const syllabusKey = `${classId}-${subjectSlug}`;
  const syllabusUrl = sampleSyllabi[syllabusKey] || "";
  const selectedPyqs =
    (classId && pyqLibrary[`${classId}-${subjectSlug}`]) ||
    (classId && pyqLibrary[classId]) ||
    pyqLibrary.default ||
    [];

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
              {subject?.replace(/-/g, " ").toUpperCase()} Resources
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
            {syllabusUrl ? (
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
          {selectedPyqs.map((pyq, index) => (
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
          ))}
        </div>

        {/* Empty State */}
        {selectedPyqs.length === 0 && (
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
  );
}
