import * as Icons from "lucide-react";
import { LucideIcon } from "lucide-react";

// Map icon names to Lucide React icons
export const getIcon = (iconName: string | null | undefined, fallback: LucideIcon = Icons.Book): LucideIcon => {
  if (!iconName) return fallback;
  
  // Convert icon name to PascalCase and get from Icons object
  const iconKey = iconName as keyof typeof Icons;
  return (Icons[iconKey] as LucideIcon) || fallback;
};

// Common icon mappings for categories
export const categoryIcons: Record<string, LucideIcon> = {
  School: Icons.School,
  BookOpen: Icons.BookOpen,
  GraduationCap: Icons.GraduationCap,
  Building2: Icons.Building2,
};

// Common icon mappings for subjects
export const subjectIcons: Record<string, LucideIcon> = {
  Mathematics: Icons.Calculator,
  Science: Icons.FlaskConical,
  Evs: Icons.FlaskConical,
  Physics: Icons.Atom,
  Chemistry: Icons.FlaskConical,
  Biology: Icons.Atom,
  English: Icons.Languages,
  Hindi: Icons.Languages,
  History: Icons.Book,
  Geography: Icons.Globe,
  "Computer Science": Icons.Book,
  Calculator: Icons.Calculator,
  Book: Icons.Book,
};
