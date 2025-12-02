import logo from "@/assets/logo.jpg";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogIn, UserPlus, ArrowLeft, User, Home, LogOut, GraduationCap } from "lucide-react";
import { useAuth } from "@/lib/useAuth";

interface HeaderProps {
  showBack?: boolean;
  showAuth?: boolean;
  showStudentActions?: boolean;
  onLogout?: () => void;
  studentActionVariant?: "home" | "dashboard";
}

export const Header = ({
  showBack = false,
  showAuth = true,
  showStudentActions = false,
  onLogout,
  studentActionVariant = "home",
}: HeaderProps) => {
  const navigate = useNavigate();
  const { user, clearUser } = useAuth();
  const isLoggedIn = Boolean(user);
  const shouldShowStudentActions = showStudentActions && isLoggedIn;
  const shouldShowAuth = showAuth && !shouldShowStudentActions;

  const handleLogoutClick = () => {
    if (onLogout) {
      onLogout();
      return;
    }
    clearUser();
    navigate("/login", { replace: true });
  };

  return (
    <header className="w-full py-4 px-6 animate-fade-in">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 overflow-hidden">
            <img src={logo} alt="Exam Buddy Logo" className="h-full w-full object-cover" />
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
          {shouldShowStudentActions && (
            studentActionVariant === "dashboard" ? (
              <>
                {/* Role-based Dashboard Link */}
                <Button variant="outline" asChild className="gap-2">
                  <Link to={user?.role === "teacher" ? "/teacher" : user?.role === "admin" ? "/admin" : "/student"}>
                    <User className="h-4 w-4" />
                    Dashboard
                  </Link>
                </Button>

                {/* Admin Access to All Dashboards */}
                {user?.role === "admin" && (
                  <>
                    <Button variant="outline" asChild className="gap-2">
                      <Link to="/student">
                        <User className="h-4 w-4" />
                        Student View
                      </Link>
                    </Button>
                    <Button variant="outline" asChild className="gap-2">
                      <Link to="/teacher">
                        <GraduationCap className="h-4 w-4" />
                        Teacher View
                      </Link>
                    </Button>
                  </>
                )}

                <Button variant="ghost" className="gap-2" onClick={handleLogoutClick}>
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" asChild className="gap-2">
                  <Link to="/">
                    <Home className="h-4 w-4" />
                    Home
                  </Link>
                </Button>

                <Button variant="ghost" className="gap-2" onClick={handleLogoutClick}>
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </>
            )
          )}
          {shouldShowAuth && (
            isLoggedIn ? (
              <Button
                variant="outline"
                asChild
                className="gap-2"
              >
                <Link to={user?.role === "teacher" ? "/teacher" : user?.role === "admin" ? "/admin" : "/student"}>
                  <User className="h-4 w-4" />
                  Dashboard
                </Link>
              </Button>
            ) : (
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
            )
          )}
        </div>
      </div>
    </header>
  );
};
