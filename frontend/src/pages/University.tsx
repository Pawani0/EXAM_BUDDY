import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { ThemeBackground } from "@/components/student/ThemeBackground";
import { Button } from "@/components/ui/button";
import { ArrowLeft, GraduationCap, BookOpen, Building2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/useAuth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface University {
  id: number;
  name: string;
  display_order: number;
}

interface Degree {
  id: number;
  university_id: number;
  name: string;
  display_order: number;
}

interface Branch {
  id: number;
  degree_id: number;
  name: string;
  display_order: number;
}

interface Year {
  id: number;
  branch_id: number;
  name: string;
  display_order: number;
}

interface UniversitySubject {
  id: number;
  year_id: number;
  name: string;
  icon_name?: string;
  display_order: number;
}

interface UniversityMaterial {
  id: number;
  uni_subject_id: number;
  material_type: string;
  title: string;
  year?: string;
  embed_url?: string;
  download_url?: string;
  display_order: number;
}

const University = () => {
  const navigate = useNavigate();
  const { user, clearUser } = useAuth();
  const apiBaseUrl = useMemo(() => import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000", []);
  const isLoggedIn = Boolean(user);

  const [universities, setUniversities] = useState<University[]>([]);
  const [degrees, setDegrees] = useState<Degree[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [years, setYears] = useState<Year[]>([]);
  const [subjects, setSubjects] = useState<UniversitySubject[]>([]);
  const [materials, setMaterials] = useState<UniversityMaterial[]>([]);

  const [selectedUniversity, setSelectedUniversity] = useState<University | null>(null);
  const [selectedDegree, setSelectedDegree] = useState<Degree | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [selectedYear, setSelectedYear] = useState<Year | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<UniversitySubject | null>(null);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUniversities();
  }, []);

  const fetchUniversities = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/universities`);
      if (res.ok) {
        const data = await res.json();
        setUniversities(data);
      }
    } catch (error) {
      toast.error("Failed to load universities");
    }
  };

  const fetchDegrees = async (universityId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/universities/${universityId}/degrees`);
      if (res.ok) {
        const data = await res.json();
        setDegrees(data);
      }
    } catch (error) {
      toast.error("Failed to load degrees");
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async (degreeId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/degrees/${degreeId}/branches`);
      if (res.ok) {
        const data = await res.json();
        setBranches(data);
      }
    } catch (error) {
      toast.error("Failed to load branches");
    } finally {
      setLoading(false);
    }
  };

  const fetchYears = async (branchId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/branches/${branchId}/years`);
      if (res.ok) {
        const data = await res.json();
        setYears(data);
      }
    } catch (error) {
      toast.error("Failed to load years");
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async (yearId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/years/${yearId}/university-subjects`);
      if (res.ok) {
        const data = await res.json();
        setSubjects(data);
      }
    } catch (error) {
      toast.error("Failed to load subjects");
    } finally {
      setLoading(false);
    }
  };

  const fetchMaterials = async (subjectId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/university-subjects/${subjectId}/materials`);
      if (res.ok) {
        const data = await res.json();
        setMaterials(data);
      }
    } catch (error) {
      toast.error("Failed to load materials");
    } finally {
      setLoading(false);
    }
  };

  const handleUniversityClick = (university: University) => {
    setSelectedUniversity(university);
    setSelectedDegree(null);
    setSelectedBranch(null);
    setSelectedYear(null);
    setSelectedSubject(null);
    setDegrees([]);
    setBranches([]);
    setYears([]);
    setSubjects([]);
    setMaterials([]);
    fetchDegrees(university.id);
  };

  const handleDegreeClick = (degree: Degree) => {
    setSelectedDegree(degree);
    setSelectedBranch(null);
    setSelectedYear(null);
    setSelectedSubject(null);
    setBranches([]);
    setYears([]);
    setSubjects([]);
    setMaterials([]);
    fetchBranches(degree.id);
  };

  const handleBranchClick = (branch: Branch) => {
    setSelectedBranch(branch);
    setSelectedYear(null);
    setSelectedSubject(null);
    setYears([]);
    setSubjects([]);
    setMaterials([]);
    fetchYears(branch.id);
  };

  const handleYearClick = (year: Year) => {
    setSelectedYear(year);
    setSelectedSubject(null);
    setSubjects([]);
    setMaterials([]);
    fetchSubjects(year.id);
  };

  const handleSubjectClick = (subject: UniversitySubject) => {
    setSelectedSubject(subject);
    setMaterials([]);
    fetchMaterials(subject.id);
  };

  const handleBack = () => {
    if (selectedSubject) {
      setSelectedSubject(null);
      setMaterials([]);
    } else if (selectedYear) {
      setSelectedYear(null);
      setSubjects([]);
    } else if (selectedBranch) {
      setSelectedBranch(null);
      setYears([]);
    } else if (selectedDegree) {
      setSelectedDegree(null);
      setBranches([]);
    } else if (selectedUniversity) {
      setSelectedUniversity(null);
      setDegrees([]);
    } else {
      navigate("/");
    }
  };

  const handleLogout = () => {
    clearUser();
    toast.success("You have been logged out.");
    navigate("/login");
  };

  const handleMaterialClick = (material: UniversityMaterial) => {
    if (material.embed_url) {
      window.open(material.embed_url, "_blank");
    } else if (material.download_url) {
      window.open(material.download_url, "_blank");
    } else {
      toast.info("No URL available for this material");
    }
  };

  const getBreadcrumb = () => {
    const parts = [];
    if (selectedUniversity) parts.push(selectedUniversity.name);
    if (selectedDegree) parts.push(selectedDegree.name);
    if (selectedBranch) parts.push(selectedBranch.name);
    if (selectedYear) parts.push(selectedYear.name);
    if (selectedSubject) parts.push(selectedSubject.name);
    return parts.join(" > ");
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <ThemeBackground />
      <Header
        showAuth={!isLoggedIn}
        showStudentActions={isLoggedIn}
        studentActionVariant="dashboard"
        onLogout={handleLogout}
      />

      <main className="container mx-auto px-4 py-8 relative z-10">
        <Button
          variant="ghost"
          onClick={handleBack}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        {/* Breadcrumb */}
        {(selectedUniversity || selectedDegree || selectedBranch || selectedYear || selectedSubject) && (
          <div className="mb-6">
            <Badge variant="outline" className="text-sm py-2 px-4">
              {getBreadcrumb()}
            </Badge>
          </div>
        )}

        <section className="max-w-7xl mx-auto">
          {/* Universities List */}
          {!selectedUniversity && (
            <>
              <div className="mb-12 animate-slide-up text-center">
                <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                  Select University
                </h2>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Choose your university to access resources</p>
              </div>

              <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
                {universities.map((university) => (
                  <Card
                    key={university.id}
                    className="cursor-pointer hover:shadow-lg transition-all duration-300 border-2 hover:border-primary hover:scale-[1.02]"
                    onClick={() => handleUniversityClick(university)}
                  >
                    <CardHeader className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-xl bg-primary/10">
                          <Building2 className="h-8 w-8 text-primary" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-xl">{university.name}</CardTitle>
                          <CardDescription>Access degree programs and resources</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </>
          )}

          {/* Degrees List */}
          {selectedUniversity && !selectedDegree && (
            <>
              <div className="mb-8 animate-slide-up">
                <h2 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                  Degree Programs
                </h2>
                <p className="text-lg text-muted-foreground">Select your degree program</p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {degrees.map((degree) => (
                  <Card
                    key={degree.id}
                    className="cursor-pointer hover:shadow-lg transition-all duration-300 border-2 hover:border-primary hover:scale-[1.02]"
                    onClick={() => handleDegreeClick(degree)}
                  >
                    <CardHeader>
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-purple-500/10">
                          <GraduationCap className="h-6 w-6 text-purple-500" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{degree.name}</CardTitle>
                          <CardDescription>View branches</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </>
          )}

          {/* Branches List */}
          {selectedDegree && !selectedBranch && (
            <>
              <div className="mb-8 animate-slide-up">
                <h2 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                  Branches
                </h2>
                <p className="text-lg text-muted-foreground">Select your branch</p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {branches.map((branch) => (
                  <Card
                    key={branch.id}
                    className="cursor-pointer hover:shadow-lg transition-all duration-300 border-2 hover:border-primary hover:scale-[1.02]"
                    onClick={() => handleBranchClick(branch)}
                  >
                    <CardHeader>
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                          <BookOpen className="h-6 w-6 text-blue-500" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{branch.name}</CardTitle>
                          <CardDescription>View years</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </>
          )}

          {/* Years List */}
          {selectedBranch && !selectedYear && (
            <>
              <div className="mb-8 animate-slide-up">
                <h2 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                  Academic Years
                </h2>
                <p className="text-lg text-muted-foreground">Select your year</p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {years.map((year) => (
                  <Card
                    key={year.id}
                    className="cursor-pointer hover:shadow-lg transition-all duration-300 border-2 hover:border-primary hover:scale-[1.02]"
                    onClick={() => handleYearClick(year)}
                  >
                    <CardHeader>
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-green-500/10">
                          <Calendar className="h-6 w-6 text-green-500" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{year.name}</CardTitle>
                          <CardDescription>View subjects</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </>
          )}

          {/* Subjects List */}
          {selectedYear && !selectedSubject && (
            <>
              <div className="mb-8 animate-slide-up">
                <h2 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                  Subjects
                </h2>
                <p className="text-lg text-muted-foreground">Select a subject to view materials</p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {subjects.map((subject) => (
                  <Card
                    key={subject.id}
                    className="cursor-pointer hover:shadow-lg transition-all duration-300 border-2 hover:border-primary hover:scale-[1.02]"
                    onClick={() => handleSubjectClick(subject)}
                  >
                    <CardHeader>
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-orange-500/10">
                          <BookOpen className="h-6 w-6 text-orange-500" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{subject.name}</CardTitle>
                          <CardDescription>View materials</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </>
          )}

          {/* Materials List */}
          {selectedSubject && (
            <>
              <div className="mb-8 animate-slide-up">
                <h2 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                  Study Materials
                </h2>
                <p className="text-lg text-muted-foreground">{selectedSubject.name}</p>
              </div>

              {materials.length > 0 ? (
                <div className="grid gap-4">
                  {materials.map((material) => (
                    <Card
                      key={material.id}
                      className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:border-primary"
                      onClick={() => handleMaterialClick(material)}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Badge variant={material.material_type === "pyq" ? "default" : "secondary"}>
                                {material.material_type === "pyq" ? "PYQ" : "Syllabus"}
                              </Badge>
                              {material.year && (
                                <Badge variant="outline">{material.year}</Badge>
                              )}
                            </div>
                            <CardTitle className="text-lg">{material.title}</CardTitle>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-12">
                  <div className="text-center text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No materials available for this subject yet.</p>
                  </div>
                </Card>
              )}
            </>
          )}

          {loading && (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
              <p className="mt-4 text-muted-foreground">Loading...</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default University;
