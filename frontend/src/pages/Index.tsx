import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { CategoryCard } from "@/components/CategoryCard";
import { Button } from "@/components/ui/button";
import { GraduationCap, School, BookOpen, Building2, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const categories = [
  {
    id: "primary",
    title: "Primary",
    description: "Classes 1-5",
    icon: School,
    classes: ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5"],
  },
  {
    id: "middle",
    title: "Middle School",
    description: "Classes 6-8",
    icon: BookOpen,
    classes: ["Class 6", "Class 7", "Class 8"],
  },
  {
    id: "high",
    title: "High School",
    description: "Classes 9-10",
    icon: BookOpen,
    classes: ["Class 9", "Class 10"],
  },
  {
    id: "higher",
    title: "Higher Secondary",
    description: "Classes 11-12",
    icon: GraduationCap,
    classes: ["Class 11", "Class 12"],
  },
  {
    id: "university",
    title: "Universities",
    description: "UG/PG Programs",
    icon: Building2,
    classes: ["RGPV"],
  },
];

const Index = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(categoryId);
    toast.success("Category selected! Choose your class below.");
  };

  const handleClassClick = (className: string) => {
    navigate(`/class/${className.toLowerCase().replace(/\s+/g, "-")}`);
  };

  const selectedCategoryData = categories.find((cat) => cat.id === selectedCategory);

  return (
    <div className="min-h-screen">
      <Header showAuth />

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-16 animate-fade-in">
        <div className="relative overflow-hidden glass-card rounded-[2.5rem] p-12 md:p-16 border-2 border-border/50">
          <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-gradient-to-br from-primary/20 to-transparent blur-3xl animate-float" />
          <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-gradient-to-br from-secondary/20 to-transparent blur-3xl animate-float" style={{ animationDelay: "3s" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] bg-gradient-to-br from-accent/15 to-transparent blur-3xl" />
          
          <div className="relative z-10 max-w-3xl">
            <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight text-foreground">
              Learn Smarter,
              <span className="gradient-text"> Not Harder</span>
            </h1>
            <p className="text-xl text-foreground/80 mb-8">
              Access previous year questions, curated syllabus, and study materials tailored to your curriculum. Your one-stop solution for exam preparation.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button
                size="lg"
                className="gap-2 shine-effect bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground font-bold text-lg px-8 shadow-lg shadow-primary/20"
                onClick={() => document.getElementById("categories")?.scrollIntoView({ behavior: "smooth" })}
              >
                Get Started
                <ChevronRight className="h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 border-2 hover:bg-primary/5 backdrop-blur font-semibold"
                asChild
              >
                <a href="#features">Learn More</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section id="categories" className="max-w-7xl mx-auto px-6 py-16">
        <div className="mb-12 animate-slide-up">
          <h2 className="text-4xl font-bold text-foreground mb-4">Choose Your Level</h2>
          <p className="text-xl text-muted-foreground">Select your category to access relevant study materials</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {categories.map((category, index) => (
            <CategoryCard
              key={category.id}
              title={category.title}
              description={category.description}
              icon={category.icon}
              onClick={() => handleCategoryClick(category.id)}
              delay={index * 100}
            />
          ))}
        </div>

        {/* Classes Selection */}
        {selectedCategoryData && (
          <div className="glass-card rounded-3xl p-8 animate-slide-up">
            <h3 className="text-2xl font-bold text-foreground mb-6">
              Select Your Class - {selectedCategoryData.title}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {selectedCategoryData.classes.map((className) => (
                <Button
                  key={className}
                  onClick={() => handleClassClick(className)}
                  variant="outline"
                  className="h-auto py-6 text-lg font-semibold hover:bg-primary/20 hover:border-primary transition-all duration-300"
                >
                  {className}
                </Button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Features Section */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-16">
        <div className="glass-card rounded-3xl p-12">
          <h2 className="text-4xl font-bold text-foreground mb-12 text-center">Why Exam Buddy?</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Previous Year Questions",
                description: "Access comprehensive collection of PYQs with solutions",
                icon: "📚",
              },
              {
                title: "Curated Syllabus",
                description: "Well-organized curriculum aligned with your board",
                icon: "📝",
              },
              {
                title: "Smart Organization",
                description: "Find what you need quickly with intuitive navigation",
                icon: "🎯",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="text-center p-6 rounded-2xl bg-card/20 hover:bg-card/30 transition-all duration-300"
              >
                <div className="text-5xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold text-foreground mb-3">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
