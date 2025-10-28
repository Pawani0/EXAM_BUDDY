import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { SubjectCard } from "@/components/SubjectCard";
import { Button } from "@/components/ui/button";
import {
  Book,
  Calculator,
  FlaskConical,
  Atom,
  Globe,
  Languages,
  FileText,
  Download,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

const subjectIcons: Record<string, any> = {
  Mathematics: Calculator,
  Science: FlaskConical,
  Evs: FlaskConical,
  Physics: Atom,
  Chemistry: FlaskConical,
  Biology: Atom,
  English: Languages,
  Hindi: Languages,
  History: Book,
  Geography: Globe,
  "Computer Science": Book,
};

const subjectColors = [
  "bg-blue-500/20",
  "bg-purple-500/20",
  "bg-green-500/20",
  "bg-orange-500/20",
  "bg-pink-500/20",
  "bg-cyan-500/20",
];

const getSubjectsForClass = (className: string) => {
  const classNum = parseInt(className.match(/\d+/)?.[0] || "0");
  
  if (classNum >= 11) {
    return ["Mathematics", "Physics", "Chemistry", "Biology", "English", "Computer Science"];
  } else if (classNum >= 6) {
    return ["Mathematics", "Science", "English", "History", "Geography"];
  } else {
    return ["Mathematics", "English", "Hindi", "Evs"];
  }
};

const Class = () => {
  const { className } = useParams();
  const navigate = useNavigate();
  const displayName = className?.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) || "Class";
  const subjects = getSubjectsForClass(displayName);

  const handleSubjectClick = (subject: string) => {
    const subjectSlug = subject.toLowerCase().replace(/\s+/g, "-");
    navigate(`/class/${className}/resources/${subjectSlug}`);
  };

  const handleQuickAction = (action: string) => {
    toast.success(`${action} feature coming soon!`);
  };

  return (
    <div className="min-h-screen pb-16">
      <Header showBack />

      {/* Class Header */}
      <section className="max-w-7xl mx-auto px-6 py-12 animate-fade-in">
        <div className="relative overflow-hidden glass-card rounded-[2.5rem] p-12 border-2 border-border/50">
          <div className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-gradient-to-br from-primary/20 to-transparent blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-secondary/20 blur-3xl" />
          
          <div className="relative">
            <div className="inline-block px-4 py-2 rounded-full bg-primary/20 text-primary border border-primary/30 text-sm font-bold mb-4">
              {displayName}
            </div>
            <h1 className="text-5xl font-extrabold mb-4 text-foreground">
              Your Learning <span className="gradient-text">Hub</span>
            </h1>
            <p className="text-xl text-foreground/80 max-w-2xl">
              Access subjects, syllabus, and previous year question papers for {displayName}.
              Everything you need to excel in your exams.
            </p>
          </div>
        </div>
      </section>

      {/* Subjects Grid */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="glass-card rounded-3xl p-8 animate-scale-in">
          <h2 className="text-3xl font-bold text-foreground mb-8">Subjects</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subjects.map((subject, index) => {
              const Icon = subjectIcons[subject] || Book;
              const color = subjectColors[index % subjectColors.length];
              
              return (
                <SubjectCard
                  key={subject}
                  name={subject}
                  icon={Icon}
                  color={color}
                  onClick={() => handleSubjectClick(subject)}
                />
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Class;
