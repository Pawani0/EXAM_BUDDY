import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { ThemeBackground } from "@/components/student/ThemeBackground";
import { SubjectCard } from "@/components/SubjectCard";
import { Button } from "@/components/ui/button";
import { Book } from "lucide-react";
import { toast } from "sonner";
import { getIcon, subjectIcons } from "@/lib/iconMapper";
import { useClassData } from "@/hooks/useClassData";

import { Skeleton } from "@/components/ui/skeleton";

const subjectColors = [
  "bg-blue-500/20",
  "bg-purple-500/20",
  "bg-green-500/20",
  "bg-orange-500/20",
  "bg-pink-500/20",
  "bg-cyan-500/20",
];

interface Subject {
  id: number;
  class_id: number;
  name: string;
  icon_name?: string | null;
  display_order: number;
}

interface ClassData {
  id: number;
  category_id: number;
  name: string;
  display_order: number;
  subjects: Subject[];
}

const Class = () => {
  const { classId, className } = useParams();
  const navigate = useNavigate();

  const { data: classData, isLoading: loading, error } = useClassData(classId);

  const displayName = className?.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) || classData?.name || "Class";

  if (error) {
    toast.error("Failed to load class data");
  }

  const handleSubjectClick = (subject: Subject) => {
    const subjectSlug = subject.name.toLowerCase().replace(/\s+/g, "-");
    navigate(`/class/${classId}/resources/${subjectSlug}`);
  };

  const handleQuickAction = (action: string) => {
    toast.success(`${action} feature coming soon!`);
  };

  return (
    <div className="min-h-screen pb-16 relative overflow-hidden">
      <ThemeBackground />
      <Header showBack />

      {/* Class Header */}
      <section className="max-w-7xl mx-auto px-6 py-12 animate-fade-in relative z-10">
        <div className="relative overflow-hidden p-12 border-2 border-border/50 bg-background/80 backdrop-blur-xl rounded-[2.5rem]">
          <div className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-gradient-to-br from-primary/20 to-transparent blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-secondary/20 blur-3xl" />

          <div className="relative">
            <div className="inline-block px-4 py-2 rounded-full bg-primary/20 text-primary border border-primary/30 text-sm font-bold mb-4">
              {displayName}
            </div>
            <h1 className="text-5xl font-extrabold mb-4 bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
              Your Learning Hub
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl">
              Access subjects, syllabus, and previous year question papers for {displayName}.
              Everything you need to excel in your exams.
            </p>
          </div>
        </div>
      </section>

      {/* Subjects Grid */}
      <section className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="p-8 animate-scale-in border-2 border-border/50 bg-background/80 backdrop-blur-xl rounded-3xl">
          <h2 className="text-3xl font-bold mb-8 bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">Subjects</h2>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="glass-card p-6 rounded-2xl h-[180px] flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <Skeleton className="h-12 w-12 rounded-xl" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </div>
                  <Skeleton className="h-6 w-1/2" />
                </div>
              ))}
            </div>
          ) : classData && classData.subjects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {classData.subjects.map((subject, index) => {
                const Icon = subject.icon_name
                  ? getIcon(subject.icon_name, subjectIcons[subject.name] || Book)
                  : (subjectIcons[subject.name] || Book);
                const color = subjectColors[index % subjectColors.length];

                return (
                  <SubjectCard
                    key={subject.id}
                    name={subject.name}
                    icon={Icon}
                    color={color}
                    onClick={() => handleSubjectClick(subject)}
                  />
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No subjects available for this class.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Class;
