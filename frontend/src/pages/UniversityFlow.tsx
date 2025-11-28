import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { School, GraduationCap, BookOpen, Calendar, Book, ChevronRight, Loader2 } from 'lucide-react';
import SelectionCard from '../components/SelectionCard';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/useAuth';
import axios from 'axios';

// Types
interface University {
    id: number;
    name: string;
    description?: string;
    icon_name?: string;
}

interface Degree {
    id: number;
    name: string;
}

interface Branch {
    id: number;
    name: string;
}

interface Year {
    id: number;
    name: string;
}

interface Semester {
    id: number;
    name: string;
}

const UniversityFlow: React.FC = () => {
    const navigate = useNavigate();
    const { user, clearUser } = useAuth();

    // Data states
    const [universities, setUniversities] = useState<University[]>([]);
    const [degrees, setDegrees] = useState<Degree[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [years, setYears] = useState<Year[]>([]);
    const [semesters, setSemesters] = useState<Semester[]>([]);

    // Selection states
    const [selectedUniversity, setSelectedUniversity] = useState<University | null>(null);
    const [selectedDegree, setSelectedDegree] = useState<Degree | null>(null);
    const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
    const [selectedYear, setSelectedYear] = useState<Year | null>(null);

    // Loading states
    const [loadingDegrees, setLoadingDegrees] = useState(false);
    const [loadingBranches, setLoadingBranches] = useState(false);
    const [loadingYears, setLoadingYears] = useState(false);
    const [loadingSemesters, setLoadingSemesters] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Refs for auto-scroll
    const degreesRef = useRef<HTMLDivElement>(null);
    const branchesRef = useRef<HTMLDivElement>(null);
    const yearsRef = useRef<HTMLDivElement>(null);
    const semestersRef = useRef<HTMLDivElement>(null);

    // Base API URL
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
    const API_URL = `${apiBaseUrl}/api`;

    // Fetch Universities on mount
    useEffect(() => {
        fetchUniversities();
    }, []);

    const fetchUniversities = async () => {
        setError(null);
        try {
            const response = await axios.get(`${API_URL}/universities`);
            setUniversities(response.data);
        } catch (error: any) {
            console.error("Error fetching universities:", error);
            setError("Failed to fetch universities");
        }
    };

    const handleUniversitySelect = async (uni: University) => {
        setSelectedUniversity(uni);
        setSelectedDegree(null);
        setSelectedBranch(null);
        setSelectedYear(null);
        setDegrees([]);
        setBranches([]);
        setYears([]);
        setSemesters([]);

        setLoadingDegrees(true);
        setError(null);
        try {
            const response = await axios.get(`${API_URL}/universities/${uni.id}/degrees`);
            setDegrees(response.data);
            setTimeout(() => {
                degreesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        } catch (error: any) {
            console.error("Error fetching degrees:", error);
            setError("Failed to fetch degrees");
        } finally {
            setLoadingDegrees(false);
        }
    };

    const handleDegreeSelect = async (degree: Degree) => {
        setSelectedDegree(degree);
        setSelectedBranch(null);
        setSelectedYear(null);
        setBranches([]);
        setYears([]);
        setSemesters([]);

        setLoadingBranches(true);
        setError(null);
        try {
            const response = await axios.get(`${API_URL}/degrees/${degree.id}/branches`);
            setBranches(response.data);
            setTimeout(() => {
                branchesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        } catch (error: any) {
            console.error("Error fetching branches:", error);
            setError("Failed to fetch branches");
        } finally {
            setLoadingBranches(false);
        }
    };

    const handleBranchSelect = async (branch: Branch) => {
        setSelectedBranch(branch);
        setSelectedYear(null);
        setYears([]);
        setSemesters([]);

        setLoadingYears(true);
        setError(null);
        try {
            const response = await axios.get(`${API_URL}/branches/${branch.id}/years`);
            setYears(response.data);
            setTimeout(() => {
                yearsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        } catch (error: any) {
            console.error("Error fetching years:", error);
            setError("Failed to fetch years");
        } finally {
            setLoadingYears(false);
        }
    };

    const handleYearSelect = async (year: Year) => {
        setSelectedYear(year);
        setSemesters([]);

        setLoadingSemesters(true);
        setError(null);
        try {
            const response = await axios.get(`${API_URL}/years/${year.id}/semesters`);
            setSemesters(response.data);
            setTimeout(() => {
                semestersRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        } catch (error: any) {
            console.error("Error fetching semesters:", error);
            setError("Failed to fetch semesters");
        } finally {
            setLoadingSemesters(false);
        }
    };

    const handleSemesterSelect = (semester: Semester) => {
        // Navigate to subjects page with semester_id
        navigate(`/subjects?semester_id=${semester.id}`);
    };

    return (
        <div className="min-h-screen bg-muted/20">
            <Header
                showAuth={!!user}
                showStudentActions={user?.role === 'student'}
                onLogout={() => { clearUser(); navigate('/login'); }}
            />

            <main className="max-w-7xl mx-auto px-6 py-10">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold gradient-text mb-2">University Papers</h1>
                    <p className="text-muted-foreground">Select your university and navigate to your subjects</p>
                </div>

                {error && (
                    <Card className="glass-card border-destructive/50 mb-6">
                        <CardContent className="p-4">
                            <p className="text-destructive">{error}</p>
                        </CardContent>
                    </Card>
                )}

                {/* Breadcrumb */}
                {selectedUniversity && (
                    <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground flex-wrap">
                        <span className="font-medium text-foreground">{selectedUniversity.name}</span>
                        {selectedDegree && (
                            <>
                                <ChevronRight className="h-4 w-4" />
                                <span className="font-medium text-foreground">{selectedDegree.name}</span>
                            </>
                        )}
                        {selectedBranch && (
                            <>
                                <ChevronRight className="h-4 w-4" />
                                <span className="font-medium text-foreground">{selectedBranch.name}</span>
                            </>
                        )}
                        {selectedYear && (
                            <>
                                <ChevronRight className="h-4 w-4" />
                                <span className="font-medium text-foreground">{selectedYear.name}</span>
                            </>
                        )}
                    </div>
                )}

                {/* Universities Section */}
                <section className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-semibold">Select University</h2>
                        {selectedUniversity && (
                            <Button variant="ghost" size="sm" onClick={() => {
                                setSelectedUniversity(null);
                                setSelectedDegree(null);
                                setSelectedBranch(null);
                                setSelectedYear(null);
                                setDegrees([]);
                                setBranches([]);
                                setYears([]);
                                setSemesters([]);
                            }}>
                                Change
                            </Button>
                        )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {universities.map((uni) => (
                            <div
                                key={uni.id}
                                className={selectedUniversity?.id === uni.id ? 'ring-2 ring-primary rounded-xl' : ''}
                            >
                                <SelectionCard
                                    title={uni.name}
                                    subtitle={uni.description}
                                    icon={School}
                                    onClick={() => handleUniversitySelect(uni)}
                                    color="blue"
                                />
                            </div>
                        ))}
                    </div>
                </section>

                {/* Degrees Section */}
                {selectedUniversity && (
                    <section className="mb-8 animate-fade-in-up" ref={degreesRef}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-2xl font-semibold">Select Degree</h2>
                            {selectedDegree && (
                                <Button variant="ghost" size="sm" onClick={() => {
                                    setSelectedDegree(null);
                                    setSelectedBranch(null);
                                    setSelectedYear(null);
                                    setBranches([]);
                                    setYears([]);
                                    setSemesters([]);
                                }}>
                                    Change
                                </Button>
                            )}
                        </div>
                        {loadingDegrees ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {degrees.map((degree) => (
                                    <div
                                        key={degree.id}
                                        className={selectedDegree?.id === degree.id ? 'ring-2 ring-primary rounded-xl' : ''}
                                    >
                                        <SelectionCard
                                            title={degree.name}
                                            icon={GraduationCap}
                                            onClick={() => handleDegreeSelect(degree)}
                                            color="purple"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                )}

                {/* Branches Section */}
                {selectedDegree && (
                    <section className="mb-8 animate-fade-in-up" ref={branchesRef}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-2xl font-semibold">Select Branch</h2>
                            {selectedBranch && (
                                <Button variant="ghost" size="sm" onClick={() => {
                                    setSelectedBranch(null);
                                    setSelectedYear(null);
                                    setYears([]);
                                    setSemesters([]);
                                }}>
                                    Change
                                </Button>
                            )}
                        </div>
                        {loadingBranches ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {branches.map((branch) => (
                                    <div
                                        key={branch.id}
                                        className={selectedBranch?.id === branch.id ? 'ring-2 ring-primary rounded-xl' : ''}
                                    >
                                        <SelectionCard
                                            title={branch.name}
                                            icon={BookOpen}
                                            onClick={() => handleBranchSelect(branch)}
                                            color="green"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                )}

                {/* Years Section */}
                {selectedBranch && (
                    <section className="mb-8 animate-fade-in-up" ref={yearsRef}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-2xl font-semibold">Select Year</h2>
                            {selectedYear && (
                                <Button variant="ghost" size="sm" onClick={() => {
                                    setSelectedYear(null);
                                    setSemesters([]);
                                }}>
                                    Change
                                </Button>
                            )}
                        </div>
                        {loadingYears ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {years.map((year) => (
                                    <div
                                        key={year.id}
                                        className={selectedYear?.id === year.id ? 'ring-2 ring-primary rounded-xl' : ''}
                                    >
                                        <SelectionCard
                                            title={year.name}
                                            icon={Calendar}
                                            onClick={() => handleYearSelect(year)}
                                            color="orange"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                )}

                {/* Semesters Section */}
                {selectedYear && (
                    <section className="mb-8 animate-fade-in-up" ref={semestersRef}>
                        <h2 className="text-2xl font-semibold mb-4">Select Semester</h2>
                        {loadingSemesters ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {semesters.map((semester) => (
                                    <SelectionCard
                                        key={semester.id}
                                        title={semester.name}
                                        icon={Book}
                                        onClick={() => handleSemesterSelect(semester)}
                                        color="blue"
                                    />
                                ))}
                                {semesters.length === 0 && (
                                    <Card className="glass-card col-span-full">
                                        <CardContent className="text-center py-10">
                                            <p className="text-muted-foreground">No semesters found for this year.</p>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        )}
                    </section>
                )}
            </main>
        </div>
    );
};

export default UniversityFlow;
