import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/lib/useAuth";
import { Plus, Edit, Trash2, Save, X, Bell, Loader2, ChevronRight, School, GraduationCap, BookOpen, Calendar, Book, ArrowLeft, Home } from "lucide-react";
import { cache } from "@/lib/cache";
import { Skeleton } from "@/components/ui/skeleton";

interface Category {
  id: number;
  title: string;
  description?: string | null;
  icon_name?: string | null;
  display_order: number;
}

interface Class {
  id: number;
  category_id: number;
  name: string;
  display_order: number;
}

interface Subject {
  id: number;
  class_id?: number | null;
  semester_id?: number | null;
  name: string;
  code?: string;
  credits?: number;
  description?: string;
  icon_name?: string | null;
  display_order: number;
}

interface Material {
  id: number;
  subject_id: number;
  material_type: "pyq" | "syllabus";
  title: string;
  year?: string | null;
  embed_url?: string | null;
  download_url?: string | null;
  display_order: number;
}

interface Notification {
  id: number;
  title: string;
  message: string;
  link_url?: string | null;
  link_text?: string | null;
  is_active: number; // 1 = active, 0 = inactive
  priority: "info" | "warning" | "urgent";
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface University {
  id: number;
  name: string;
  description?: string | null;
  icon_name?: string | null;
  display_order: number;
}

interface Degree {
  id: number;
  university_id: number;
  name: string;
  display_order: number;
}

interface Branch {
  id: number;
  degree_id: number;
  name: string;
  display_order: number;
}

interface Year {
  id: number;
  branch_id: number;
  name: string;
  display_order: number;
}

interface Semester {
  id: number;
  year_id: number;
  name: string;
  display_order: number;
}

const Admin = () => {
  const navigate = useNavigate();
  const { user, clearUser } = useAuth();
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

  // Helper to safely check properties on possibly-null/undefined editingItem
  const hasProp = (obj: any, prop: string): boolean => obj != null && Object.prototype.hasOwnProperty.call(obj, prop);

  const [categories, setCategories] = useState<Category[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // University Data
  const [universities, setUniversities] = useState<University[]>([]);
  const [degrees, setDegrees] = useState<Degree[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [years, setYears] = useState<Year[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);

  // University Filters
  const [selectedUniId, setSelectedUniId] = useState<number | null>(null);
  const [selectedDegreeId, setSelectedDegreeId] = useState<number | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [selectedYearId, setSelectedYearId] = useState<number | null>(null);
  const [selectedSemesterId, setSelectedSemesterId] = useState<number | null>(null);
  const [materialClassFilterId, setMaterialClassFilterId] = useState<number | null>(null);
  const [materialType, setMaterialType] = useState<"pyq" | "syllabus" | "">("");
  const [materialSubjectId, setMaterialSubjectId] = useState<number | null>(null);
  const [notificationPriority, setNotificationPriority] = useState<"info" | "warning" | "urgent">("info");
  const [notificationActive, setNotificationActive] = useState<string>("1");

  // Side-by-side view state
  const [viewLevel, setViewLevel] = useState<'universities' | 'degrees' | 'branches' | 'years' | 'semesters' | 'subjects'>('universities');
  const [selectedUniversity, setSelectedUniversity] = useState<University | null>(null);
  const [selectedDegree, setSelectedDegree] = useState<Degree | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [selectedYear, setSelectedYear] = useState<Year | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<Semester | null>(null);
  const [universityHierarchy, setUniversityHierarchy] = useState<Map<number, {
    degrees: Degree[],
    branches: Map<number, Branch[]>,
    years: Map<number, Year[]>,
    semesters: Map<number, Semester[]>,
    subjects: Map<number, Subject[]>
  }>>(new Map());

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [classDialogOpen, setClassDialogOpen] = useState(false);
  const [subjectDialogOpen, setSubjectDialogOpen] = useState(false);
  const [materialDialogOpen, setMaterialDialogOpen] = useState(false);
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);

  // University Dialogs
  const [universityDialogOpen, setUniversityDialogOpen] = useState(false);
  const [degreeDialogOpen, setDegreeDialogOpen] = useState(false);
  const [branchDialogOpen, setBranchDialogOpen] = useState(false);
  const [yearDialogOpen, setYearDialogOpen] = useState(false);
  const [semesterDialogOpen, setSemesterDialogOpen] = useState(false);

  const [editingItem, setEditingItem] = useState<Category | Class | Subject | Material | Notification | University | Degree | Branch | Year | Semester | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: number } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/login", { replace: true });
      return;
    }
    loadData();
  }, [user, navigate]);

  useEffect(() => {
    if (selectedUniId) {
      fetchDegrees(selectedUniId);
    } else {
      setDegrees([]);
    }
  }, [selectedUniId]);

  const getAuthHeaders = () => ({
    "Content-Type": "application/json",
    "X-User-Id": user?.id.toString() || "",
  });

  const loadData = async (forceRefresh = false) => {
    setIsLoading(true);
    try {
      const endpoints = [
        { key: "admin_categories", url: `${apiBaseUrl}/admin/categories` },
        { key: "admin_classes", url: `${apiBaseUrl}/admin/classes` },
        { key: "admin_subjects", url: `${apiBaseUrl}/admin/subjects` },
        { key: "admin_materials", url: `${apiBaseUrl}/admin/materials` },
        { key: "admin_notifications", url: `${apiBaseUrl}/admin/notifications` },
        { key: "admin_universities", url: `${apiBaseUrl}/api/universities` },
      ];

      const results = await Promise.all(
        endpoints.map(async (ep) => {
          if (!forceRefresh) {
            const cached = cache.get(ep.key);
            if (cached) return cached;
          }
          const res = await fetch(ep.url, { headers: getAuthHeaders() });
          if (!res.ok) throw new Error(`Failed to fetch ${ep.key}`);
          const data = await res.json();
          cache.set(ep.key, data);
          return data;
        })
      );

      setCategories(results[0]);
      setClasses(results[1]);
      setSubjects(results[2]);
      setMaterials(results[3]);
      setNotifications(results[4]);
      setUniversities(results[5]);
    } catch (error) {
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  // Category handlers
  const handleCategorySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get("title") as string,
      description: formData.get("description") as string || null,
      icon_name: formData.get("icon_name") as string || null,
      display_order: parseInt(formData.get("display_order") as string) || 0,
    };

    setIsSubmitting(true);
    try {
      if (editingItem) {
        await fetch(`${apiBaseUrl}/admin/categories/${editingItem.id}`, {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        });
        toast.success("Category updated");
      } else {
        await fetch(`${apiBaseUrl}/admin/categories`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        });
        toast.success("Category created");
      }
      cache.remove("admin_categories");
      setCategoryDialogOpen(false);
      setTimeout(() => {
        setEditingItem(null);
      }, 100);
      loadData(true);
    } catch (error) {
      toast.error("Failed to save category");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteConfirm) return;
    setIsSubmitting(true);
    try {
      await fetch(`${apiBaseUrl}/admin/categories/${deleteConfirm.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      toast.success("Category deleted");
      cache.remove("admin_categories");
      setDeleteConfirm(null);
      loadData(true);
    } catch (error) {
      toast.error("Failed to delete category");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Class handlers
  const handleClassSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      category_id: parseInt(formData.get("category_id") as string),
      name: formData.get("name") as string,
      display_order: parseInt(formData.get("display_order") as string) || 0,
    };

    setIsSubmitting(true);
    try {
      if (editingItem) {
        await fetch(`${apiBaseUrl}/admin/classes/${editingItem.id}`, {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        });
        toast.success("Class updated");
      } else {
        await fetch(`${apiBaseUrl}/admin/classes`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        });
        toast.success("Class created");
      }
      cache.remove("admin_classes");
      setClassDialogOpen(false);
      setTimeout(() => {
        setEditingItem(null);
      }, 100);
      loadData(true);
    } catch (error) {
      toast.error("Failed to save class");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClass = async () => {
    if (!deleteConfirm) return;
    setIsSubmitting(true);
    try {
      await fetch(`${apiBaseUrl}/admin/classes/${deleteConfirm.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      toast.success("Class deleted");
      cache.remove("admin_classes");
      setDeleteConfirm(null);
      loadData(true);
    } catch (error) {
      toast.error("Failed to delete class");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Subject handlers
  const handleClassSubjectSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      class_id: parseInt(formData.get("class_id") as string),
      name: formData.get("name") as string,
      icon_name: formData.get("icon_name") as string || null,
      display_order: parseInt(formData.get("display_order") as string) || 0,
    };

    setIsSubmitting(true);
    try {
      if (editingItem) {
        await fetch(`${apiBaseUrl}/admin/subjects/${editingItem.id}`, {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        });
        toast.success("Subject updated");
      } else {
        await fetch(`${apiBaseUrl}/admin/subjects`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        });
        toast.success("Subject created");
      }
      cache.remove("admin_subjects");
      setSubjectDialogOpen(false);
      setTimeout(() => {
        setEditingItem(null);
      }, 100);
      loadData(true);
    } catch (error) {
      toast.error("Failed to save subject");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClassSubjectDelete = async () => {
    if (!deleteConfirm) return;
    setIsSubmitting(true);
    try {
      await fetch(`${apiBaseUrl}/admin/subjects/${deleteConfirm.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      toast.success("Subject deleted");
      cache.remove("admin_subjects");
      setDeleteConfirm(null);
      loadData(true);
    } catch (error) {
      toast.error("Failed to delete subject");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Material handlers
  const handleMaterialSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!materialSubjectId) {
      toast.error("Please select a subject");
      return;
    }

    const formData = new FormData(e.currentTarget);
    const materialTypeValue = materialType as "pyq" | "syllabus";

    const data: any = {
      subject_id: materialSubjectId,
      material_type: materialTypeValue,
      display_order: parseInt(formData.get("display_order") as string) || 0,
    };

    // Add fields based on material type
    if (materialTypeValue === "syllabus") {
      // Syllabus only needs download_url
      data.download_url = formData.get("download_url") as string || null;
      data.title = "Syllabus"; // Default title for syllabus
    } else if (materialTypeValue === "pyq") {
      // PYQ needs title, year, embed_url, download_url
      data.title = formData.get("title") as string;
      data.year = formData.get("year") as string || null;
      data.embed_url = formData.get("embed_url") as string || null;
      data.download_url = formData.get("download_url") as string || null;
    }

    setIsSubmitting(true);
    try {
      if (editingItem) {
        await fetch(`${apiBaseUrl}/admin/materials/${editingItem.id}`, {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        });
        toast.success("Material updated");
      } else {
        await fetch(`${apiBaseUrl}/admin/materials`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        });
        toast.success("Material created");
      }
      cache.remove("admin_materials");
      setMaterialDialogOpen(false);
      setTimeout(() => {
        setEditingItem(null);
        setMaterialType("");
        setMaterialClassFilterId(null);
        setMaterialSubjectId(null);
      }, 100);
      loadData(true);
    } catch (error) {
      toast.error("Failed to save material");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMaterial = async () => {
    if (!deleteConfirm) return;
    setIsSubmitting(true);
    try {
      await fetch(`${apiBaseUrl}/admin/materials/${deleteConfirm.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      toast.success("Material deleted");
      cache.remove("admin_materials");
      setDeleteConfirm(null);
      loadData(true);
    } catch (error) {
      toast.error("Failed to delete material");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Notification handlers
  const handleNotificationSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const linkUrl = formData.get("link_url") as string;
    const linkText = formData.get("link_text") as string;
    const data = {
      title: formData.get("title") as string,
      message: formData.get("message") as string,
      link_url: linkUrl && linkUrl.trim() ? linkUrl.trim() : null,
      link_text: linkText && linkText.trim() ? linkText.trim() : null,
      is_active: parseInt(notificationActive) || 1,
      priority: notificationPriority,
      display_order: parseInt(formData.get("display_order") as string) || 0,
    };

    try {
      const url = hasProp(editingItem, 'id')
        ? `${apiBaseUrl}/admin/notifications/${editingItem.id}`
        : `${apiBaseUrl}/admin/notifications`;

      const method = hasProp(editingItem, 'id') ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Unknown error" }));
        toast.error(errorData.detail || `Failed to ${editingItem ? "update" : "create"} notification`);
        return;
      }

      toast.success(`Notification ${hasProp(editingItem, 'id') ? "updated" : "created"}`);
      cache.remove("admin_notifications");
      setNotificationDialogOpen(false);
      setTimeout(() => {
        setEditingItem(null);
      }, 100);
      loadData(true);
    } catch (error) {
      console.error("Notification error:", error);
      toast.error("Failed to save notification. Please check console for details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNotification = async () => {
    if (!deleteConfirm) return;
    setIsSubmitting(true);
    try {
      await fetch(`${apiBaseUrl}/admin/notifications/${deleteConfirm.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      toast.success("Notification deleted");
      cache.remove("admin_notifications");
      setDeleteConfirm(null);
      loadData(true);
    } catch (error) {
      toast.error("Failed to delete notification");
    } finally {
      setIsSubmitting(false);
    }
  };

  // University handlers
  const handleUniversitySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      description: formData.get("description") as string || null,
      icon_name: formData.get("icon_name") as string || null,
      display_order: parseInt(formData.get("display_order") as string) || 0,
    };

    setIsSubmitting(true);
    try {
      if (editingItem) {
        await fetch(`${apiBaseUrl}/admin/universities/${editingItem.id}`, {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        });
        toast.success("University updated");
      } else {
        await fetch(`${apiBaseUrl}/admin/universities`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        });
        toast.success("University created");
      }
      cache.remove("admin_universities");
      setUniversityDialogOpen(false);
      setTimeout(() => {
        setEditingItem(null);
      }, 100);
      loadData(true);
    } catch (error) {
      toast.error("Failed to save university");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUniversity = async () => {
    if (!deleteConfirm) return;
    setIsSubmitting(true);
    try {
      await fetch(`${apiBaseUrl}/admin/universities/${deleteConfirm.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      toast.success("University deleted");
      cache.remove("admin_universities");
      setDeleteConfirm(null);
      loadData(true);
    } catch (error) {
      toast.error("Failed to delete university");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Degree handlers
  const fetchDegrees = async (universityId: number) => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/universities/${universityId}/degrees`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch degrees");
      const data = await res.json();
      setDegrees(data);
    } catch (error) {
      toast.error("Failed to load degrees");
    }
  };

  const handleDegreeSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedUniId) {
      toast.error("Please select a university first");
      return;
    }
    const formData = new FormData(e.currentTarget);
    const data = {
      university_id: selectedUniId,
      name: formData.get("name") as string,
      display_order: parseInt(formData.get("display_order") as string) || 0,
    };

    setIsSubmitting(true);
    try {
      if (editingItem) {
        await fetch(`${apiBaseUrl}/admin/degrees/${editingItem.id}`, {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        });
        toast.success("Degree updated");
      } else {
        await fetch(`${apiBaseUrl}/admin/degrees`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        });
        toast.success("Degree created");
      }
      setDegreeDialogOpen(false);
      setTimeout(() => setEditingItem(null), 100);
      if (selectedUniId) fetchDegrees(selectedUniId);
    } catch (error) {
      toast.error("Failed to save degree");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDegree = async () => {
    if (!deleteConfirm) return;
    setIsSubmitting(true);
    try {
      await fetch(`${apiBaseUrl}/admin/degrees/${deleteConfirm.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      toast.success("Degree deleted");
      setDeleteConfirm(null);
      if (selectedUniId) fetchDegrees(selectedUniId);
    } catch (error) {
      toast.error("Failed to delete degree");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Branch handlers
  const fetchBranches = async (degreeId: number) => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/degrees/${degreeId}/branches`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch branches");
      const data = await res.json();
      setBranches(data);
    } catch (error) {
      toast.error("Failed to load branches");
    }
  };

  const handleBranchSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedDegreeId) {
      toast.error("Please select a degree first");
      return;
    }
    const formData = new FormData(e.currentTarget);
    const data = {
      degree_id: selectedDegreeId,
      name: formData.get("name") as string,
      display_order: parseInt(formData.get("display_order") as string) || 0,
    };

    setIsSubmitting(true);
    try {
      if (editingItem) {
        await fetch(`${apiBaseUrl}/admin/branches/${editingItem.id}`, {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        });
        toast.success("Branch updated");
      } else {
        await fetch(`${apiBaseUrl}/admin/branches`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        });
        toast.success("Branch created");
      }
      setBranchDialogOpen(false);
      setTimeout(() => setEditingItem(null), 100);
      if (selectedDegreeId) fetchBranches(selectedDegreeId);
    } catch (error) {
      toast.error("Failed to save branch");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBranch = async () => {
    if (!deleteConfirm) return;
    setIsSubmitting(true);
    try {
      await fetch(`${apiBaseUrl}/admin/branches/${deleteConfirm.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      toast.success("Branch deleted");
      setDeleteConfirm(null);
      if (selectedDegreeId) fetchBranches(selectedDegreeId);
    } catch (error) {
      toast.error("Failed to delete branch");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Year handlers
  const fetchYears = async (branchId: number) => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/branches/${branchId}/years`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch years");
      const data = await res.json();
      setYears(data);
    } catch (error) {
      toast.error("Failed to load years");
    }
  };

  const handleYearSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedBranchId) {
      toast.error("Please select a branch first");
      return;
    }
    const formData = new FormData(e.currentTarget);
    const data = {
      branch_id: selectedBranchId,
      name: formData.get("name") as string,
      display_order: parseInt(formData.get("display_order") as string) || 0,
    };

    setIsSubmitting(true);
    try {
      if (editingItem) {
        await fetch(`${apiBaseUrl}/admin/years/${editingItem.id}`, {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        });
        toast.success("Year updated");
      } else {
        await fetch(`${apiBaseUrl}/admin/years`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        });
        toast.success("Year created");
      }
      setYearDialogOpen(false);
      setTimeout(() => setEditingItem(null), 100);
      if (selectedBranchId) fetchYears(selectedBranchId);
    } catch (error) {
      toast.error("Failed to save year");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteYear = async () => {
    if (!deleteConfirm) return;
    setIsSubmitting(true);
    try {
      await fetch(`${apiBaseUrl}/admin/years/${deleteConfirm.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      toast.success("Year deleted");
      setDeleteConfirm(null);
      if (selectedBranchId) fetchYears(selectedBranchId);
    } catch (error) {
      toast.error("Failed to delete year");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Semester handlers
  const fetchSemesters = async (yearId: number) => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/years/${yearId}/semesters`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch semesters");
      const data = await res.json();
      setSemesters(data);
    } catch (error) {
      toast.error("Failed to load semesters");
    }
  };

  const handleSemesterSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedYearId) {
      toast.error("Please select a year first");
      return;
    }
    const formData = new FormData(e.currentTarget);
    const data = {
      year_id: selectedYearId,
      name: formData.get("name") as string,
      display_order: parseInt(formData.get("display_order") as string) || 0,
    };

    setIsSubmitting(true);
    try {
      if (editingItem) {
        await fetch(`${apiBaseUrl}/admin/semesters/${editingItem.id}`, {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        });
        toast.success("Semester updated");
      } else {
        await fetch(`${apiBaseUrl}/admin/semesters`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        });
        toast.success("Semester created");
      }
      setSemesterDialogOpen(false);
      setTimeout(() => setEditingItem(null), 100);
      if (selectedYearId) fetchSemesters(selectedYearId);
    } catch (error) {
      toast.error("Failed to save semester");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSemester = async () => {
    if (!deleteConfirm) return;
    setIsSubmitting(true);
    try {
      await fetch(`${apiBaseUrl}/admin/semesters/${deleteConfirm.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      toast.success("Semester deleted");
      setDeleteConfirm(null);
      // Reload semesters for the current year
      if (selectedUniversity && selectedYear) {
        await loadSemestersForYear(selectedUniversity.id, selectedYear.id);
      }
    } catch (error) {
      toast.error("Failed to delete semester");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubjectSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedSemester) {
      toast.error("Please select a semester first");
      return;
    }
    const formData = new FormData(e.currentTarget);
    const data = {
      semester_id: selectedSemester.id,
      name: formData.get("name") as string,
      code: formData.get("code") as string,
      credits: parseInt(formData.get("credits") as string) || 0,
      description: formData.get("description") as string,
      display_order: parseInt(formData.get("display_order") as string) || 0,
    };

    setIsSubmitting(true);
    try {
      if (editingItem) {
        await fetch(`${apiBaseUrl}/admin/subjects/${editingItem.id}`, {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        });
        toast.success("Subject updated");
      } else {
        await fetch(`${apiBaseUrl}/admin/subjects`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        });
        toast.success("Subject created");
      }
      setSubjectDialogOpen(false);
      setTimeout(() => setEditingItem(null), 100);
      // Reload subjects
      if (selectedUniversity && selectedSemester) {
        await loadSubjectsForSemester(selectedUniversity.id, selectedSemester.id);
      }
    } catch (error) {
      toast.error("Failed to save subject");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubject = async () => {
    if (!deleteConfirm) return;
    setIsSubmitting(true);
    try {
      await fetch(`${apiBaseUrl}/admin/subjects/${deleteConfirm.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      toast.success("Subject deleted");
      setDeleteConfirm(null);
      // Reload subjects
      if (selectedUniversity && selectedSemester) {
        await loadSubjectsForSemester(selectedUniversity.id, selectedSemester.id);
      }
    } catch (error) {
      toast.error("Failed to delete subject");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Tree view helpers
  const loadDegreesForUniversity = async (uniId: number) => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/universities/${uniId}/degrees`, { headers: getAuthHeaders() });
      if (res.ok) {
        const degreesData = await res.json();
        setUniversityHierarchy(prev => {
          const newMap = new Map(prev);
          const existing = newMap.get(uniId);
          newMap.set(uniId, {
            degrees: degreesData,
            branches: existing?.branches || new Map(),
            years: existing?.years || new Map(),
            semesters: existing?.semesters || new Map(),
            subjects: existing?.subjects || new Map()
          });
          return newMap;
        });
      }
    } catch (error) {
      console.error("Error loading degrees:", error);
    }
  };

  const loadBranchesForDegree = async (uniId: number, degreeId: number) => {
    const hierarchy = universityHierarchy.get(uniId);
    if (!hierarchy) return;

    if (!hierarchy.branches.has(degreeId)) {
      try {
        const res = await fetch(`${apiBaseUrl}/api/degrees/${degreeId}/branches`, { headers: getAuthHeaders() });
        if (res.ok) {
          const branchesData = await res.json();
          hierarchy.branches.set(degreeId, branchesData);
          setUniversityHierarchy(new Map(universityHierarchy));
        }
      } catch (error) {
        console.error("Error loading branches:", error);
      }
    }
  };

  const loadYearsForBranch = async (uniId: number, branchId: number) => {
    const hierarchy = universityHierarchy.get(uniId);
    if (!hierarchy) return;

    if (!hierarchy.years.has(branchId)) {
      try {
        const res = await fetch(`${apiBaseUrl}/api/branches/${branchId}/years`, { headers: getAuthHeaders() });
        if (res.ok) {
          const yearsData = await res.json();
          hierarchy.years.set(branchId, yearsData);
          setUniversityHierarchy(new Map(universityHierarchy));
        }
      } catch (error) {
        console.error("Error loading years:", error);
      }
    }
  };

  const loadSemestersForYear = async (uniId: number, yearId: number) => {
    const hierarchy = universityHierarchy.get(uniId);
    if (!hierarchy) return;

    if (!hierarchy.semesters.has(yearId)) {
      try {
        const res = await fetch(`${apiBaseUrl}/api/years/${yearId}/semesters`, { headers: getAuthHeaders() });
        if (res.ok) {
          const semestersData = await res.json();
          hierarchy.semesters.set(yearId, semestersData);
          setUniversityHierarchy(new Map(universityHierarchy));
        }
      } catch (error) {
        console.error("Error loading semesters:", error);
      }
    }
  };

  const loadSubjectsForSemester = async (uniId: number, semesterId: number) => {
    const hierarchy = universityHierarchy.get(uniId);
    if (!hierarchy) return;

    if (!hierarchy.subjects.has(semesterId)) {
      try {
        const res = await fetch(`${apiBaseUrl}/api/semesters/${semesterId}/subjects`, { headers: getAuthHeaders() });
        if (res.ok) {
          const subjectsData = await res.json();
          hierarchy.subjects.set(semesterId, subjectsData);
          setUniversityHierarchy(new Map(universityHierarchy));
        }
      } catch (error) {
        console.error("Error loading subjects:", error);
      }
    }
  };

  const handleSelectUniversity = async (uni: University) => {
    setSelectedUniversity(uni);
    setViewLevel('degrees');
    // Load degrees if not already loaded
    if (!universityHierarchy.has(uni.id) || !universityHierarchy.get(uni.id)?.degrees.length) {
      await loadDegreesForUniversity(uni.id);
    }
  };

  const handleSelectDegree = async (degree: Degree) => {
    setSelectedDegree(degree);
    setViewLevel('branches');
    if (selectedUniversity) {
      await loadBranchesForDegree(selectedUniversity.id, degree.id);
    }
  };

  const handleSelectBranch = async (branch: Branch) => {
    setSelectedBranch(branch);
    setViewLevel('years');
    if (selectedUniversity) {
      await loadYearsForBranch(selectedUniversity.id, branch.id);
    }
  };

  const handleSelectYear = async (year: Year) => {
    setSelectedYear(year);
    setViewLevel('semesters');
    if (selectedUniversity) {
      await loadSemestersForYear(selectedUniversity.id, year.id);
    }
  };

  const handleSelectSemester = async (semester: Semester) => {
    setSelectedSemester(semester);
    setViewLevel('subjects');
    if (selectedUniversity) {
      await loadSubjectsForSemester(selectedUniversity.id, semester.id);
    }
  };

  const handleBack = () => {
    switch (viewLevel) {
      case 'degrees':
        setViewLevel('universities');
        setSelectedUniversity(null);
        break;
      case 'branches':
        setViewLevel('degrees');
        setSelectedDegree(null);
        break;
      case 'years':
        setViewLevel('branches');
        setSelectedBranch(null);
        break;
      case 'semesters':
        setViewLevel('years');
        setSelectedYear(null);
        break;
      case 'subjects':
        setViewLevel('semesters');
        setSelectedSemester(null);
        break;
        break;
    }
  };


  const filteredClasses = selectedCategoryId
    ? classes.filter((c) => c.category_id === selectedCategoryId)
    : classes;

  const filteredSubjects = selectedClassId
    ? subjects.filter((s) => s.class_id === selectedClassId)
    : subjects;

  const filteredMaterials = selectedSubjectId
    ? materials.filter((m) => m.subject_id === selectedSubjectId)
    : materials;

  // Filter subjects by class for material selection
  const filteredSubjectsForMaterial = materialClassFilterId
    ? subjects.filter((s) => s.class_id === materialClassFilterId)
    : subjects;

  if (!user || user.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <Header showAuth={false} showStudentActions onLogout={() => { clearUser(); navigate("/login"); }} />

      <main className="max-w-7xl mx-auto px-6 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Admin Panel</CardTitle>
            <CardDescription>Manage categories, classes, subjects, and materials</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="categories" className="w-full">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="categories">Categories</TabsTrigger>
                <TabsTrigger value="classes">Classes</TabsTrigger>
                <TabsTrigger value="subjects">Subjects</TabsTrigger>
                <TabsTrigger value="materials">Materials</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
                <TabsTrigger value="universities">Universities</TabsTrigger>
              </TabsList>

              {/* Categories Tab */}
              <TabsContent value="categories" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Categories ({categories.length})</h3>
                  <Dialog
                    open={categoryDialogOpen}
                    onOpenChange={(open) => {
                      setCategoryDialogOpen(open);
                      if (!open) {
                        setTimeout(() => setEditingItem(null), 200);
                      }
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button onClick={() => {
                        setEditingItem(null);
                      }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Category
                      </Button>
                    </DialogTrigger>
                    <DialogContent key={hasProp(editingItem, 'id') ? `cat-dialog-${(editingItem as any).id}` : "cat-dialog-new"}>
                      <DialogHeader>
                        <DialogTitle>{editingItem ? "Edit" : "Create"} Category</DialogTitle>
                      </DialogHeader>
                      <form key={hasProp(editingItem, 'id') ? `cat-form-${(editingItem as any).id}` : "cat-form-new"} onSubmit={handleCategorySubmit} className="space-y-4">
                        <div>
                          <Label htmlFor="cat-title">Title *</Label>
                          <Input
                            id="cat-title"
                            name="title"
                            required
                            defaultValue={hasProp(editingItem, 'title') ? (editingItem as Category).title : ""}
                          />
                        </div>
                        <div>
                          <Label htmlFor="cat-description">Description</Label>
                          <Textarea
                            id="cat-description"
                            name="description"
                            defaultValue={hasProp(editingItem, 'description') ? (editingItem as Category).description || "" : ""}
                          />
                        </div>
                        <div>
                          <Label htmlFor="cat-icon">Icon Name</Label>
                          <Input
                            id="cat-icon"
                            name="icon_name"
                            placeholder="e.g., School, BookOpen"
                            defaultValue={hasProp(editingItem, 'icon_name') ? (editingItem as Category).icon_name || "" : ""}
                          />
                        </div>
                        <div>
                          <Label htmlFor="cat-order">Display Order</Label>
                          <Input
                            id="cat-order"
                            name="display_order"
                            type="number"
                            defaultValue={hasProp(editingItem, 'display_order') ? (editingItem as Category).display_order : 0}
                          />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button type="button" variant="outline" onClick={() => setCategoryDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                            Save
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="space-y-2">
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <Card key={i}>
                        <CardContent className="flex items-center justify-between p-4">
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-48" />
                            <Skeleton className="h-3 w-32" />
                            <Skeleton className="h-3 w-16" />
                          </div>
                          <div className="flex gap-2">
                            <Skeleton className="h-8 w-8" />
                            <Skeleton className="h-8 w-8" />
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    categories.map((cat) => (
                      <Card key={cat.id}>
                        <CardContent className="flex items-center justify-between p-4">
                          <div>
                            <h4 className="font-semibold">{cat.title}</h4>
                            <p className="text-sm text-muted-foreground">{cat.description || "No description"}</p>
                            <p className="text-xs text-muted-foreground">Order: {cat.display_order}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingItem(cat);
                                setTimeout(() => {
                                  setCategoryDialogOpen(true);
                                }, 0);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setDeleteConfirm({ type: "category", id: cat.id })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* Classes Tab */}
              <TabsContent value="classes" className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex gap-4 items-center">
                    <h3 className="text-lg font-semibold">Classes ({filteredClasses.length})</h3>
                    <Select value={selectedCategoryId?.toString() || "all"} onValueChange={(v) => setSelectedCategoryId(v === "all" ? null : parseInt(v))}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter by category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id.toString()}>
                            {cat.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Dialog
                    open={classDialogOpen}
                    onOpenChange={(open) => {
                      setClassDialogOpen(open);
                      if (!open) setEditingItem(null);
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button onClick={() => setEditingItem(null)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Class
                      </Button>
                    </DialogTrigger>
                    <DialogContent key={editingItem && 'id' in editingItem ? `class-dialog-${editingItem.id}` : "class-dialog-new"}>
                      <DialogHeader>
                        <DialogTitle>{editingItem ? "Edit" : "Create"} Class</DialogTitle>
                      </DialogHeader>
                      <form key={editingItem && 'id' in editingItem ? `class-form-${editingItem.id}` : "class-form-new"} onSubmit={handleClassSubmit} className="space-y-4">
                        <div>
                          <Label htmlFor="class-category">Category *</Label>
                          <Select
                            key={editingItem && 'id' in editingItem ? `class-cat-${editingItem.id}` : "class-cat-new"}
                            name="category_id"
                            required
                            defaultValue={editingItem && 'category_id' in editingItem ? (editingItem as Class).category_id.toString() : ""}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id.toString()}>
                                  {cat.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="class-name">Name *</Label>
                          <Input id="class-name" name="name" required defaultValue={editingItem && 'name' in editingItem ? (editingItem as Class).name : ""} />
                        </div>
                        <div>
                          <Label htmlFor="class-order">Display Order</Label>
                          <Input id="class-order" name="display_order" type="number" defaultValue={editingItem && 'display_order' in editingItem ? (editingItem as Class).display_order : 0} />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button type="button" variant="outline" onClick={() => setClassDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                            Save
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="space-y-2">
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <Card key={i}>
                        <CardContent className="flex items-center justify-between p-4">
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-48" />
                            <Skeleton className="h-3 w-32" />
                            <Skeleton className="h-3 w-16" />
                          </div>
                          <div className="flex gap-2">
                            <Skeleton className="h-8 w-8" />
                            <Skeleton className="h-8 w-8" />
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    filteredClasses.map((cls) => (
                      <Card key={cls.id}>
                        <CardContent className="flex items-center justify-between p-4">
                          <div>
                            <h4 className="font-semibold">{cls.name}</h4>
                            <p className="text-xs text-muted-foreground">
                              Category: {categories.find((c) => c.id === cls.category_id)?.title || "Unknown"}
                            </p>
                            <p className="text-xs text-muted-foreground">Order: {cls.display_order}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingItem(cls);
                                setTimeout(() => {
                                  setClassDialogOpen(true);
                                }, 0);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setDeleteConfirm({ type: "class", id: cls.id })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* Subjects Tab */}
              <TabsContent value="subjects" className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex gap-4 items-center">
                    <h3 className="text-lg font-semibold">Subjects ({filteredSubjects.length})</h3>
                    <Select value={selectedClassId?.toString() || "all"} onValueChange={(v) => setSelectedClassId(v === "all" ? null : parseInt(v))}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter by class" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Classes</SelectItem>
                        {classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id.toString()}>
                            {cls.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Dialog
                    open={subjectDialogOpen}
                    onOpenChange={(open) => {
                      setSubjectDialogOpen(open);
                      if (!open) setEditingItem(null);
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button onClick={() => setEditingItem(null)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Subject
                      </Button>
                    </DialogTrigger>
                    <DialogContent key={editingItem && 'id' in editingItem ? `subject-dialog-${editingItem.id}` : "subject-dialog-new"}>
                      <DialogHeader>
                        <DialogTitle>{editingItem ? "Edit" : "Create"} Subject</DialogTitle>
                      </DialogHeader>
                      <form key={editingItem && 'id' in editingItem ? `subject-form-${editingItem.id}` : "subject-form-new"} onSubmit={handleClassSubjectSubmit} className="space-y-4">
                        <div>
                          <Label htmlFor="subject-class">Class *</Label>
                          <Select
                            key={editingItem && 'id' in editingItem ? `subject-class-${editingItem.id}` : "subject-class-new"}
                            name="class_id"
                            required
                            defaultValue={editingItem && 'class_id' in editingItem ? (editingItem as Subject).class_id.toString() : ""}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select class" />
                            </SelectTrigger>
                            <SelectContent>
                              {classes.map((cls) => (
                                <SelectItem key={cls.id} value={cls.id.toString()}>
                                  {cls.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="subject-name">Name *</Label>
                          <Input id="subject-name" name="name" required defaultValue={editingItem && 'name' in editingItem ? (editingItem as Subject).name : ""} />
                        </div>
                        <div>
                          <Label htmlFor="subject-icon">Icon Name</Label>
                          <Input id="subject-icon" name="icon_name" placeholder="e.g., Calculator, Book" defaultValue={editingItem && 'icon_name' in editingItem ? (editingItem as Subject).icon_name || "" : ""} />
                        </div>
                        <div>
                          <Label htmlFor="subject-order">Display Order</Label>
                          <Input id="subject-order" name="display_order" type="number" defaultValue={editingItem && 'display_order' in editingItem ? (editingItem as Subject).display_order : 0} />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button type="button" variant="outline" onClick={() => setSubjectDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                            Save
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="space-y-2">
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <Card key={i}>
                        <CardContent className="flex items-center justify-between p-4">
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-48" />
                            <Skeleton className="h-3 w-32" />
                            <Skeleton className="h-3 w-16" />
                          </div>
                          <div className="flex gap-2">
                            <Skeleton className="h-8 w-8" />
                            <Skeleton className="h-8 w-8" />
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    filteredSubjects.map((subj) => (
                      <Card key={subj.id}>
                        <CardContent className="flex items-center justify-between p-4">
                          <div>
                            <h4 className="font-semibold">{subj.name}</h4>
                            <p className="text-xs text-muted-foreground">
                              Class: {classes.find((c) => c.id === subj.class_id)?.name || "Unknown"}
                            </p>
                            <p className="text-xs text-muted-foreground">Order: {subj.display_order}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingItem(subj);
                                setTimeout(() => {
                                  setSubjectDialogOpen(true);
                                }, 0);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setDeleteConfirm({ type: "class_subject", id: subj.id })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* Materials Tab */}
              <TabsContent value="materials" className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex gap-4 items-center">
                    <h3 className="text-lg font-semibold">Materials ({filteredMaterials.length})</h3>
                    <Select value={materialClassFilterId?.toString() || "all"} onValueChange={(v) => {
                      setMaterialClassFilterId(v === "all" ? null : parseInt(v));
                      setSelectedSubjectId(null); // Reset subject filter when class changes
                    }}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter by class" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Classes</SelectItem>
                        {classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id.toString()}>
                            {cls.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={selectedSubjectId?.toString() || "all"}
                      onValueChange={(v) => setSelectedSubjectId(v === "all" ? null : parseInt(v))}
                      disabled={!materialClassFilterId}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder={materialClassFilterId ? "Filter by subject" : "Select class first"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Subjects</SelectItem>
                        {filteredSubjectsForMaterial.map((subj) => (
                          <SelectItem key={subj.id} value={subj.id.toString()}>
                            {subj.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Dialog
                    open={materialDialogOpen}
                    onOpenChange={(open) => {
                      setMaterialDialogOpen(open);
                      if (!open) {
                        setEditingItem(null);
                        setMaterialType("");
                        setMaterialClassFilterId(null);
                        setMaterialSubjectId(null);
                      } else if (editingItem) {
                        // Set material type and class filter when editing
                        const material = editingItem as Material;
                        setMaterialType(material.material_type);
                        setMaterialSubjectId(material.subject_id);
                        const subject = subjects.find(s => s.id === material.subject_id);
                        if (subject) {
                          setMaterialClassFilterId(subject.class_id);
                        }
                      }
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button onClick={() => {
                        setEditingItem(null);
                        setMaterialType("");
                        setMaterialClassFilterId(null);
                        setMaterialSubjectId(null);
                      }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Material
                      </Button>
                    </DialogTrigger>
                    <DialogContent key={editingItem && 'id' in editingItem ? `material-dialog-${editingItem.id}` : "material-dialog-new"} className="max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>{editingItem ? "Edit" : "Create"} Material</DialogTitle>
                      </DialogHeader>
                      <form key={editingItem && 'id' in editingItem ? `material-form-${editingItem.id}` : "material-form-new"} onSubmit={handleMaterialSubmit} className="space-y-4">
                        <div>
                          <Label htmlFor="material-type">Material Type *</Label>
                          <Select
                            key={editingItem && 'id' in editingItem ? `mat-type-${editingItem.id}` : "mat-type-new"}
                            name="material_type"
                            required
                            value={materialType}
                            onValueChange={(value) => {
                              setMaterialType(value as "pyq" | "syllabus");
                              // Reset subject and class when type changes
                              if (!editingItem) {
                                setMaterialClassFilterId(null);
                                setMaterialSubjectId(null);
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pyq">PYQ (Previous Year Questions)</SelectItem>
                              <SelectItem value="syllabus">Syllabus</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {materialType && (
                          <>
                            <div>
                              <Label htmlFor="material-class">Class *</Label>
                              <Select
                                key={editingItem ? `mat-class-${editingItem.id}-${materialClassFilterId}` : `mat-class-new-${materialClassFilterId || ""}`}
                                name="class_filter"
                                required={false}
                                value={materialClassFilterId?.toString() || ""}
                                onValueChange={(value) => {
                                  setMaterialClassFilterId(parseInt(value));
                                  // Reset subject selection when class changes
                                  setMaterialSubjectId(null);
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select class" />
                                </SelectTrigger>
                                <SelectContent>
                                  {classes.map((cls) => (
                                    <SelectItem key={cls.id} value={cls.id.toString()}>
                                      {cls.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <Label htmlFor="material-subject">Subject *</Label>
                              <Select
                                key={editingItem ? `mat-subject-${editingItem.id}-${materialSubjectId}` : `mat-subject-new-${materialSubjectId || ""}`}
                                required
                                value={materialSubjectId?.toString() || ""}
                                onValueChange={(value) => {
                                  setMaterialSubjectId(parseInt(value));
                                }}
                                disabled={!materialClassFilterId || filteredSubjectsForMaterial.length === 0}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={materialClassFilterId ? (filteredSubjectsForMaterial.length > 0 ? "Select subject" : "No subjects in this class") : "Select class first"} />
                                </SelectTrigger>
                                <SelectContent>
                                  {filteredSubjectsForMaterial.length > 0 ? (
                                    filteredSubjectsForMaterial.map((subj) => (
                                      <SelectItem key={subj.id} value={subj.id.toString()}>
                                        {subj.name}
                                      </SelectItem>
                                    ))
                                  ) : materialClassFilterId ? (
                                    <SelectItem value="__no_subjects" disabled>No subjects in this class</SelectItem>
                                  ) : (
                                    <SelectItem value="__select_class_first" disabled>Select a class first</SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                            </div>

                            {materialType === "pyq" && (
                              <>
                                <div>
                                  <Label htmlFor="material-title">Title *</Label>
                                  <Input
                                    key={editingItem && 'id' in editingItem ? `title-${editingItem.id}` : "title-new"}
                                    id="material-title"
                                    name="title"
                                    required
                                    defaultValue={editingItem && 'title' in editingItem ? (editingItem as Material).title : ""}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="material-year">Year</Label>
                                  <Input
                                    key={editingItem && 'id' in editingItem ? `year-${editingItem.id}` : "year-new"}
                                    id="material-year"
                                    name="year"
                                    placeholder="e.g., 2023"
                                    defaultValue={editingItem && 'year' in editingItem ? (editingItem as Material).year || "" : ""}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="material-embed">Embed URL</Label>
                                  <Textarea
                                    key={editingItem && 'id' in editingItem ? `embed-${editingItem.id}` : "embed-new"}
                                    id="material-embed"
                                    name="embed_url"
                                    placeholder="Google Drive embed URL"
                                    defaultValue={editingItem && 'embed_url' in editingItem ? (editingItem as Material).embed_url || "" : ""}
                                  />
                                </div>
                              </>
                            )}

                            <div>
                              <Label htmlFor="material-download">Download URL {materialType === "syllabus" && "*"}</Label>
                              <Textarea
                                key={editingItem && 'id' in editingItem ? `download-${editingItem.id}` : "download-new"}
                                id="material-download"
                                name="download_url"
                                placeholder="Download link"
                                required={materialType === "syllabus"}
                                defaultValue={editingItem && 'download_url' in editingItem ? (editingItem as Material).download_url || "" : ""}
                              />
                            </div>

                            <div>
                              <Label htmlFor="material-order">Display Order</Label>
                              <Input
                                key={editingItem && 'id' in editingItem ? `order-${editingItem.id}` : "order-new"}
                                id="material-order"
                                name="display_order"
                                type="number"
                                defaultValue={editingItem && 'display_order' in editingItem ? (editingItem as Material).display_order : 0}
                              />
                            </div>
                          </>
                        )}

                        <div className="flex gap-2 justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setMaterialDialogOpen(false);
                              setEditingItem(null);
                              setMaterialType("");
                              setMaterialClassFilterId(null);
                              setMaterialSubjectId(null);
                            }}
                          >
                            Cancel
                          </Button>
                          <Button type="submit" disabled={!materialType || !materialSubjectId}>
                            <Save className="h-4 w-4 mr-2" />
                            Save
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="space-y-2">
                  {filteredMaterials.map((mat) => (
                    <Card key={mat.id}>
                      <CardContent className="flex items-center justify-between p-4">
                        <div>
                          <h4 className="font-semibold">{mat.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            Type: {mat.material_type.toUpperCase()} | Year: {mat.year || "N/A"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Subject: {subjects.find((s) => s.id === mat.subject_id)?.name || "Unknown"}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingItem(mat);
                              setTimeout(() => {
                                setMaterialDialogOpen(true);
                              }, 0);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setDeleteConfirm({ type: "material", id: mat.id })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Notifications Tab */}
              <TabsContent value="notifications" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Notifications ({notifications.length})</h3>
                  <Dialog
                    open={notificationDialogOpen}
                    onOpenChange={(open) => {
                      setNotificationDialogOpen(open);
                      if (!open) {
                        setTimeout(() => {
                          setEditingItem(null);
                          setNotificationPriority("info");
                          setNotificationActive("1");
                        }, 200);
                      }
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button onClick={() => {
                        setEditingItem(null);
                        setNotificationPriority("info");
                        setNotificationActive("1");
                      }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Notification
                      </Button>
                    </DialogTrigger>
                    <DialogContent key={editingItem && 'id' in editingItem ? `notif-dialog-${editingItem.id}` : "notif-dialog-new"} className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>{editingItem ? "Edit" : "Create"} Notification</DialogTitle>
                      </DialogHeader>
                      <form key={editingItem && 'id' in editingItem ? `notif-form-${editingItem.id}` : "notif-form-new"} onSubmit={handleNotificationSubmit} className="space-y-4">
                        <div>
                          <Label htmlFor="notif-title">Title *</Label>
                          <Input
                            id="notif-title"
                            name="title"
                            required
                            defaultValue={editingItem && 'title' in editingItem ? (editingItem as Notification).title : ""}
                          />
                        </div>
                        <div>
                          <Label htmlFor="notif-message">Message *</Label>
                          <Textarea
                            id="notif-message"
                            name="message"
                            required
                            rows={4}
                            defaultValue={editingItem && 'message' in editingItem ? (editingItem as Notification).message : ""}
                          />
                        </div>
                        <div>
                          <Label htmlFor="notif-link-url">Link URL (Optional)</Label>
                          <Input
                            id="notif-link-url"
                            name="link_url"
                            type="url"
                            placeholder="https://example.com or /relative/path"
                            defaultValue={editingItem && 'link_url' in editingItem ? (editingItem as Notification).link_url || "" : ""}
                          />
                          <p className="text-xs text-muted-foreground mt-1">Add a URL to make this notification clickable</p>
                        </div>
                        <div>
                          <Label htmlFor="notif-link-text">Link Button Text (Optional)</Label>
                          <Input
                            id="notif-link-text"
                            name="link_text"
                            placeholder="e.g., Learn More, View Details, Download"
                            defaultValue={editingItem && 'link_text' in editingItem ? (editingItem as Notification).link_text || "" : ""}
                          />
                          <p className="text-xs text-muted-foreground mt-1">Text for the action button (default: "Learn More")</p>
                        </div>
                        <div>
                          <Label htmlFor="notif-priority">Priority</Label>
                          <Select
                            value={notificationPriority}
                            onValueChange={(value) => setNotificationPriority(value as "info" | "warning" | "urgent")}
                            key={editingItem && 'id' in editingItem ? `notif-priority-${editingItem.id}` : "notif-priority-new"}
                          >
                            <SelectTrigger id="notif-priority">
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="info">Info</SelectItem>
                              <SelectItem value="warning">Warning</SelectItem>
                              <SelectItem value="urgent">Urgent</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="notif-active">Status</Label>
                          <Select
                            value={notificationActive}
                            onValueChange={(value) => setNotificationActive(value)}
                            key={editingItem && 'id' in editingItem ? `notif-active-${editingItem.id}` : "notif-active-new"}
                          >
                            <SelectTrigger id="notif-active">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">Active</SelectItem>
                              <SelectItem value="0">Inactive</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="notif-order">Display Order</Label>
                          <Input
                            id="notif-order"
                            name="display_order"
                            type="number"
                            defaultValue={editingItem && 'display_order' in editingItem ? (editingItem as Notification).display_order : 0}
                          />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button type="button" variant="outline" onClick={() => setNotificationDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit">
                            <Save className="h-4 w-4 mr-2" />
                            Save
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="space-y-2">
                  {notifications.map((notif) => (
                    <Card key={notif.id}>
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Bell className={`h-4 w-4 ${notif.priority === "urgent" ? "text-red-500" :
                              notif.priority === "warning" ? "text-yellow-500" :
                                "text-blue-500"
                              }`} />
                            <h4 className="font-semibold">{notif.title}</h4>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${notif.is_active === 1
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                              }`}>
                              {notif.is_active === 1 ? "Active" : "Inactive"}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${notif.priority === "urgent" ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" :
                              notif.priority === "warning" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" :
                                "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                              }`}>
                              {notif.priority.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{notif.message}</p>
                          {notif.link_url && (
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
                              🔗 {notif.link_text || "Learn More"} → {notif.link_url.length > 50 ? notif.link_url.substring(0, 50) + "..." : notif.link_url}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">Order: {notif.display_order}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingItem(notif);
                              setNotificationPriority(notif.priority);
                              setNotificationActive(notif.is_active.toString());
                              setTimeout(() => {
                                setNotificationDialogOpen(true);
                              }, 0);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setDeleteConfirm({ type: "notification", id: notif.id })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {notifications.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No notifications yet. Create one to get started!</p>
                  )}
                </div>
              </TabsContent>

              {/* Universities Tab */}
              <TabsContent value="universities" className="space-y-4">
                {/* Breadcrumb Navigation */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 bg-muted/30 p-2 rounded-md">
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { setViewLevel('universities'); setSelectedUniversity(null); setSelectedDegree(null); setSelectedBranch(null); setSelectedYear(null); }}>
                    <Home className="h-4 w-4" />
                  </Button>

                  {selectedUniversity && (
                    <>
                      <ChevronRight className="h-4 w-4" />
                      <button
                        className={`hover:text-primary hover:underline ${viewLevel === 'universities' ? 'font-semibold text-foreground' : ''}`}
                        onClick={() => { setViewLevel('universities'); setSelectedDegree(null); setSelectedBranch(null); setSelectedYear(null); }}
                      >
                        {selectedUniversity.name}
                      </button>
                    </>
                  )}

                  {selectedDegree && (
                    <>
                      <ChevronRight className="h-4 w-4" />
                      <button
                        className={`hover:text-primary hover:underline ${viewLevel === 'degrees' ? 'font-semibold text-foreground' : ''}`}
                        onClick={() => { setViewLevel('degrees'); setSelectedBranch(null); setSelectedYear(null); }}
                      >
                        {selectedDegree.name}
                      </button>
                    </>
                  )}

                  {selectedBranch && (
                    <>
                      <ChevronRight className="h-4 w-4" />
                      <button
                        className={`hover:text-primary hover:underline ${viewLevel === 'branches' ? 'font-semibold text-foreground' : ''}`}
                        onClick={() => { setViewLevel('branches'); setSelectedYear(null); }}
                      >
                        {selectedBranch.name}
                      </button>
                    </>
                  )}

                  {selectedYear && (
                    <>
                      <ChevronRight className="h-4 w-4" />
                      <button
                        className={`hover:text-primary hover:underline ${viewLevel === 'years' ? 'font-semibold text-foreground' : ''}`}
                        onClick={() => setViewLevel('years')}
                      >
                        {selectedYear.name}
                      </button>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-250px)]">
                  {/* Left Panel - Master List */}
                  <Card className="lg:col-span-1 flex flex-col overflow-hidden">
                    <CardHeader className="py-3 px-4 border-b bg-muted/20 flex flex-row items-center justify-between shrink-0">
                      <CardTitle className="text-base font-medium">
                        {viewLevel === 'universities' && 'Universities'}
                        {viewLevel === 'degrees' && 'Degrees'}
                        {viewLevel === 'branches' && 'Courses'}
                        {viewLevel === 'years' && 'Years'}
                        {viewLevel === 'semesters' && 'Semesters'}
                      </CardTitle>

                      {/* Add Button & Dialogs */}
                      {viewLevel === 'universities' && (
                        <Dialog open={universityDialogOpen} onOpenChange={(open) => { setUniversityDialogOpen(open); if (!open) setTimeout(() => setEditingItem(null), 200); }}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => setEditingItem(null)}>
                              <Plus className="h-3.5 w-3.5 mr-1" /> Add
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>{editingItem ? "Edit" : "Create"} University</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleUniversitySubmit} className="space-y-4">
                              <div>
                                <Label htmlFor="uni-name">Name *</Label>
                                <Input id="uni-name" name="name" required defaultValue={hasProp(editingItem, 'name') ? (editingItem as University).name : ""} />
                              </div>
                              <div>
                                <Label htmlFor="uni-description">Description</Label>
                                <Textarea id="uni-description" name="description" defaultValue={hasProp(editingItem, 'description') ? (editingItem as University).description || "" : ""} />
                              </div>
                              <div>
                                <Label htmlFor="uni-icon">Icon Name</Label>
                                <Input id="uni-icon" name="icon_name" placeholder="e.g., School, BookOpen" defaultValue={hasProp(editingItem, 'icon_name') ? (editingItem as University).icon_name || "" : ""} />
                              </div>
                              <div>
                                <Label htmlFor="uni-order">Display Order</Label>
                                <Input id="uni-order" name="display_order" type="number" defaultValue={hasProp(editingItem, 'display_order') ? (editingItem as University).display_order : 0} />
                              </div>
                              <div className="flex gap-2 justify-end">
                                <Button type="button" variant="outline" onClick={() => setUniversityDialogOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={isSubmitting}>
                                  {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Save
                                </Button>
                              </div>
                            </form>
                          </DialogContent>
                        </Dialog>
                      )}

                      {viewLevel === 'degrees' && (
                        <Dialog open={degreeDialogOpen} onOpenChange={(open) => { setDegreeDialogOpen(open); if (!open) setTimeout(() => setEditingItem(null), 200); }}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => { setSelectedUniId(selectedUniversity!.id); setEditingItem(null); }}>
                              <Plus className="h-3.5 w-3.5 mr-1" /> Add
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>{editingItem ? "Edit" : "Create"} Degree</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleDegreeSubmit} className="space-y-4">
                              <div>
                                <Label htmlFor="degree-name">Name *</Label>
                                <Input id="degree-name" name="name" required defaultValue={hasProp(editingItem, 'name') ? (editingItem as Degree).name : ""} />
                              </div>
                              <div>
                                <Label htmlFor="degree-order">Display Order</Label>
                                <Input id="degree-order" name="display_order" type="number" defaultValue={hasProp(editingItem, 'display_order') ? (editingItem as Degree).display_order : 0} />
                              </div>
                              <div className="flex gap-2 justify-end">
                                <Button type="button" variant="outline" onClick={() => setDegreeDialogOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={isSubmitting}>
                                  {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Save
                                </Button>
                              </div>
                            </form>
                          </DialogContent>
                        </Dialog>
                      )}

                      {viewLevel === 'branches' && (
                        <Dialog open={branchDialogOpen} onOpenChange={(open) => { setBranchDialogOpen(open); if (!open) setTimeout(() => setEditingItem(null), 200); }}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => { setSelectedDegreeId(selectedDegree!.id); setEditingItem(null); }}>
                              <Plus className="h-3.5 w-3.5 mr-1" /> Add
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>{editingItem ? "Edit" : "Create"} Course</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleBranchSubmit} className="space-y-4">
                              <div>
                                <Label htmlFor="branch-name">Name *</Label>
                                <Input id="branch-name" name="name" required defaultValue={hasProp(editingItem, 'name') ? (editingItem as Branch).name : ""} />
                              </div>
                              <div>
                                <Label htmlFor="branch-order">Display Order</Label>
                                <Input id="branch-order" name="display_order" type="number" defaultValue={hasProp(editingItem, 'display_order') ? (editingItem as Branch).display_order : 0} />
                              </div>
                              <div className="flex gap-2 justify-end">
                                <Button type="button" variant="outline" onClick={() => setBranchDialogOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={isSubmitting}>
                                  {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Save
                                </Button>
                              </div>
                            </form>
                          </DialogContent>
                        </Dialog>
                      )}

                      {viewLevel === 'years' && (
                        <Dialog open={yearDialogOpen} onOpenChange={(open) => { setYearDialogOpen(open); if (!open) setTimeout(() => setEditingItem(null), 200); }}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => { setSelectedBranchId(selectedBranch!.id); setEditingItem(null); }}>
                              <Plus className="h-3.5 w-3.5 mr-1" /> Add
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>{editingItem ? "Edit" : "Create"} Year</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleYearSubmit} className="space-y-4">
                              <div>
                                <Label htmlFor="year-name">Name *</Label>
                                <Input id="year-name" name="name" required defaultValue={hasProp(editingItem, 'name') ? (editingItem as Year).name : ""} />
                              </div>
                              <div>
                                <Label htmlFor="year-order">Display Order</Label>
                                <Input id="year-order" name="display_order" type="number" defaultValue={hasProp(editingItem, 'display_order') ? (editingItem as Year).display_order : 0} />
                              </div>
                              <div className="flex gap-2 justify-end">
                                <Button type="button" variant="outline" onClick={() => setYearDialogOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={isSubmitting}>
                                  {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Save
                                </Button>
                              </div>
                            </form>
                          </DialogContent>
                        </Dialog>
                      )}

                      {viewLevel === 'semesters' && (
                        <Dialog open={semesterDialogOpen} onOpenChange={(open) => { setSemesterDialogOpen(open); if (!open) setTimeout(() => setEditingItem(null), 200); }}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => { setSelectedYearId(selectedYear!.id); setEditingItem(null); }}>
                              <Plus className="h-3.5 w-3.5 mr-1" /> Add
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>{editingItem ? "Edit" : "Create"} Semester</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSemesterSubmit} className="space-y-4">
                              <div>
                                <Label htmlFor="semester-name">Name *</Label>
                                <Input id="semester-name" name="name" required defaultValue={hasProp(editingItem, 'name') ? (editingItem as Semester).name : ""} />
                              </div>
                              <div>
                                <Label htmlFor="semester-order">Display Order</Label>
                                <Input id="semester-order" name="display_order" type="number" defaultValue={hasProp(editingItem, 'display_order') ? (editingItem as Semester).display_order : 0} />
                              </div>
                              <div className="flex gap-2 justify-end">
                                <Button type="button" variant="outline" onClick={() => setSemesterDialogOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={isSubmitting}>
                                  {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Save
                                </Button>
                              </div>
                            </form>
                          </DialogContent>
                        </Dialog>
                      )}

                      {viewLevel === 'subjects' && (
                        <Dialog open={subjectDialogOpen} onOpenChange={(open) => { setSubjectDialogOpen(open); if (!open) setTimeout(() => setEditingItem(null), 200); }}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => { setEditingItem(null); }}>
                              <Plus className="h-3.5 w-3.5 mr-1" /> Add
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>{editingItem ? "Edit" : "Create"} Subject</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubjectSubmit} className="space-y-4">
                              <div>
                                <Label htmlFor="subject-name">Name *</Label>
                                <Input id="subject-name" name="name" required defaultValue={hasProp(editingItem, 'name') ? (editingItem as Subject).name : ""} />
                              </div>
                              <div>
                                <Label htmlFor="subject-code">Code</Label>
                                <Input id="subject-code" name="code" placeholder="e.g. CS101" defaultValue={hasProp(editingItem, 'code') ? (editingItem as Subject).code : ""} />
                              </div>
                              <div>
                                <Label htmlFor="subject-credits">Credits</Label>
                                <Input id="subject-credits" name="credits" type="number" defaultValue={hasProp(editingItem, 'credits') ? (editingItem as Subject).credits : 0} />
                              </div>
                              <div>
                                <Label htmlFor="subject-description">Description</Label>
                                <Textarea id="subject-description" name="description" defaultValue={hasProp(editingItem, 'description') ? (editingItem as Subject).description || "" : ""} />
                              </div>
                              <div>
                                <Label htmlFor="subject-order">Display Order</Label>
                                <Input id="subject-order" name="display_order" type="number" defaultValue={hasProp(editingItem, 'display_order') ? (editingItem as Subject).display_order : 0} />
                              </div>
                              <div className="flex gap-2 justify-end">
                                <Button type="button" variant="outline" onClick={() => setSubjectDialogOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={isSubmitting}>
                                  {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Save
                                </Button>
                              </div>
                            </form>
                          </DialogContent>
                        </Dialog>
                      )}

                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto p-2 space-y-1">
                      {viewLevel === 'universities' && universities.map(uni => (
                        <div key={uni.id}
                          className={`p-3 rounded-md cursor-pointer transition-all flex items-center justify-between group ${selectedUniversity?.id === uni.id ? 'bg-primary/10 border-primary/20 border shadow-sm' : 'hover:bg-muted border border-transparent'}`}
                          onClick={() => handleSelectUniversity(uni)}>
                          <div className="flex items-center gap-3">
                            <School className={`h-4 w-4 ${selectedUniversity?.id === uni.id ? 'text-primary' : 'text-muted-foreground'}`} />
                            <span className="font-medium text-sm">{uni.name}</span>
                          </div>
                          {selectedUniversity?.id === uni.id && <ChevronRight className="h-4 w-4 text-primary" />}
                        </div>
                      ))}

                      {viewLevel === 'degrees' && selectedUniversity && universityHierarchy.get(selectedUniversity.id)?.degrees.map(deg => (
                        <div key={deg.id}
                          className={`p-3 rounded-md cursor-pointer transition-all flex items-center justify-between group ${selectedDegree?.id === deg.id ? 'bg-primary/10 border-primary/20 border shadow-sm' : 'hover:bg-muted border border-transparent'}`}
                          onClick={() => handleSelectDegree(deg)}>
                          <div className="flex items-center gap-3">
                            <GraduationCap className={`h-4 w-4 ${selectedDegree?.id === deg.id ? 'text-primary' : 'text-muted-foreground'}`} />
                            <span className="font-medium text-sm">{deg.name}</span>
                          </div>
                          {selectedDegree?.id === deg.id && <ChevronRight className="h-4 w-4 text-primary" />}
                        </div>
                      ))}

                      {viewLevel === 'branches' && selectedDegree && universityHierarchy.get(selectedUniversity!.id)?.branches.get(selectedDegree.id)?.map(branch => (
                        <div key={branch.id}
                          className={`p-3 rounded-md cursor-pointer transition-all flex items-center justify-between group ${selectedBranch?.id === branch.id ? 'bg-primary/10 border-primary/20 border shadow-sm' : 'hover:bg-muted border border-transparent'}`}
                          onClick={() => handleSelectBranch(branch)}>
                          <div className="flex items-center gap-3">
                            <BookOpen className={`h-4 w-4 ${selectedBranch?.id === branch.id ? 'text-primary' : 'text-muted-foreground'}`} />
                            <span className="font-medium text-sm">{branch.name}</span>
                          </div>
                          {selectedBranch?.id === branch.id && <ChevronRight className="h-4 w-4 text-primary" />}
                        </div>
                      ))}

                      {viewLevel === 'years' && selectedBranch && universityHierarchy.get(selectedUniversity!.id)?.years.get(selectedBranch.id)?.map(year => (
                        <div key={year.id}
                          className={`p-3 rounded-md cursor-pointer transition-all flex items-center justify-between group ${selectedYear?.id === year.id ? 'bg-primary/10 border-primary/20 border shadow-sm' : 'hover:bg-muted border border-transparent'}`}
                          onClick={() => handleSelectYear(year)}>
                          <div className="flex items-center gap-3">
                            <Calendar className={`h-4 w-4 ${selectedYear?.id === year.id ? 'text-primary' : 'text-muted-foreground'}`} />
                            <span className="font-medium text-sm">{year.name}</span>
                          </div>
                          {selectedYear?.id === year.id && <ChevronRight className="h-4 w-4 text-primary" />}
                        </div>
                      ))}

                      {viewLevel === 'semesters' && selectedYear && universityHierarchy.get(selectedUniversity!.id)?.semesters.get(selectedYear.id)?.map(sem => (
                        <div key={sem.id}
                          className={`p-3 rounded-md cursor-pointer transition-all flex items-center justify-between group ${selectedSemester?.id === sem.id ? 'bg-primary/10 border-primary/20 border shadow-sm' : 'hover:bg-muted border border-transparent'}`}
                          onClick={() => handleSelectSemester(sem)}>
                          <div className="flex items-center gap-3">
                            <Book className={`h-4 w-4 ${selectedSemester?.id === sem.id ? 'text-primary' : 'text-muted-foreground'}`} />
                            <span className="font-medium text-sm">{sem.name}</span>
                          </div>
                          {selectedSemester?.id === sem.id && <ChevronRight className="h-4 w-4 text-primary" />}
                        </div>
                      ))}

                      {viewLevel === 'subjects' && selectedSemester && universityHierarchy.get(selectedUniversity!.id)?.subjects.get(selectedSemester.id)?.map(sub => (
                        <div key={sub.id}
                          className={`p-3 rounded-md cursor-pointer transition-all flex items-center justify-between group border border-transparent hover:bg-muted`}
                          onClick={() => { /* Maybe select subject for details? */ }}>
                          <div className="flex items-center gap-3">
                            <BookOpen className={`h-4 w-4 text-muted-foreground`} />
                            <span className="font-medium text-sm">{sub.name}</span>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Right Panel - Details & Children */}
                  <Card className="lg:col-span-2 flex flex-col overflow-hidden">
                    {(!selectedUniversity && viewLevel === 'universities') ? (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center">
                        <div className="bg-muted/30 p-4 rounded-full mb-4">
                          <School className="h-12 w-12 opacity-20" />
                        </div>
                        <h3 className="text-lg font-medium mb-1">Select a University</h3>
                        <p className="text-sm max-w-xs">Choose a university from the list to manage its degrees, courses, and curriculum.</p>
                      </div>
                    ) : (
                      <>
                        {/* Selected Item Header */}
                        <CardHeader className="py-4 px-6 border-b bg-muted/10 shrink-0">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                                  {viewLevel === 'universities' && 'University'}
                                  {viewLevel === 'degrees' && 'Degree'}
                                  {viewLevel === 'branches' && 'Course'}
                                  {viewLevel === 'years' && 'Year'}
                                  {viewLevel === 'semesters' && 'Semester'}
                                  {viewLevel === 'subjects' && 'Subject List'}
                                </span>
                              </div>
                              <CardTitle className="text-2xl">
                                {viewLevel === 'universities' && selectedUniversity?.name}
                                {viewLevel === 'degrees' && selectedDegree?.name}
                                {viewLevel === 'branches' && selectedBranch?.name}
                                {viewLevel === 'years' && selectedYear?.name}
                                {viewLevel === 'semesters' && selectedYear?.name + " Semesters"}
                                {viewLevel === 'subjects' && selectedSemester?.name + " Subjects"}
                              </CardTitle>
                              <CardDescription className="mt-1">
                                {viewLevel === 'universities' && selectedUniversity?.description}
                              </CardDescription>
                            </div>
                            <div className="flex gap-2">
                              {viewLevel !== 'semesters' && viewLevel !== 'subjects' && (
                                <>
                                  <Button variant="outline" size="sm" onClick={() => {
                                    const item = viewLevel === 'universities' ? selectedUniversity :
                                      viewLevel === 'degrees' ? selectedDegree :
                                        viewLevel === 'branches' ? selectedBranch :
                                          viewLevel === 'years' ? selectedYear : null;
                                    setEditingItem(item);
                                    if (viewLevel === 'universities') setUniversityDialogOpen(true);
                                    if (viewLevel === 'degrees') setDegreeDialogOpen(true);
                                    if (viewLevel === 'branches') setBranchDialogOpen(true);
                                    if (viewLevel === 'years') setYearDialogOpen(true);
                                  }}>
                                    <Edit className="h-3.5 w-3.5 mr-1.5" /> Edit
                                  </Button>
                                  <Button variant="destructive" size="sm" onClick={() => {
                                    const item = viewLevel === 'universities' ? selectedUniversity :
                                      viewLevel === 'degrees' ? selectedDegree :
                                        viewLevel === 'branches' ? selectedBranch :
                                          viewLevel === 'years' ? selectedYear : null;
                                    if (item) setDeleteConfirm({ type: viewLevel === 'branches' ? 'branch' : viewLevel.slice(0, -1), id: item.id });
                                  }}>
                                    <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </CardHeader>

                        {/* Children List */}
                        <CardContent className="flex-1 overflow-y-auto p-6 bg-muted/5">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                              {viewLevel === 'universities' && <><GraduationCap className="h-5 w-5 text-purple-500" /> Degrees</>}
                              {viewLevel === 'degrees' && <><BookOpen className="h-5 w-5 text-green-500" /> Courses</>}
                              {viewLevel === 'branches' && <><Calendar className="h-5 w-5 text-orange-500" /> Years</>}
                              {viewLevel === 'years' && <><Book className="h-5 w-5 text-blue-500" /> Semesters</>}
                              {viewLevel === 'semesters' && <><Book className="h-5 w-5 text-blue-500" /> Subjects</>}
                              {viewLevel === 'subjects' && <><BookOpen className="h-5 w-5 text-blue-500" /> Subjects</>}
                            </h3>
                            {viewLevel !== 'subjects' && (
                              <Button size="sm" onClick={() => {
                                setEditingItem(null);
                                if (viewLevel === 'universities') { setSelectedUniId(selectedUniversity!.id); setDegreeDialogOpen(true); }
                                if (viewLevel === 'degrees') { setSelectedDegreeId(selectedDegree!.id); setBranchDialogOpen(true); }
                                if (viewLevel === 'branches') { setSelectedBranchId(selectedBranch!.id); setYearDialogOpen(true); }
                                if (viewLevel === 'years') { setSelectedYearId(selectedYear!.id); setSemesterDialogOpen(true); }
                                if (viewLevel === 'semesters') { setSelectedSemesterId(selectedSemester!.id); setSubjectDialogOpen(true); }
                              }}>
                                <Plus className="h-4 w-4 mr-1.5" /> Add New
                              </Button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(viewLevel === 'universities' || (viewLevel === 'degrees' && !selectedDegree)) && selectedUniversity && universityHierarchy.get(selectedUniversity.id)?.degrees.map(deg => (
                              <Card key={deg.id} className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group" onClick={() => handleSelectDegree(deg)}>
                                <CardContent className="p-4 flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="bg-purple-100 p-2 rounded-full text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                      <GraduationCap className="h-5 w-5" />
                                    </div>
                                    <span className="font-medium">{deg.name}</span>
                                  </div>
                                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                </CardContent>
                              </Card>
                            ))}

                            {(viewLevel === 'degrees' || (viewLevel === 'branches' && !selectedBranch)) && selectedDegree && universityHierarchy.get(selectedUniversity!.id)?.branches.get(selectedDegree.id)?.map(branch => (
                              <Card key={branch.id} className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group" onClick={() => handleSelectBranch(branch)}>
                                <CardContent className="p-4 flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="bg-green-100 p-2 rounded-full text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors">
                                      <BookOpen className="h-5 w-5" />
                                    </div>
                                    <span className="font-medium">{branch.name}</span>
                                  </div>
                                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                </CardContent>
                              </Card>
                            ))}

                            {(viewLevel === 'branches' || (viewLevel === 'years' && !selectedYear)) && selectedBranch && universityHierarchy.get(selectedUniversity!.id)?.years.get(selectedBranch.id)?.map(year => (
                              <Card key={year.id} className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group" onClick={() => handleSelectYear(year)}>
                                <CardContent className="p-4 flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="bg-orange-100 p-2 rounded-full text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                                      <Calendar className="h-5 w-5" />
                                    </div>
                                    <span className="font-medium">{year.name}</span>
                                  </div>
                                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                </CardContent>
                              </Card>
                            ))}

                            {(viewLevel === 'years' || (viewLevel === 'semesters' && !selectedSemester)) && selectedYear && universityHierarchy.get(selectedUniversity!.id)?.semesters.get(selectedYear.id)?.map(sem => (
                              <Card key={sem.id} className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
                                onClick={() => handleSelectSemester(sem)}
                              >
                                <CardContent className="p-4 flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="bg-blue-100 p-2 rounded-full text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                      <Book className="h-5 w-5" />
                                    </div>
                                    <span className="font-medium">{sem.name}</span>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button size="sm" variant="ghost" onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedYearId(selectedYear.id);
                                      setEditingItem(sem);
                                      setSemesterDialogOpen(true);
                                    }}><Edit className="h-4 w-4" /></Button>
                                    <Button size="sm" variant="ghost" className="text-destructive" onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteConfirm({ type: 'semester', id: sem.id });
                                    }}><Trash2 className="h-4 w-4" /></Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}

                            {(viewLevel === 'semesters' || viewLevel === 'subjects') && selectedSemester && universityHierarchy.get(selectedUniversity!.id)?.subjects.get(selectedSemester.id)?.map(sub => (
                              <Card key={sub.id} className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group">
                                <CardContent className="p-4 flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="bg-blue-100 p-2 rounded-full text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                      <BookOpen className="h-5 w-5" />
                                    </div>
                                    <div>
                                      <span className="font-medium block">{sub.name}</span>
                                      <span className="text-xs text-muted-foreground">{sub.code} • {sub.credits} Credits</span>
                                    </div>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button size="sm" variant="ghost" onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingItem(sub);
                                      setSubjectDialogOpen(true);
                                    }}><Edit className="h-4 w-4" /></Button>
                                    <Button size="sm" variant="ghost" className="text-destructive" onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteConfirm({ type: 'subject', id: sub.id });
                                    }}><Trash2 className="h-4 w-4" /></Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </CardContent>
                      </>
                    )}
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this {deleteConfirm?.type}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirm?.type === "category") handleDeleteCategory();
                else if (deleteConfirm?.type === "class") handleDeleteClass();
                else if (deleteConfirm?.type === "subject") handleDeleteSubject();
                else if (deleteConfirm?.type === "class_subject") handleClassSubjectDelete();
                else if (deleteConfirm?.type === "material") handleDeleteMaterial();
                else if (deleteConfirm?.type === "notification") handleDeleteNotification();
                else if (deleteConfirm?.type === "university") handleDeleteUniversity();
                else if (deleteConfirm?.type === "degree") handleDeleteDegree();
                else if (deleteConfirm?.type === "branch") handleDeleteBranch();
                else if (deleteConfirm?.type === "year") handleDeleteYear();
                else if (deleteConfirm?.type === "semester") handleDeleteSemester();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Admin;
