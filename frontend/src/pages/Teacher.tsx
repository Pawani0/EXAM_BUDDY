import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { ThemeBackground } from "@/components/student/ThemeBackground";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, GraduationCap, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/useAuth";
import { TrialCounter } from "@/components/student/TrialCounter";

const Teacher = () => {
    const navigate = useNavigate();
    const { user, clearUser } = useAuth();

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

    const handleFeatureClick = (path: string) => {
        if (user.role === "teacher" && user.trial_used >= 3) {
            toast.error("Trial limit reached. Please upgrade to continue.");
            return;
        }
        navigate(path);
    };

    const features = [
        {
            title: "Hot Topics Extractor",
            description: "Extract trending topics from syllabus and PYQ files",
            icon: FileText,
            color: "text-orange-500",
            bgColor: "bg-orange-500/10",
            path: "/teacher/hot-topics"
        },
        {
            title: "Assignment Generator",
            description: "Generate unit-wise assignments with Bloom's taxonomy",
            icon: GraduationCap,
            color: "text-blue-500",
            bgColor: "bg-blue-500/10",
            path: "/teacher/assignment"
        },
        {
            title: "Question Bank",
            description: "Create comprehensive question banks by topic",
            icon: BookOpen,
            color: "text-green-500",
            bgColor: "bg-green-500/10",
            path: "/teacher/question-bank"
        },
        {
            title: "CO-PO Mapping",
            description: "Generate course and program outcome mappings",
            icon: CheckCircle2,
            color: "text-purple-500",
            bgColor: "bg-purple-500/10",
            path: "/teacher/co-po"
        }
    ];

    return (
        <div className="min-h-screen relative overflow-hidden">
            <ThemeBackground />
            <Header showAuth={false} showStudentActions studentActionVariant="home" onLogout={handleLogout} />
            
            <main className="container mx-auto px-4 py-8 max-w-7xl relative z-10">
                <div className="text-center mb-12 space-y-4 animate-fade-in">
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                        Teacher Dashboard
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        AI-powered tools for educational content generation
                    </p>
                </div>

                {user.role === "teacher" && (
                    <div className="max-w-md mx-auto mb-12">
                        <TrialCounter trialsUsed={user.trial_used || 0} maxTrials={3} />
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {features.map((feature) => {
                        const Icon = feature.icon;
                        return (
                            <Card
                                key={feature.path}
                                className="glass-card group relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02] animate-slide-up"
                                onClick={() => handleFeatureClick(feature.path)}
                            >
                                <CardHeader className="text-center space-y-4">
                                    <div className={`mx-auto w-16 h-16 rounded-full ${feature.bgColor} flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}>
                                        <Icon className={`h-8 w-8 ${feature.color}`} />
                                    </div>
                                    <div className="space-y-2">
                                        <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors">
                                            {feature.title}
                                        </CardTitle>
                                        <CardDescription className="text-sm">
                                            {feature.description}
                                        </CardDescription>
                                    </div>
                                </CardHeader>
                            </Card>
                        );
                    })}
                </div>
            </main>
        </div>
    );
};

export default Teacher;
