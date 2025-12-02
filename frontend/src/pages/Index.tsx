import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { CategoryCard } from "@/components/CategoryCard";
import { ThemeBackground } from "@/components/student/ThemeBackground";
import { Button } from "@/components/ui/button";
import { ChevronRight, X, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/useAuth";
import { getIcon } from "@/lib/iconMapper";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useCategories, Category } from "@/hooks/useCategories";
import { Zap, Target, Sparkles } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { useNotifications, Notification } from "@/hooks/useNotifications";

const Index = () => {
  const { data: categories = [], isLoading: categoriesLoading, error: categoriesError } = useCategories();
  const { data: notifications = [] } = useNotifications();

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<number>>(new Set());
  const navigate = useNavigate();
  const { user, clearUser } = useAuth();
  const isLoggedIn = Boolean(user);

  if (categoriesError) {
    toast.error("Failed to load categories");
  }

  const handleDismissNotification = (id: number) => {
    setDismissedNotifications(prev => new Set([...prev, id]));
  };

  const getNotificationIcon = (priority: string) => {
    switch (priority) {
      case "urgent":
        return <AlertCircle className="h-5 w-5" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  const getNotificationStyles = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-300";
      case "warning":
        return "border-yellow-500/50 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300";
      default:
        return "border-blue-500/50 bg-blue-500/10 text-blue-700 dark:text-blue-300";
    }
  };

  const visibleNotifications = notifications.filter(n => !dismissedNotifications.has(n.id));



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

  const selectedCategoryData = selectedCategory ? categories.find((cat) => cat.id === selectedCategory.id) : null;

  return (
    <div className="min-h-screen relative overflow-hidden">
      <ThemeBackground />
      <Header
        showAuth={!isLoggedIn}
        showStudentActions={isLoggedIn}
        studentActionVariant="dashboard"
        onLogout={handleLogout}
      />

      {/* Notifications Banner */}
      {visibleNotifications.length > 0 && (
        <div className="max-w-7xl mx-auto px-6 pt-6 space-y-3">
          {visibleNotifications.map((notification) => (
            <Alert
              key={notification.id}
              className={`${getNotificationStyles(notification.priority)} relative ${notification.link_url ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''} pr-10`}
              onClick={() => {
                if (notification.link_url) {
                  if (notification.link_url.startsWith('http://') || notification.link_url.startsWith('https://')) {
                    window.open(notification.link_url, '_blank', 'noopener,noreferrer');
                  } else {
                    navigate(notification.link_url);
                  }
                }
              }}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {getNotificationIcon(notification.priority)}
                </div>
                <div className="flex-1">
                  <AlertTitle className="font-bold mb-1 flex items-center gap-2">
                    {notification.title}
                    {notification.link_url && (
                      <span className="text-xs font-normal opacity-75">→</span>
                    )}
                  </AlertTitle>
                  <AlertDescription className="text-sm">
                    {notification.message}
                  </AlertDescription>
                  {notification.link_url && (
                    <div className="mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className={`text-xs font-semibold ${notification.priority === "urgent"
                          ? "border-red-600 text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-900/20"
                          : notification.priority === "warning"
                            ? "border-yellow-600 text-yellow-700 hover:bg-yellow-50 dark:text-yellow-300 dark:hover:bg-yellow-900/20"
                            : "border-blue-600 text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-900/20"
                          }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (notification.link_url) {
                            if (notification.link_url.startsWith('http://') || notification.link_url.startsWith('https://')) {
                              window.open(notification.link_url, '_blank', 'noopener,noreferrer');
                            } else {
                              navigate(notification.link_url);
                            }
                          }
                        }}
                      >
                        {notification.link_text || "Learn More"}
                        <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 h-6 w-6 p-0 hover:bg-transparent"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDismissNotification(notification.id);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </Alert>
          ))}
        </div>
      )}

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
      <section id="categories" className="max-w-7xl mx-auto px-6 py-16 relative z-10">
        <div className="mb-12 animate-slide-up text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
            Choose Your Level
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Select your category to access relevant study materials</p>
        </div>

        {categoriesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
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
              {/* Universities feature temporarily removed */}
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

      {/* Features Section */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-16 relative z-10">
        <div className="p-12 border-2 border-border/50 bg-background/80 backdrop-blur-xl rounded-3xl">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-center bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
            Why Exam Buddy?
          </h2>
          <p className="text-center text-muted-foreground mb-12 text-lg max-w-2xl mx-auto">
            Experience seamless exam preparation with cutting-edge tools designed for modern learners
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Lightning Fast",
                description: "Instant access to thousands of PYQs and study materials. No waiting, just learning.",
                icon: Zap,
                gradient: "from-yellow-500/20 to-orange-500/20",
                iconColor: "text-yellow-500",
              },
              {
                title: "Pinpoint Accuracy",
                description: "AI-powered content curation ensures you study exactly what matters for your exams.",
                icon: Target,
                gradient: "from-blue-500/20 to-cyan-500/20",
                iconColor: "text-blue-500",
              },
              {
                title: "Effortlessly Simple",
                description: "Intuitive design that feels natural. Find what you need in seconds, not minutes.",
                icon: Sparkles,
                gradient: "from-purple-500/20 to-pink-500/20",
                iconColor: "text-purple-500",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="group relative overflow-hidden text-center p-8 rounded-2xl border-2 border-border/50 bg-background/40 backdrop-blur-sm hover:scale-[1.02] transition-all duration-200 ease-out hover:shadow-xl hover:shadow-primary/10 hover:border-primary/50 will-change-transform"
              >
                {/* Gradient Background on Hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                
                {/* Content */}
                <div className="relative z-10">
                  <div className="mx-auto w-16 h-16 mb-6 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-200 ease-out will-change-transform">
                    <feature.icon className={`h-8 w-8 ${feature.iconColor}`} strokeWidth={2.5} />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
