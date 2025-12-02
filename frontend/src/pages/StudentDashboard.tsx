import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { ThemeBackground } from "@/components/student/ThemeBackground";
import { TrialCounter } from "@/components/student/TrialCounter";
import { FeatureCard } from "@/components/student/FeatureCard";
import { useAuth } from "@/lib/useAuth";
import { toast } from "sonner";
import { Sparkles, Flame, BookOpen } from "lucide-react";

const StudentDashboard = () => {
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

    return (
        <div className="min-h-screen relative overflow-hidden">
            <ThemeBackground />
            <Header showAuth={false} showStudentActions onLogout={handleLogout} studentActionVariant="home" />

            <main className="container mx-auto px-4 py-8 relative z-10">
                {/* Welcome Section */}
                <div className="text-center mb-12 space-y-4">
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                        Welcome to Exam Buddy
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        Choose a feature below to get started with your exam preparation
                    </p>
                </div>

                {/* Trial Counter */}
                {user.role === "student" && (
                    <div className="max-w-md mx-auto mb-8">
                        <TrialCounter trialsUsed={user.trial_used || 0} maxTrials={3} />
                    </div>
                )}

                {/* Feature Cards */}
                <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    <FeatureCard
                        title="Question Clustering"
                        description="Organize your PYQ questions by topics and units for better understanding"
                        icon={Sparkles}
                        gradient="bg-gradient-to-br from-blue-500/20 to-cyan-500/20"
                        onClick={() => navigate("/student/clustering")}
                        badge="Smart AI"
                    />

                    <FeatureCard
                        title="Hot Topic Extraction"
                        description="Identify the most important topics based on previous year questions"
                        icon={Flame}
                        gradient="bg-gradient-to-br from-orange-500/20 to-red-500/20"
                        onClick={() => navigate("/student/hot-topics")}
                        badge="Trending"
                    />

                    <FeatureCard
                        title="Practice Paper Generation"
                        description="Generate custom practice papers tailored to your syllabus and preferences"
                        icon={BookOpen}
                        gradient="bg-gradient-to-br from-purple-500/20 to-pink-500/20"
                        onClick={() => navigate("/student/practice-paper")}
                        badge="Personalized"
                    />
                </div>
            </main>
        </div>
    );
};

export default StudentDashboard;
