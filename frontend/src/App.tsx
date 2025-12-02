import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Class from "./pages/Class";
import Resources from "./pages/Resources";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import NotFound from "./pages/NotFound";
import StudentDashboard from "./pages/StudentDashboard";
import QuestionClustering from "./pages/QuestionClustering";
import HotTopicExtraction from "./pages/HotTopicExtraction";
import PracticePaperGeneration from "./pages/PracticePaperGeneration";
import Teacher from "./pages/Teacher";
import Admin from "./pages/Admin";
import UniversityFlow from "./pages/UniversityFlow";
import { ProtectedRoute } from "./components/ProtectedRoute";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes default stale time
      gcTime: 1000 * 60 * 30, // 30 minutes garbage collection time
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/class/:classId/:className" element={<Class />} />
          <Route path="/class/:classId" element={<Class />} />
          <Route path="/class/:classId/resources/:subject" element={<Resources />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/student"
            element={
              <ProtectedRoute allowedRoles={["student", "admin"]}>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/clustering"
            element={
              <ProtectedRoute allowedRoles={["student", "admin"]}>
                <QuestionClustering />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/hot-topics"
            element={
              <ProtectedRoute allowedRoles={["student", "admin"]}>
                <HotTopicExtraction />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/practice-paper"
            element={
              <ProtectedRoute allowedRoles={["student", "admin"]}>
                <PracticePaperGeneration />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher"
            element={
              <ProtectedRoute allowedRoles={["teacher", "admin"]}>
                <Teacher />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <Admin />
              </ProtectedRoute>
            }
          />
          <Route path="/university" element={<UniversityFlow />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
