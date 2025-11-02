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
import { Plus, Edit, Trash2, Save, X } from "lucide-react";

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
  class_id: number;
  name: string;
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

const Admin = () => {
  const navigate = useNavigate();
  const { user, clearUser } = useAuth();
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

  const [categories, setCategories] = useState<Category[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [materialClassFilterId, setMaterialClassFilterId] = useState<number | null>(null);
  const [materialType, setMaterialType] = useState<"pyq" | "syllabus" | "">("");
  const [materialSubjectId, setMaterialSubjectId] = useState<number | null>(null);

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [classDialogOpen, setClassDialogOpen] = useState(false);
  const [subjectDialogOpen, setSubjectDialogOpen] = useState(false);
  const [materialDialogOpen, setMaterialDialogOpen] = useState(false);

  const [editingItem, setEditingItem] = useState<Category | Class | Subject | Material | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: number } | null>(null);

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

  const loadData = async () => {
    try {
      const [catsRes, classesRes, subjectsRes, materialsRes] = await Promise.all([
        fetch(`${apiBaseUrl}/admin/categories`, { headers: getAuthHeaders() }),
        fetch(`${apiBaseUrl}/admin/classes`, { headers: getAuthHeaders() }),
        fetch(`${apiBaseUrl}/admin/subjects`, { headers: getAuthHeaders() }),
        fetch(`${apiBaseUrl}/admin/materials`, { headers: getAuthHeaders() }),
      ]);

      if (catsRes.ok) setCategories(await catsRes.json());
      if (classesRes.ok) setClasses(await classesRes.json());
      if (subjectsRes.ok) setSubjects(await subjectsRes.json());
      if (materialsRes.ok) setMaterials(await materialsRes.json());
    } catch (error) {
      toast.error("Failed to load data");
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
      setCategoryDialogOpen(false);
      setTimeout(() => {
        setEditingItem(null);
      }, 100);
      loadData();
    } catch (error) {
      toast.error("Failed to save category");
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteConfirm) return;
    try {
      await fetch(`${apiBaseUrl}/admin/categories/${deleteConfirm.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      toast.success("Category deleted");
      setDeleteConfirm(null);
      loadData();
    } catch (error) {
      toast.error("Failed to delete category");
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
      setClassDialogOpen(false);
      setTimeout(() => {
        setEditingItem(null);
      }, 100);
      loadData();
    } catch (error) {
      toast.error("Failed to save class");
    }
  };

  const handleDeleteClass = async () => {
    if (!deleteConfirm) return;
    try {
      await fetch(`${apiBaseUrl}/admin/classes/${deleteConfirm.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      toast.success("Class deleted");
      setDeleteConfirm(null);
      loadData();
    } catch (error) {
      toast.error("Failed to delete class");
    }
  };

  // Subject handlers
  const handleSubjectSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      class_id: parseInt(formData.get("class_id") as string),
      name: formData.get("name") as string,
      icon_name: formData.get("icon_name") as string || null,
      display_order: parseInt(formData.get("display_order") as string) || 0,
    };

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
      setTimeout(() => {
        setEditingItem(null);
      }, 100);
      loadData();
    } catch (error) {
      toast.error("Failed to save subject");
    }
  };

  const handleDeleteSubject = async () => {
    if (!deleteConfirm) return;
    try {
      await fetch(`${apiBaseUrl}/admin/subjects/${deleteConfirm.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      toast.success("Subject deleted");
      setDeleteConfirm(null);
      loadData();
    } catch (error) {
      toast.error("Failed to delete subject");
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
      setMaterialDialogOpen(false);
      setTimeout(() => {
        setEditingItem(null);
        setMaterialType("");
        setMaterialClassFilterId(null);
        setMaterialSubjectId(null);
      }, 100);
      loadData();
    } catch (error) {
      toast.error("Failed to save material");
    }
  };

  const handleDeleteMaterial = async () => {
    if (!deleteConfirm) return;
    try {
      await fetch(`${apiBaseUrl}/admin/materials/${deleteConfirm.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      toast.success("Material deleted");
      setDeleteConfirm(null);
      loadData();
    } catch (error) {
      toast.error("Failed to delete material");
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
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="categories">Categories</TabsTrigger>
                <TabsTrigger value="classes">Classes</TabsTrigger>
                <TabsTrigger value="subjects">Subjects</TabsTrigger>
                <TabsTrigger value="materials">Materials</TabsTrigger>
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
                    <DialogContent key={editingItem && 'id' in editingItem ? `cat-dialog-${editingItem.id}` : "cat-dialog-new"}>
                      <DialogHeader>
                        <DialogTitle>{editingItem ? "Edit" : "Create"} Category</DialogTitle>
                      </DialogHeader>
                      <form key={editingItem && 'id' in editingItem ? `cat-form-${editingItem.id}` : "cat-form-new"} onSubmit={handleCategorySubmit} className="space-y-4">
                        <div>
                          <Label htmlFor="cat-title">Title *</Label>
                          <Input 
                            id="cat-title" 
                            name="title" 
                            required 
                            defaultValue={editingItem && 'title' in editingItem ? (editingItem as Category).title : ""}
                          />
                        </div>
                        <div>
                          <Label htmlFor="cat-description">Description</Label>
                          <Textarea 
                            id="cat-description" 
                            name="description" 
                            defaultValue={editingItem && 'description' in editingItem ? (editingItem as Category).description || "" : ""}
                          />
                        </div>
                        <div>
                          <Label htmlFor="cat-icon">Icon Name</Label>
                          <Input 
                            id="cat-icon" 
                            name="icon_name" 
                            placeholder="e.g., School, BookOpen" 
                            defaultValue={editingItem && 'icon_name' in editingItem ? (editingItem as Category).icon_name || "" : ""}
                          />
                        </div>
                        <div>
                          <Label htmlFor="cat-order">Display Order</Label>
                          <Input 
                            id="cat-order" 
                            name="display_order" 
                            type="number" 
                            defaultValue={editingItem && 'display_order' in editingItem ? (editingItem as Category).display_order : 0}
                          />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button type="button" variant="outline" onClick={() => setCategoryDialogOpen(false)}>
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
                  {categories.map((cat) => (
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
                  ))}
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
                  {filteredClasses.map((cls) => (
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
                  ))}
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
                      <form key={editingItem && 'id' in editingItem ? `subject-form-${editingItem.id}` : "subject-form-new"} onSubmit={handleSubjectSubmit} className="space-y-4">
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
                  {filteredSubjects.map((subj) => (
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
                            onClick={() => setDeleteConfirm({ type: "subject", id: subj.id })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
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
                                    <SelectItem value="" disabled>No subjects in this class</SelectItem>
                                  ) : (
                                    <SelectItem value="" disabled>Select a class first</SelectItem>
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
                else if (deleteConfirm?.type === "material") handleDeleteMaterial();
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
