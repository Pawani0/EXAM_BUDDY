import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import School from "./pages/School";
import University from "./pages/University";
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
import HotTopicsExtraction from "./pages/teacher/HotTopicsExtraction";
import QuestionBankGenerator from "./pages/teacher/QuestionBankGenerator";
import AssignmentGenerator from "./pages/teacher/AssignmentGenerator";
import COPOMapping from "./pages/teacher/COPOMapping";
import AdminPanel from "./pages/AdminPanel";
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
          <Route path="/school" element={<School />} />
          <Route path="/university" element={<University />} />
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
            path="/teacher/hot-topics"
            element={
              <ProtectedRoute allowedRoles={["teacher", "admin"]}>
                <HotTopicsExtraction />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/question-bank"
            element={
              <ProtectedRoute allowedRoles={["teacher", "admin"]}>
                <QuestionBankGenerator />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/assignment"
            element={
              <ProtectedRoute allowedRoles={["teacher", "admin"]}>
                <AssignmentGenerator />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/co-po"
            element={
              <ProtectedRoute allowedRoles={["teacher", "admin"]}>
                <COPOMapping />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminPanel />
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
