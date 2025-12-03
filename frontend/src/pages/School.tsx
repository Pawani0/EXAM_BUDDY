import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { CategoryCard } from "@/components/CategoryCard";
import { ThemeBackground } from "@/components/student/ThemeBackground";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/useAuth";
import { getIcon } from "@/lib/iconMapper";
import { useCategories, Category } from "@/hooks/useCategories";
import { Skeleton } from "@/components/ui/skeleton";

const School = () => {
  const { data: categories = [], isLoading: categoriesLoading, error: categoriesError } = useCategories();
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const navigate = useNavigate();
  const { user, clearUser } = useAuth();
  const isLoggedIn = Boolean(user);

  if (categoriesError) {
    toast.error("Failed to load categories");
  }

  const handleCategoryClick = (category: Category) => {
    setSelectedCategory(category);
    toast.success("Category selected! Choose your class below.");
  };

  const handleClassClick = (classId: number, className: string) => {
    navigate(`/class/${classId}/${className.toLowerCase().replace(/\s+/g, "-")}`);
  };

  const handleLogout = () => {
    clearUser();
    toast.success("You have been logged out.");
    navigate("/login");
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
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        <section className="max-w-7xl mx-auto">
          <div className="mb-12 animate-slide-up text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
              Choose Your Level
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Select your category to access relevant study materials</p>
          </div>

          {categoriesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="glass-card p-6 rounded-2xl h-[200px] flex flex-col justify-between">
                  <div className="space-y-3">
                    <Skeleton className="h-12 w-12 rounded-xl" />
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                {categories.map((category, index) => (
                  <CategoryCard
                    key={category.id}
                    title={category.title}
                    description={category.description || ""}
                    icon={getIcon(category.icon_name)}
                    onClick={() => handleCategoryClick(category)}
                    delay={index * 100}
                  />
                ))}
              </div>

              {/* Classes Selection */}
              {selectedCategory && selectedCategory.classes.length > 0 && (
                <div className="p-8 animate-slide-up border-2 border-border/50 bg-background/80 backdrop-blur-xl rounded-3xl">
                  <h3 className="text-2xl font-bold text-foreground mb-6">
                    Select Your Class - {selectedCategory.title}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {selectedCategory.classes.map((classItem) => (
                      <Button
                        key={classItem.id}
                        onClick={() => handleClassClick(classItem.id, classItem.name)}
                        variant="outline"
                        className="h-auto py-6 text-lg font-semibold hover:bg-primary/20 hover:border-primary transition-all duration-300"
                      >
                        {classItem.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
};

export default School;
