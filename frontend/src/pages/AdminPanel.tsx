import { useEffect, useState } from "react";
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  School,
  GraduationCap,
  Bell,
  BookOpen,
  FileText,
  Plus,
  Edit,
  Trash2,
  Search,
  LayoutGrid,
  List,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

// Type definitions
interface Category {
  id: number;
  title: string;
  description?: string;
  icon_name?: string;
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
  class_id: number;
  name: string;
  icon_name?: string;
  display_order: number;
}

interface Material {
  id: number;
  subject_id: number;
  material_type: string;
  title: string;
  year?: string;
  embed_url?: string;
  download_url?: string;
  display_order: number;
}

interface University {
  id: number;
  name: string;
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

interface UniversitySubject {
  id: number;
  year_id: number;
  name: string;
  icon_name?: string;
  display_order: number;
}

interface UniversityMaterial {
  id: number;
  uni_subject_id: number;
  material_type: string;
  title: string;
  year?: string;
  embed_url?: string;
  download_url?: string;
  display_order: number;
}

interface Notification {
  id: number;
  title: string;
  message: string;
  link_url?: string;
  link_text?: string;
  is_active: number;
  priority: string;
  display_order: number;
}

const AdminPanel = () => {
  const navigate = useNavigate();
  const { user, clearUser } = useAuth();
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

  // Main section state: school, university, or notifications
  const [mainSection, setMainSection] = useState<"school" | "university" | "notifications">("school");
  
  // School subsections
  const [schoolSubsection, setSchoolSubsection] = useState<"categories" | "classes" | "subjects" | "materials">("categories");
  
  // University subsections  
  const [universitySubsection, setUniversitySubsection] = useState<"universities" | "degrees" | "branches" | "years" | "uni-subjects" | "uni-materials">("universities");

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");

  // School data states
  const [categories, setCategories] = useState<Category[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);

  // University data states
  const [universities, setUniversities] = useState<University[]>([]);
  const [degrees, setDegrees] = useState<Degree[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [years, setYears] = useState<Year[]>([]);
  const [uniSubjects, setUniSubjects] = useState<UniversitySubject[]>([]);
  const [uniMaterials, setUniMaterials] = useState<UniversityMaterial[]>([]);

  // Notification data
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // UI states
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [itemToDelete, setItemToDelete] = useState<any>(null);

  // Filter states for school
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);

  // Filter states for university
  const [selectedUniversityId, setSelectedUniversityId] = useState<number | null>(null);
  const [selectedDegreeId, setSelectedDegreeId] = useState<number | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [selectedYearId, setSelectedYearId] = useState<number | null>(null);
  const [selectedUniSubjectId, setSelectedUniSubjectId] = useState<number | null>(null);

  // Material form states
  const [materialFormClassId, setMaterialFormClassId] = useState<number | null>(null);
  const [uniMaterialFormYearId, setUniMaterialFormYearId] = useState<number | null>(null);

  // Form states for cascading university forms
  const [branchFormUniversityId, setBranchFormUniversityId] = useState<number | null>(null);
  const [branchFormDegreeId, setBranchFormDegreeId] = useState<number | null>(null);
  const [yearFormUniversityId, setYearFormUniversityId] = useState<number | null>(null);
  const [yearFormDegreeId, setYearFormDegreeId] = useState<number | null>(null);
  const [yearFormBranchId, setYearFormBranchId] = useState<number | null>(null);
  const [uniSubjectFormUniversityId, setUniSubjectFormUniversityId] = useState<number | null>(null);
  const [uniSubjectFormDegreeId, setUniSubjectFormDegreeId] = useState<number | null>(null);
  const [uniSubjectFormBranchId, setUniSubjectFormBranchId] = useState<number | null>(null);
  const [uniSubjectFormYearId, setUniSubjectFormYearId] = useState<number | null>(null);
  const [uniMaterialFormUniversityId, setUniMaterialFormUniversityId] = useState<number | null>(null);
  const [uniMaterialFormDegreeId, setUniMaterialFormDegreeId] = useState<number | null>(null);
  const [uniMaterialFormBranchId, setUniMaterialFormBranchId] = useState<number | null>(null);

  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/login");
      return;
    }
    fetchAllData();
  }, [user]);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchCategories(),
      fetchClasses(),
      fetchSubjects(),
      fetchMaterials(),
      fetchUniversities(),
      fetchDegrees(),
      fetchBranches(),
      fetchYears(),
      fetchUniSubjects(),
      fetchUniMaterials(),
      fetchNotifications(),
    ]);
    setLoading(false);
  };

  // Fetch functions
  const fetchCategories = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/admin/categories`, {
        headers: { "X-User-Id": user?.id?.toString() || "" },
      });
      if (res.ok) setCategories(await res.json());
    } catch (error) {
      console.error("Failed to fetch categories", error);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/admin/classes`, {
        headers: { "X-User-Id": user?.id?.toString() || "" },
      });
      if (res.ok) setClasses(await res.json());
    } catch (error) {
      console.error("Failed to fetch classes", error);
    }
  };

  const fetchSubjects = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/admin/subjects`, {
        headers: { "X-User-Id": user?.id?.toString() || "" },
      });
      if (res.ok) setSubjects(await res.json());
    } catch (error) {
      console.error("Failed to fetch subjects", error);
    }
  };

  const fetchMaterials = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/admin/materials`, {
        headers: { "X-User-Id": user?.id?.toString() || "" },
      });
      if (res.ok) setMaterials(await res.json());
    } catch (error) {
      console.error("Failed to fetch materials", error);
    }
  };

  const fetchUniversities = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/universities`);
      if (res.ok) setUniversities(await res.json());
    } catch (error) {
      console.error("Failed to fetch universities", error);
    }
  };

  const fetchDegrees = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/admin/degrees`, {
        headers: { "X-User-Id": user?.id?.toString() || "" },
      });
      if (res.ok) setDegrees(await res.json());
    } catch (error) {
      console.error("Failed to fetch degrees", error);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/admin/branches`, {
        headers: { "X-User-Id": user?.id?.toString() || "" },
      });
      if (res.ok) setBranches(await res.json());
    } catch (error) {
      console.error("Failed to fetch branches", error);
    }
  };

  const fetchYears = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/admin/years`, {
        headers: { "X-User-Id": user?.id?.toString() || "" },
      });
      if (res.ok) setYears(await res.json());
    } catch (error) {
      console.error("Failed to fetch years", error);
    }
  };

  const fetchUniSubjects = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/admin/university-subjects`, {
        headers: { "X-User-Id": user?.id?.toString() || "" },
      });
      if (res.ok) setUniSubjects(await res.json());
    } catch (error) {
      console.error("Failed to fetch university subjects", error);
    }
  };

  const fetchUniMaterials = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/admin/university-materials`, {
        headers: { "X-User-Id": user?.id?.toString() || "" },
      });
      if (res.ok) setUniMaterials(await res.json());
    } catch (error) {
      console.error("Failed to fetch university materials", error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/admin/notifications`, {
        headers: { "X-User-Id": user?.id?.toString() || "" },
      });
      if (res.ok) setNotifications(await res.json());
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    }
  };

  // Get current active section
  const getActiveSection = () => {
    if (mainSection === "notifications") return "notifications";
    if (mainSection === "school") return schoolSubsection;
    return universitySubsection;
  };

  // Get endpoint for current section
  const getEndpoint = (section: string): string => {
    const endpoints: Record<string, string> = {
      categories: "/admin/categories",
      classes: "/admin/classes",
      subjects: "/admin/subjects",
      materials: "/admin/materials",
      universities: "/admin/universities",
      degrees: "/admin/degrees",
      branches: "/admin/branches",
      years: "/admin/years",
      "uni-subjects": "/admin/university-subjects",
      "uni-materials": "/admin/university-materials",
      notifications: "/admin/notifications",
    };
    return endpoints[section] || "";
  };

  // Get section label
  const getSectionLabel = (section: string): string => {
    const labels: Record<string, string> = {
      categories: "Category",
      classes: "Class",
      subjects: "Subject",
      materials: "Material",
      universities: "University",
      degrees: "Degree",
      branches: "Branch",
      years: "Year",
      "uni-subjects": "University Subject",
      "uni-materials": "University Material",
      notifications: "Notification",
    };
    return labels[section] || "";
  };

  // CRUD Operations
  const handleCreate = () => {
    setEditingItem(null);
    setMaterialFormClassId(null);
    setUniMaterialFormYearId(null);
    setBranchFormUniversityId(null);
    setBranchFormDegreeId(null);
    setYearFormUniversityId(null);
    setYearFormDegreeId(null);
    setYearFormBranchId(null);
    setUniSubjectFormUniversityId(null);
    setUniSubjectFormDegreeId(null);
    setUniSubjectFormBranchId(null);
    setUniSubjectFormYearId(null);
    setUniMaterialFormUniversityId(null);
    setUniMaterialFormDegreeId(null);
    setUniMaterialFormBranchId(null);
    setDialogOpen(true);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setDialogOpen(true);
  };

  const handleDelete = (item: any) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    try {
      const activeSection = getActiveSection();
      const endpoint = getEndpoint(activeSection);
      const res = await fetch(`${apiBaseUrl}${endpoint}/${itemToDelete.id}`, {
        method: "DELETE",
        headers: { "X-User-Id": user?.id?.toString() || "" },
      });

      if (res.ok) {
        toast.success(`${getSectionLabel(activeSection)} deleted successfully`);
        fetchAllData();
        setDeleteDialogOpen(false);
        setItemToDelete(null);
      } else {
        toast.error("Failed to delete");
      }
    } catch (error) {
      toast.error("Error deleting item");
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: any = {};

    formData.forEach((value, key) => {
      if (value !== "") {
        data[key] = value;
      }
    });

    // Convert numeric fields to integers
    if (data.category_id) data.category_id = parseInt(data.category_id);
    if (data.class_id) data.class_id = parseInt(data.class_id);
    if (data.subject_id) data.subject_id = parseInt(data.subject_id);
    if (data.university_id) data.university_id = parseInt(data.university_id);
    if (data.degree_id) data.degree_id = parseInt(data.degree_id);
    if (data.branch_id) data.branch_id = parseInt(data.branch_id);
    if (data.year_id) data.year_id = parseInt(data.year_id);
    if (data.uni_subject_id) data.uni_subject_id = parseInt(data.uni_subject_id);
    if (data.display_order) data.display_order = parseInt(data.display_order);

    // For notifications, convert is_active to integer
    const activeSection = getActiveSection();
    if (activeSection === "notifications") {
      data.is_active = data.is_active === "1" || data.is_active === "true" ? 1 : 0;
      if (!data.display_order) data.display_order = 0;
    }

    try {
      const endpoint = getEndpoint(activeSection);
      const url = editingItem
        ? `${apiBaseUrl}${endpoint}/${editingItem.id}`
        : `${apiBaseUrl}${endpoint}`;

      const res = await fetch(url, {
        method: editingItem ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": user?.id?.toString() || "",
        },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        toast.success(
          `${getSectionLabel(activeSection)} ${editingItem ? "updated" : "created"} successfully`
        );
        fetchAllData();
        setDialogOpen(false);
        setEditingItem(null);
        setMaterialFormClassId(null);
      } else {
        const errorData = await res.json().catch(() => null);
        toast.error(errorData?.detail || "Operation failed");
      }
    } catch (error) {
      toast.error("Error saving data");
    }
  };

  // Get filtered data based on active section
  const getFilteredData = () => {
    const activeSection = getActiveSection();
    let data: any[] = [];

    switch (activeSection) {
      case "categories":
        data = categories;
        break;
      case "classes":
        data = selectedCategoryId
          ? classes.filter((c) => c.category_id === selectedCategoryId)
          : classes;
        break;
      case "subjects":
        data = selectedClassId
          ? subjects.filter((s) => s.class_id === selectedClassId)
          : subjects;
        break;
      case "materials":
        data = selectedSubjectId
          ? materials.filter((m) => m.subject_id === selectedSubjectId)
          : materials;
        break;
      case "universities":
        data = universities;
        break;
      case "degrees":
        data = selectedUniversityId
          ? degrees.filter((d) => d.university_id === selectedUniversityId)
          : degrees;
        break;
      case "branches":
        data = selectedDegreeId
          ? branches.filter((b) => b.degree_id === selectedDegreeId)
          : branches;
        break;
      case "years":
        data = selectedBranchId
          ? years.filter((y) => y.branch_id === selectedBranchId)
          : years;
        break;
      case "uni-subjects":
        data = selectedYearId
          ? uniSubjects.filter((s) => s.year_id === selectedYearId)
          : uniSubjects;
        break;
      case "uni-materials":
        data = selectedUniSubjectId
          ? uniMaterials.filter((m) => m.uni_subject_id === selectedUniSubjectId)
          : uniMaterials;
        break;
      case "notifications":
        data = notifications;
        break;
    }

    // Apply search filter
    if (searchQuery) {
      data = data.filter((item) =>
        JSON.stringify(item).toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return data;
  };

  // Render form fields based on active section
  const renderFormFields = () => {
    const activeSection = getActiveSection();

    switch (activeSection) {
      case "categories":
        return (
          <>
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                name="title"
                required
                defaultValue={editingItem?.title || ""}
                placeholder="e.g., Primary School"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={editingItem?.description || ""}
                placeholder="Brief description..."
              />
            </div>
            <div>
              <Label htmlFor="icon_name">Icon Name</Label>
              <Input
                id="icon_name"
                name="icon_name"
                defaultValue={editingItem?.icon_name || ""}
                placeholder="e.g., School, BookOpen"
              />
            </div>
            <div>
              <Label htmlFor="display_order">Display Order</Label>
              <Input
                id="display_order"
                name="display_order"
                type="number"
                defaultValue={editingItem?.display_order || 0}
              />
            </div>
          </>
        );

      case "classes":
        return (
          <>
            <div>
              <Label htmlFor="category_id">Category *</Label>
              <Select name="category_id" required defaultValue={editingItem?.category_id?.toString()}>
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
              <Label htmlFor="name">Class Name *</Label>
              <Input
                id="name"
                name="name"
                required
                defaultValue={editingItem?.name || ""}
                placeholder="e.g., Class 10"
              />
            </div>
            <div>
              <Label htmlFor="display_order">Display Order</Label>
              <Input
                id="display_order"
                name="display_order"
                type="number"
                defaultValue={editingItem?.display_order || 0}
              />
            </div>
          </>
        );

      case "subjects":
        return (
          <>
            <div>
              <Label htmlFor="class_id">Class *</Label>
              <Select name="class_id" required defaultValue={editingItem?.class_id?.toString()}>
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
              <Label htmlFor="name">Subject Name *</Label>
              <Input
                id="name"
                name="name"
                required
                defaultValue={editingItem?.name || ""}
                placeholder="e.g., Mathematics"
              />
            </div>
            <div>
              <Label htmlFor="icon_name">Icon Name</Label>
              <Input
                id="icon_name"
                name="icon_name"
                defaultValue={editingItem?.icon_name || ""}
                placeholder="e.g., Calculator"
              />
            </div>
            <div>
              <Label htmlFor="display_order">Display Order</Label>
              <Input
                id="display_order"
                name="display_order"
                type="number"
                defaultValue={editingItem?.display_order || 0}
              />
            </div>
          </>
        );

      case "materials":
        return (
          <>
            <div>
              <Label htmlFor="material_class_id">Class *</Label>
              <Select
                value={materialFormClassId?.toString() || editingItem?.class_id?.toString() || ""}
                onValueChange={(value) => setMaterialFormClassId(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select class first" />
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
              <Label htmlFor="subject_id">Subject *</Label>
              <Select
                name="subject_id"
                required
                defaultValue={editingItem?.subject_id?.toString()}
                disabled={!materialFormClassId && !editingItem}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={materialFormClassId || editingItem ? "Select subject" : "Select class first"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {subjects
                    .filter((subj) => subj.class_id === (materialFormClassId || editingItem?.class_id))
                    .map((subj) => (
                      <SelectItem key={subj.id} value={subj.id.toString()}>
                        {subj.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="material_type">Type *</Label>
              <Select name="material_type" required defaultValue={editingItem?.material_type || "pyq"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pyq">PYQ</SelectItem>
                  <SelectItem value="syllabus">Syllabus</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                name="title"
                required
                defaultValue={editingItem?.title || ""}
                placeholder="e.g., 2023 Question Paper"
              />
            </div>
            <div>
              <Label htmlFor="year">Year</Label>
              <Input id="year" name="year" defaultValue={editingItem?.year || ""} placeholder="e.g., 2023" />
            </div>
            <div>
              <Label htmlFor="embed_url">Embed URL</Label>
              <Input
                id="embed_url"
                name="embed_url"
                defaultValue={editingItem?.embed_url || ""}
                placeholder="PDF viewer URL"
              />
            </div>
            <div>
              <Label htmlFor="download_url">Download URL</Label>
              <Input
                id="download_url"
                name="download_url"
                defaultValue={editingItem?.download_url || ""}
                placeholder="Direct download URL"
              />
            </div>
          </>
        );

      case "universities":
        return (
          <>
            <div>
              <Label htmlFor="name">University Name *</Label>
              <Input
                id="name"
                name="name"
                required
                defaultValue={editingItem?.name || ""}
                placeholder="e.g., RGPV"
              />
            </div>
            <div>
              <Label htmlFor="display_order">Display Order</Label>
              <Input
                id="display_order"
                name="display_order"
                type="number"
                defaultValue={editingItem?.display_order || 0}
              />
            </div>
          </>
        );

      case "degrees":
        return (
          <>
            <div>
              <Label htmlFor="university_id">University *</Label>
              <Select
                name="university_id"
                required
                defaultValue={editingItem?.university_id?.toString()}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select university" />
                </SelectTrigger>
                <SelectContent>
                  {universities.map((uni) => (
                    <SelectItem key={uni.id} value={uni.id.toString()}>
                      {uni.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="name">Degree Name *</Label>
              <Input
                id="name"
                name="name"
                required
                defaultValue={editingItem?.name || ""}
                placeholder="e.g., B.Tech"
              />
            </div>
            <div>
              <Label htmlFor="display_order">Display Order</Label>
              <Input
                id="display_order"
                name="display_order"
                type="number"
                defaultValue={editingItem?.display_order || 0}
              />
            </div>
          </>
        );

      case "branches":
        return (
          <>
            <div>
              <Label htmlFor="branch_university_id">University *</Label>
              <Select
                value={branchFormUniversityId?.toString() || ""}
                onValueChange={(value) => {
                  setBranchFormUniversityId(parseInt(value));
                  setBranchFormDegreeId(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select university" />
                </SelectTrigger>
                <SelectContent>
                  {universities.map((uni) => (
                    <SelectItem key={uni.id} value={uni.id.toString()}>
                      {uni.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="degree_id">Degree *</Label>
              <Select 
                name="degree_id" 
                required 
                defaultValue={editingItem?.degree_id?.toString()}
                disabled={!branchFormUniversityId && !editingItem}
              >
                <SelectTrigger>
                  <SelectValue placeholder={branchFormUniversityId || editingItem ? "Select degree" : "Select university first"} />
                </SelectTrigger>
                <SelectContent>
                  {degrees
                    .filter((deg) => deg.university_id === (branchFormUniversityId || editingItem?.university_id))
                    .map((deg) => (
                      <SelectItem key={deg.id} value={deg.id.toString()}>
                        {deg.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="name">Branch Name *</Label>
              <Input
                id="name"
                name="name"
                required
                defaultValue={editingItem?.name || ""}
                placeholder="e.g., Computer Science"
              />
            </div>
            <div>
              <Label htmlFor="display_order">Display Order</Label>
              <Input
                id="display_order"
                name="display_order"
                type="number"
                defaultValue={editingItem?.display_order || 0}
              />
            </div>
          </>
        );

      case "years":
        return (
          <>
            <div>
              <Label htmlFor="year_university_id">University *</Label>
              <Select
                value={yearFormUniversityId?.toString() || ""}
                onValueChange={(value) => {
                  setYearFormUniversityId(parseInt(value));
                  setYearFormDegreeId(null);
                  setYearFormBranchId(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select university" />
                </SelectTrigger>
                <SelectContent>
                  {universities.map((uni) => (
                    <SelectItem key={uni.id} value={uni.id.toString()}>
                      {uni.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="year_degree_id">Degree *</Label>
              <Select
                value={yearFormDegreeId?.toString() || ""}
                onValueChange={(value) => {
                  setYearFormDegreeId(parseInt(value));
                  setYearFormBranchId(null);
                }}
                disabled={!yearFormUniversityId && !editingItem}
              >
                <SelectTrigger>
                  <SelectValue placeholder={yearFormUniversityId || editingItem ? "Select degree" : "Select university first"} />
                </SelectTrigger>
                <SelectContent>
                  {degrees
                    .filter((deg) => deg.university_id === (yearFormUniversityId || editingItem?.university_id))
                    .map((deg) => (
                      <SelectItem key={deg.id} value={deg.id.toString()}>
                        {deg.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="branch_id">Branch *</Label>
              <Select 
                name="branch_id" 
                required 
                defaultValue={editingItem?.branch_id?.toString()}
                disabled={!yearFormDegreeId && !editingItem}
              >
                <SelectTrigger>
                  <SelectValue placeholder={yearFormDegreeId || editingItem ? "Select branch" : "Select degree first"} />
                </SelectTrigger>
                <SelectContent>
                  {branches
                    .filter((branch) => branch.degree_id === (yearFormDegreeId || editingItem?.degree_id))
                    .map((branch) => (
                      <SelectItem key={branch.id} value={branch.id.toString()}>
                        {branch.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="name">Year Name *</Label>
              <Input
                id="name"
                name="name"
                required
                defaultValue={editingItem?.name || ""}
                placeholder="e.g., 1st Year"
              />
            </div>
            <div>
              <Label htmlFor="display_order">Display Order</Label>
              <Input
                id="display_order"
                name="display_order"
                type="number"
                defaultValue={editingItem?.display_order || 0}
              />
            </div>
          </>
        );

      case "uni-subjects":
        return (
          <>
            <div>
              <Label htmlFor="subject_university_id">University *</Label>
              <Select
                value={uniSubjectFormUniversityId?.toString() || ""}
                onValueChange={(value) => {
                  setUniSubjectFormUniversityId(parseInt(value));
                  setUniSubjectFormDegreeId(null);
                  setUniSubjectFormBranchId(null);
                  setUniSubjectFormYearId(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select university" />
                </SelectTrigger>
                <SelectContent>
                  {universities.map((uni) => (
                    <SelectItem key={uni.id} value={uni.id.toString()}>
                      {uni.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="subject_degree_id">Degree *</Label>
              <Select
                value={uniSubjectFormDegreeId?.toString() || ""}
                onValueChange={(value) => {
                  setUniSubjectFormDegreeId(parseInt(value));
                  setUniSubjectFormBranchId(null);
                  setUniSubjectFormYearId(null);
                }}
                disabled={!uniSubjectFormUniversityId && !editingItem}
              >
                <SelectTrigger>
                  <SelectValue placeholder={uniSubjectFormUniversityId || editingItem ? "Select degree" : "Select university first"} />
                </SelectTrigger>
                <SelectContent>
                  {degrees
                    .filter((deg) => deg.university_id === (uniSubjectFormUniversityId || editingItem?.university_id))
                    .map((deg) => (
                      <SelectItem key={deg.id} value={deg.id.toString()}>
                        {deg.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="subject_branch_id">Branch *</Label>
              <Select
                value={uniSubjectFormBranchId?.toString() || ""}
                onValueChange={(value) => {
                  setUniSubjectFormBranchId(parseInt(value));
                  setUniSubjectFormYearId(null);
                }}
                disabled={!uniSubjectFormDegreeId && !editingItem}
              >
                <SelectTrigger>
                  <SelectValue placeholder={uniSubjectFormDegreeId || editingItem ? "Select branch" : "Select degree first"} />
                </SelectTrigger>
                <SelectContent>
                  {branches
                    .filter((branch) => branch.degree_id === (uniSubjectFormDegreeId || editingItem?.degree_id))
                    .map((branch) => (
                      <SelectItem key={branch.id} value={branch.id.toString()}>
                        {branch.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="year_id">Year *</Label>
              <Select 
                name="year_id" 
                required 
                defaultValue={editingItem?.year_id?.toString()}
                disabled={!uniSubjectFormBranchId && !editingItem}
              >
                <SelectTrigger>
                  <SelectValue placeholder={uniSubjectFormBranchId || editingItem ? "Select year" : "Select branch first"} />
                </SelectTrigger>
                <SelectContent>
                  {years
                    .filter((year) => year.branch_id === (uniSubjectFormBranchId || editingItem?.branch_id))
                    .map((year) => (
                      <SelectItem key={year.id} value={year.id.toString()}>
                        {year.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="name">Subject Name *</Label>
              <Input
                id="name"
                name="name"
                required
                defaultValue={editingItem?.name || ""}
                placeholder="e.g., Data Structures"
              />
            </div>
            <div>
              <Label htmlFor="icon_name">Icon Name</Label>
              <Input
                id="icon_name"
                name="icon_name"
                defaultValue={editingItem?.icon_name || ""}
                placeholder="e.g., Database"
              />
            </div>
            <div>
              <Label htmlFor="display_order">Display Order</Label>
              <Input
                id="display_order"
                name="display_order"
                type="number"
                defaultValue={editingItem?.display_order || 0}
              />
            </div>
          </>
        );

      case "uni-materials":
        return (
          <>
            <div>
              <Label htmlFor="material_university_id">University *</Label>
              <Select
                value={uniMaterialFormUniversityId?.toString() || ""}
                onValueChange={(value) => {
                  setUniMaterialFormUniversityId(parseInt(value));
                  setUniMaterialFormDegreeId(null);
                  setUniMaterialFormBranchId(null);
                  setUniMaterialFormYearId(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select university" />
                </SelectTrigger>
                <SelectContent>
                  {universities.map((uni) => (
                    <SelectItem key={uni.id} value={uni.id.toString()}>
                      {uni.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="material_degree_id">Degree *</Label>
              <Select
                value={uniMaterialFormDegreeId?.toString() || ""}
                onValueChange={(value) => {
                  setUniMaterialFormDegreeId(parseInt(value));
                  setUniMaterialFormBranchId(null);
                  setUniMaterialFormYearId(null);
                }}
                disabled={!uniMaterialFormUniversityId && !editingItem}
              >
                <SelectTrigger>
                  <SelectValue placeholder={uniMaterialFormUniversityId || editingItem ? "Select degree" : "Select university first"} />
                </SelectTrigger>
                <SelectContent>
                  {degrees
                    .filter((deg) => deg.university_id === (uniMaterialFormUniversityId || editingItem?.university_id))
                    .map((deg) => (
                      <SelectItem key={deg.id} value={deg.id.toString()}>
                        {deg.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="material_branch_id">Branch *</Label>
              <Select
                value={uniMaterialFormBranchId?.toString() || ""}
                onValueChange={(value) => {
                  setUniMaterialFormBranchId(parseInt(value));
                  setUniMaterialFormYearId(null);
                }}
                disabled={!uniMaterialFormDegreeId && !editingItem}
              >
                <SelectTrigger>
                  <SelectValue placeholder={uniMaterialFormDegreeId || editingItem ? "Select branch" : "Select degree first"} />
                </SelectTrigger>
                <SelectContent>
                  {branches
                    .filter((branch) => branch.degree_id === (uniMaterialFormDegreeId || editingItem?.degree_id))
                    .map((branch) => (
                      <SelectItem key={branch.id} value={branch.id.toString()}>
                        {branch.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="uni_material_year_id">Year *</Label>
              <Select
                value={uniMaterialFormYearId?.toString() || ""}
                onValueChange={(value) => setUniMaterialFormYearId(parseInt(value))}
                disabled={!uniMaterialFormBranchId && !editingItem}
              >
                <SelectTrigger>
                  <SelectValue placeholder={uniMaterialFormBranchId || editingItem ? "Select year" : "Select branch first"} />
                </SelectTrigger>
                <SelectContent>
                  {years
                    .filter((year) => year.branch_id === (uniMaterialFormBranchId || editingItem?.branch_id))
                    .map((year) => (
                      <SelectItem key={year.id} value={year.id.toString()}>
                        {year.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="uni_subject_id">Subject *</Label>
              <Select
                name="uni_subject_id"
                required
                defaultValue={editingItem?.uni_subject_id?.toString()}
                disabled={!uniMaterialFormYearId && !editingItem}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={uniMaterialFormYearId || editingItem ? "Select subject" : "Select year first"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {uniSubjects
                    .filter((subj) => subj.year_id === (uniMaterialFormYearId || editingItem?.year_id))
                    .map((subj) => (
                      <SelectItem key={subj.id} value={subj.id.toString()}>
                        {subj.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="material_type">Type *</Label>
              <Select name="material_type" required defaultValue={editingItem?.material_type || "pyq"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pyq">PYQ</SelectItem>
                  <SelectItem value="syllabus">Syllabus</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                name="title"
                required
                defaultValue={editingItem?.title || ""}
                placeholder="e.g., 2023 Question Paper"
              />
            </div>
            <div>
              <Label htmlFor="year">Year</Label>
              <Input id="year" name="year" defaultValue={editingItem?.year || ""} placeholder="e.g., 2023" />
            </div>
            <div>
              <Label htmlFor="embed_url">Embed URL</Label>
              <Input
                id="embed_url"
                name="embed_url"
                defaultValue={editingItem?.embed_url || ""}
                placeholder="PDF viewer URL"
              />
            </div>
            <div>
              <Label htmlFor="download_url">Download URL</Label>
              <Input
                id="download_url"
                name="download_url"
                defaultValue={editingItem?.download_url || ""}
                placeholder="Direct download URL"
              />
            </div>
          </>
        );

      case "notifications":
        return (
          <>
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                name="title"
                required
                defaultValue={editingItem?.title || ""}
                placeholder="Notification title"
              />
            </div>
            <div>
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                name="message"
                required
                defaultValue={editingItem?.message || ""}
                placeholder="Notification message"
              />
            </div>
            <div>
              <Label htmlFor="priority">Priority *</Label>
              <Select name="priority" required defaultValue={editingItem?.priority || "info"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="link_url">Link URL</Label>
              <Input
                id="link_url"
                name="link_url"
                defaultValue={editingItem?.link_url || ""}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label htmlFor="link_text">Link Text</Label>
              <Input
                id="link_text"
                name="link_text"
                defaultValue={editingItem?.link_text || ""}
                placeholder="Learn More"
              />
            </div>
            <div>
              <Label htmlFor="is_active">Status *</Label>
              <Select name="is_active" required defaultValue={editingItem?.is_active?.toString() || "1"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Active</SelectItem>
                  <SelectItem value="0">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  const renderCard = (item: any) => {
    const activeSection = getActiveSection();
    return (
      <Card
        key={item.id}
        className="group relative p-6 hover:shadow-lg transition-all hover:border-primary/50"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-bl-full" />
        <div className="relative">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg mb-1 truncate">
                {item.title || item.name || item.message?.substring(0, 50)}
              </h3>
              {item.description && <p className="text-sm text-muted-foreground mb-2">{item.description}</p>}
              {item.message && activeSection === "notifications" && (
                <p className="text-sm text-muted-foreground mb-2">{item.message.substring(0, 100)}...</p>
              )}
              <div className="flex gap-2 flex-wrap mt-3">
                {item.priority && (
                  <Badge variant={item.priority === "urgent" ? "destructive" : "secondary"}>
                    {item.priority}
                  </Badge>
                )}
                {item.is_active !== undefined && (
                  <Badge variant={item.is_active === 1 ? "default" : "secondary"}>
                    {item.is_active === 1 ? "Active" : "Inactive"}
                  </Badge>
                )}
                {item.material_type && <Badge variant="outline">{item.material_type}</Badge>}
              </div>
            </div>
          </div>
          <div className="mt-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button size="sm" variant="outline" onClick={() => handleEdit(item)}>
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button size="sm" variant="destructive" onClick={() => handleDelete(item)}>
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  const renderListItem = (item: any) => {
    const activeSection = getActiveSection();
    return (
      <div
        key={item.id}
        className="group flex items-center justify-between p-4 border-b hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <BookOpen className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{item.title || item.name || item.message?.substring(0, 50)}</p>
            {item.description && <p className="text-sm text-muted-foreground truncate">{item.description}</p>}
          </div>
          <div className="flex gap-2">
            {item.priority && (
              <Badge variant={item.priority === "urgent" ? "destructive" : "secondary"}>{item.priority}</Badge>
            )}
            {item.is_active !== undefined && (
              <Badge variant={item.is_active === 1 ? "default" : "secondary"}>
                {item.is_active === 1 ? "Active" : "Inactive"}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="sm" variant="ghost" onClick={() => handleEdit(item)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => handleDelete(item)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  const filteredData = getFilteredData();
  const activeSection = getActiveSection();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                Admin Panel
              </h1>
              <p className="text-sm text-muted-foreground mt-1">Manage your exam buddy resources</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate("/")}>
                Home
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/teacher")}>
                Teacher View
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/student")}>
                Student View
              </Button>
              <Button variant="outline" onClick={() => { clearUser(); navigate("/login"); }}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto p-6">
        <div className="grid lg:grid-cols-[280px_1fr] gap-6">
          {/* Main Sidebar - School/University/Notifications */}
          <div className="space-y-4">
            <Card className="p-4 sticky top-24">
              <h2 className="font-semibold mb-4">Main Sections</h2>
              <div className="space-y-2">
                <Button
                  variant={mainSection === "school" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setMainSection("school")}
                >
                  <School className="h-5 w-5 mr-2" />
                  School Resources
                  <ChevronRight className="h-4 w-4 ml-auto" />
                </Button>
                <Button
                  variant={mainSection === "university" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setMainSection("university")}
                >
                  <GraduationCap className="h-5 w-5 mr-2" />
                  University Resources
                  <ChevronRight className="h-4 w-4 ml-auto" />
                </Button>
                <Button
                  variant={mainSection === "notifications" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setMainSection("notifications")}
                >
                  <Bell className="h-5 w-5 mr-2" />
                  Notifications
                </Button>
              </div>

              {/* Subsection Navigation for School */}
              {mainSection === "school" && (
                <>
                  <Separator className="my-4" />
                  <h3 className="text-sm font-semibold mb-3 text-muted-foreground">School Controls</h3>
                  <div className="space-y-1">
                    {["categories", "classes", "subjects", "materials"].map((section) => (
                      <Button
                        key={section}
                        variant={schoolSubsection === section ? "secondary" : "ghost"}
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setSchoolSubsection(section as any)}
                      >
                        {section.charAt(0).toUpperCase() + section.slice(1)}
                      </Button>
                    ))}
                  </div>
                </>
              )}

              {/* Subsection Navigation for University */}
              {mainSection === "university" && (
                <>
                  <Separator className="my-4" />
                  <h3 className="text-sm font-semibold mb-3 text-muted-foreground">University Controls</h3>
                  <div className="space-y-1">
                    {["universities", "degrees", "branches", "years", "uni-subjects", "uni-materials"].map((section) => (
                      <Button
                        key={section}
                        variant={universitySubsection === section ? "secondary" : "ghost"}
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setUniversitySubsection(section as any)}
                      >
                        {section === "uni-subjects" 
                          ? "Subjects" 
                          : section === "uni-materials"
                          ? "Materials"
                          : section.charAt(0).toUpperCase() + section.slice(1)}
                      </Button>
                    ))}
                  </div>
                </>
              )}
            </Card>
          </div>

          {/* Main Content */}
          <div className="space-y-6">
            {/* Filters and Actions Bar */}
            <Card className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* School Filters */}
                {mainSection === "school" && (
                  <>
                    {(schoolSubsection === "classes" ||
                      schoolSubsection === "subjects" ||
                      schoolSubsection === "materials") && (
                      <Select
                        value={selectedCategoryId?.toString() || "all"}
                        onValueChange={(v) => {
                          setSelectedCategoryId(v === "all" ? null : parseInt(v));
                          setSelectedClassId(null);
                          setSelectedSubjectId(null);
                        }}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="All Categories" />
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
                    )}

                    {(schoolSubsection === "subjects" || schoolSubsection === "materials") && (
                      <Select
                        value={selectedClassId?.toString() || "all"}
                        onValueChange={(v) => {
                          setSelectedClassId(v === "all" ? null : parseInt(v));
                          setSelectedSubjectId(null);
                        }}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="All Classes" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Classes</SelectItem>
                          {(selectedCategoryId
                            ? classes.filter((c) => c.category_id === selectedCategoryId)
                            : classes
                          ).map((cls) => (
                            <SelectItem key={cls.id} value={cls.id.toString()}>
                              {cls.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {schoolSubsection === "materials" && (
                      <Select
                        value={selectedSubjectId?.toString() || "all"}
                        onValueChange={(v) => setSelectedSubjectId(v === "all" ? null : parseInt(v))}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="All Subjects" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Subjects</SelectItem>
                          {(selectedClassId
                            ? subjects.filter((s) => s.class_id === selectedClassId)
                            : subjects
                          ).map((subj) => (
                            <SelectItem key={subj.id} value={subj.id.toString()}>
                              {subj.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </>
                )}

                {/* University Filters */}
                {mainSection === "university" && (
                  <>
                    {(universitySubsection === "degrees" ||
                      universitySubsection === "branches" ||
                      universitySubsection === "years" ||
                      universitySubsection === "uni-subjects" ||
                      universitySubsection === "uni-materials") && (
                      <Select
                        value={selectedUniversityId?.toString() || "all"}
                        onValueChange={(v) => {
                          setSelectedUniversityId(v === "all" ? null : parseInt(v));
                          setSelectedDegreeId(null);
                          setSelectedBranchId(null);
                          setSelectedYearId(null);
                          setSelectedUniSubjectId(null);
                        }}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="All Universities" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Universities</SelectItem>
                          {universities.map((uni) => (
                            <SelectItem key={uni.id} value={uni.id.toString()}>
                              {uni.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {(universitySubsection === "branches" ||
                      universitySubsection === "years" ||
                      universitySubsection === "uni-subjects" ||
                      universitySubsection === "uni-materials") &&
                      selectedUniversityId && (
                        <Select
                          value={selectedDegreeId?.toString() || "all"}
                          onValueChange={(v) => {
                            setSelectedDegreeId(v === "all" ? null : parseInt(v));
                            setSelectedBranchId(null);
                            setSelectedYearId(null);
                            setSelectedUniSubjectId(null);
                          }}
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="All Degrees" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Degrees</SelectItem>
                            {degrees
                              .filter((d) => d.university_id === selectedUniversityId)
                              .map((deg) => (
                                <SelectItem key={deg.id} value={deg.id.toString()}>
                                  {deg.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      )}

                    {(universitySubsection === "years" ||
                      universitySubsection === "uni-subjects" ||
                      universitySubsection === "uni-materials") &&
                      selectedDegreeId && (
                        <Select
                          value={selectedBranchId?.toString() || "all"}
                          onValueChange={(v) => {
                            setSelectedBranchId(v === "all" ? null : parseInt(v));
                            setSelectedYearId(null);
                            setSelectedUniSubjectId(null);
                          }}
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="All Branches" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Branches</SelectItem>
                            {branches
                              .filter((b) => b.degree_id === selectedDegreeId)
                              .map((branch) => (
                                <SelectItem key={branch.id} value={branch.id.toString()}>
                                  {branch.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      )}

                    {(universitySubsection === "uni-subjects" ||
                      universitySubsection === "uni-materials") &&
                      selectedBranchId && (
                        <Select
                          value={selectedYearId?.toString() || "all"}
                          onValueChange={(v) => {
                            setSelectedYearId(v === "all" ? null : parseInt(v));
                            setSelectedUniSubjectId(null);
                          }}
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="All Years" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Years</SelectItem>
                            {years
                              .filter((y) => y.branch_id === selectedBranchId)
                              .map((year) => (
                                <SelectItem key={year.id} value={year.id.toString()}>
                                  {year.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      )}

                    {universitySubsection === "uni-materials" && selectedYearId && (
                      <Select
                        value={selectedUniSubjectId?.toString() || "all"}
                        onValueChange={(v) => setSelectedUniSubjectId(v === "all" ? null : parseInt(v))}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="All Subjects" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Subjects</SelectItem>
                          {uniSubjects
                            .filter((s) => s.year_id === selectedYearId)
                            .map((subj) => (
                              <SelectItem key={subj.id} value={subj.id.toString()}>
                                {subj.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    )}
                  </>
                )}

                <div className="flex gap-2">
                  <Button
                    variant={viewMode === "grid" ? "default" : "outline"}
                    size="icon"
                    onClick={() => setViewMode("grid")}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "outline"}
                    size="icon"
                    onClick={() => setViewMode("list")}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>

                <Button onClick={handleCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add {getSectionLabel(activeSection)}
                </Button>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Badge variant="secondary">Total: {filteredData.length}</Badge>
              </div>
            </Card>

            {/* Content Area */}
            {loading ? (
              <Card className="p-12">
                <div className="text-center text-muted-foreground">Loading...</div>
              </Card>
            ) : filteredData.length === 0 ? (
              <Card className="p-12">
                <div className="text-center">
                  <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No {getSectionLabel(activeSection)}s Found</h3>
                  <p className="text-muted-foreground mb-4">Get started by creating your first item</p>
                  <Button onClick={handleCreate}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create {getSectionLabel(activeSection)}
                  </Button>
                </div>
              </Card>
            ) : viewMode === "grid" ? (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredData.map((item) => renderCard(item))}
              </div>
            ) : (
              <Card>
                <ScrollArea className="h-[600px]">{filteredData.map((item) => renderListItem(item))}</ScrollArea>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit" : "Create"} {getSectionLabel(activeSection)}
            </DialogTitle>
            <DialogDescription>
              {editingItem ? "Update" : "Add"} {getSectionLabel(activeSection).toLowerCase()} details below
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">{renderFormFields()}</div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{editingItem ? "Update" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this {getSectionLabel(activeSection).toLowerCase()}. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminPanel;
