import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { ThemeBackground } from "@/components/student/ThemeBackground";
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

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [materialClassFilterId, setMaterialClassFilterId] = useState<number | null>(null);
  const [materialType, setMaterialType] = useState<"pyq" | "syllabus" | "">("");
  const [materialSubjectId, setMaterialSubjectId] = useState<number | null>(null);
  const [notificationPriority, setNotificationPriority] = useState<"info" | "warning" | "urgent">("info");
  const [notificationActive, setNotificationActive] = useState<string>("1");

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [classDialogOpen, setClassDialogOpen] = useState(false);
  const [subjectDialogOpen, setSubjectDialogOpen] = useState(false);
  const [materialDialogOpen, setMaterialDialogOpen] = useState(false);
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);

  const [editingItem, setEditingItem] = useState<Category | Class | Subject | Material | Notification | null>(null);
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
    <div className="min-h-screen relative overflow-hidden">
      <ThemeBackground />
      <Header showAuth={false} showStudentActions onLogout={() => { clearUser(); navigate("/login"); }} />

      <main className="max-w-7xl mx-auto px-6 py-10 relative z-10">
        {/* Welcome Section */}
        <div className="text-center mb-8 space-y-4">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
            Admin Panel
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Manage categories, classes, subjects, materials, and notifications
          </p>
        </div>

        <Card className="border-2 border-border/50 bg-background/80 backdrop-blur-xl">
          <CardContent className="pt-6">
            <Tabs defaultValue="categories" className="w-full">
              <TabsList className="grid w-full grid-cols-6 mb-6">
                <TabsTrigger value="categories">Categories</TabsTrigger>
                <TabsTrigger value="classes">Classes</TabsTrigger>
                <TabsTrigger value="subjects">Subjects</TabsTrigger>
                <TabsTrigger value="materials">Materials</TabsTrigger>
                <TabsTrigger value="universities">Universities</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
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
                <Card>
                  <CardHeader>
                    <CardTitle>University Management</CardTitle>
                    <CardDescription>Manage universities, degrees, branches, years, and subjects</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-center py-8">
                      University management interface will be available soon. 
                      <br />
                      This will include full CRUD operations for Universities → Degrees → Branches → Years → Subjects → Materials.
                    </p>
                  </CardContent>
                </Card>
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
                else if (deleteConfirm?.type === "class_subject") handleClassSubjectDelete();
                else if (deleteConfirm?.type === "material") handleDeleteMaterial();
                else if (deleteConfirm?.type === "notification") handleDeleteNotification();
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
