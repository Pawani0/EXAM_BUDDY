import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { School, GraduationCap, BookOpen, Calendar, Book, ArrowLeft, Layers } from 'lucide-react';
import SelectionCard from '../components/SelectionCard';
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

interface Subject {
    id: number;
    name: string;
    icon_name?: string;
}

const UniversityFlow: React.FC = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState<number>(1);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Data states
    const [universities, setUniversities] = useState<University[]>([]);
    const [degrees, setDegrees] = useState<Degree[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [years, setYears] = useState<Year[]>([]);
    const [semesters, setSemesters] = useState<Semester[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);

    // Selection states
    const [selectedUniversity, setSelectedUniversity] = useState<University | null>(null);
    const [selectedDegree, setSelectedDegree] = useState<Degree | null>(null);
    const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
    const [selectedYear, setSelectedYear] = useState<Year | null>(null);
    const [selectedSemester, setSelectedSemester] = useState<Semester | null>(null);

    // Base API URL
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
    const API_URL = `${apiBaseUrl}/api`;

    // Fetch Universities on mount
    useEffect(() => {
        fetchUniversities();
    }, []);

    const fetchUniversities = async () => {
        setLoading(true);
        setError(null);
        try {
            console.log("Fetching universities from:", `${API_URL}/universities`);
            const response = await axios.get(`${API_URL}/universities`);
            console.log("Universities response:", response.data);
            setUniversities(response.data);
        } catch (error: any) {
            console.error("Error fetching universities:", error);
            setError(error.message || "Failed to fetch universities");
        } finally {
            setLoading(false);
        }
    };

    const handleUniversitySelect = async (uni: University) => {
        setSelectedUniversity(uni);
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get(`${API_URL}/universities/${uni.id}/degrees`);
            setDegrees(response.data);
            setStep(2);
        } catch (error: any) {
            console.error("Error fetching degrees:", error);
            setError(error.message || "Failed to fetch degrees");
        } finally {
            setLoading(false);
        }
    };

    const handleDegreeSelect = async (degree: Degree) => {
        setSelectedDegree(degree);
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get(`${API_URL}/degrees/${degree.id}/branches`);
            setBranches(response.data);
            setStep(3);
        } catch (error: any) {
            console.error("Error fetching branches:", error);
            setError(error.message || "Failed to fetch branches");
        } finally {
            setLoading(false);
        }
    };

    const handleBranchSelect = async (branch: Branch) => {
        setSelectedBranch(branch);
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get(`${API_URL}/branches/${branch.id}/years`);
            setYears(response.data);
            setStep(4);
        } catch (error: any) {
            console.error("Error fetching years:", error);
            setError(error.message || "Failed to fetch years");
        } finally {
            setLoading(false);
        }
    };

    const handleYearSelect = async (year: Year) => {
        setSelectedYear(year);
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get(`${API_URL}/years/${year.id}/semesters`);
            setSemesters(response.data);
            setStep(5);
        } catch (error: any) {
            console.error("Error fetching semesters:", error);
            setError(error.message || "Failed to fetch semesters");
        } finally {
            setLoading(false);
        }
    };

    const handleSemesterSelect = async (semester: Semester) => {
        setSelectedSemester(semester);
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get(`${API_URL}/semesters/${semester.id}/subjects`);
            setSubjects(response.data);
            setStep(6);
        } catch (error: any) {
            console.error("Error fetching subjects:", error);
            setError(error.message || "Failed to fetch subjects");
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        if (step > 1) {
            setStep(step - 1);
            setError(null);
        } else {
            navigate('/');
        }
    };

    const renderStepContent = () => {
        if (loading) {
            return (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            );
        }

        if (error) {
            return (
                <div className="flex flex-col justify-center items-center h-64 text-red-600">
                    <p className="text-xl font-semibold mb-2">Error</p>
                    <p>{error}</p>
                    <button
                        onClick={() => {
                            if (step === 1) fetchUniversities();
                            else if (step === 2 && selectedUniversity) handleUniversitySelect(selectedUniversity);
                            else if (step === 3 && selectedDegree) handleDegreeSelect(selectedDegree);
                            else if (step === 4 && selectedBranch) handleBranchSelect(selectedBranch);
                            else if (step === 5 && selectedYear) handleYearSelect(selectedYear);
                            else if (step === 6 && selectedSemester) handleSemesterSelect(selectedSemester);
                        }}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            );
        }

        switch (step) {
            case 1:
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {universities.map((uni) => (
                            <SelectionCard
                                key={uni.id}
                                title={uni.name}
                                subtitle={uni.description}
                                icon={School}
                                onClick={() => handleUniversitySelect(uni)}
                                color="blue"
                            />
                        ))}
                    </div>
                );
            case 2:
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {degrees.map((degree) => (
                            <SelectionCard
                                key={degree.id}
                                title={degree.name}
                                icon={GraduationCap}
                                onClick={() => handleDegreeSelect(degree)}
                                color="purple"
                            />
                        ))}
                    </div>
                );
            case 3:
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {branches.map((branch) => (
                            <SelectionCard
                                key={branch.id}
                                title={branch.name}
                                icon={Layers}
                                onClick={() => handleBranchSelect(branch)}
                                color="green"
                            />
                        ))}
                    </div>
                );
            case 4:
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {years.map((year) => (
                            <SelectionCard
                                key={year.id}
                                title={year.name}
                                icon={Calendar}
                                onClick={() => handleYearSelect(year)}
                                color="orange"
                            />
                        ))}
                    </div>
                );
            case 5:
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {semesters.map((semester) => (
                            <SelectionCard
                                key={semester.id}
                                title={semester.name}
                                icon={BookOpen}
                                onClick={() => handleSemesterSelect(semester)}
                                color="blue"
                            />
                        ))}
                    </div>
                );
            case 6:
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {subjects.map((subject) => (
                            <SelectionCard
                                key={subject.id}
                                title={subject.name}
                                icon={Book}
                                onClick={() => {
                                    alert(`Selected subject: ${subject.name}`);
                                }}
                                color="purple"
                            />
                        ))}
                        {subjects.length === 0 && (
                            <div className="col-span-full text-center py-10 text-gray-500">
                                No subjects found for this semester.
                            </div>
                        )}
                    </div>
                );
            default:
                return null;
        }
    };

    const getStepTitle = () => {
        switch (step) {
            case 1: return "Select University";
            case 2: return `Select Degree (${selectedUniversity?.name})`;
            case 3: return `Select Branch (${selectedDegree?.name})`;
            case 4: return `Select Year (${selectedBranch?.name})`;
            case 5: return `Select Semester (${selectedYear?.name})`;
            case 6: return `Select Subject (${selectedSemester?.name})`;
            default: return "";
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                <button
                    onClick={handleBack}
                    className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
                >
                    <ArrowLeft size={20} className="mr-2" />
                    Back
                </button>

                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">{getStepTitle()}</h1>
                    <p className="text-gray-500 mt-2">Step {step} of 6</p>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4">
                        <div
                            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                            style={{ width: `${(step / 6) * 100}%` }}
                        ></div>
                    </div>
                </div>

                {renderStepContent()}
            </div>
        </div>
    );
};

export default UniversityFlow;
