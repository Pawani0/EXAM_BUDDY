import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BookOpen, LogIn, UserPlus, ArrowLeft } from "lucide-react";

interface HeaderProps {
  showBack?: boolean;
  showAuth?: boolean;
}

export const Header = ({ showBack = false, showAuth = true }: HeaderProps) => {
  const navigate = useNavigate();

  return (
    <header className="w-full py-4 px-6 animate-fade-in">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
            <BookOpen className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text">Exam Buddy</h1>
            <p className="text-sm text-muted-foreground">Smart Learning Assistant</p>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          {showBack && (
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          )}
          {showAuth && (
            <>
              <Button
                variant="ghost"
                asChild
                className="gap-2"
              >
                <Link to="/login">
                  <LogIn className="h-4 w-4" />
                  Login
                </Link>
              </Button>
              <Button
                asChild
                className="gap-2 bg-primary hover:bg-primary/90"
              >
                <Link to="/signup">
                  <UserPlus className="h-4 w-4" />
                  Sign Up
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
