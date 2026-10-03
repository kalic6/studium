export type SemesterPeriod = 'Podzim' | 'Jaro' | 'Celoroční';

export type CompletionType =
  | 'Zkouška'
  | 'Zápočet'
  | 'Kolokvium'
  | 'Klasifikovaný zápočet';

export type DateCategory =
  | 'Přednáška'
  | 'Seminář'
  | 'Zkouška'
  | 'Bloková výuka'
  | 'Konzultace'
  | 'Jiné';

export type TaskPriority = 'Nízká' | 'Střední' | 'Vysoká';

export interface Semester {
  id: string;
  ownerId: string;
  title: string;
  academicYear: string;
  period: SemesterPeriod;
  order: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Course {
  id: string;
  ownerId: string;
  semesterId: string;
  code: string;
  name: string;
  teacher: string;
  room: string;
  scheduleSummary: string;
  completionType: CompletionType;
  credits: number;
  isCompleted: boolean;
  order: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CourseDate {
  id: string;
  ownerId: string;
  semesterId: string;
  courseId: string;
  title: string;
  date: string;
  time: string;
  room: string;
  teacher: string;
  category: DateCategory;
  isCompleted: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CourseTask {
  id: string;
  ownerId: string;
  semesterId: string;
  courseId: string;
  title: string;
  dueDate: string;
  description: string;
  priority: TaskPriority;
  isCompleted: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CourseTopic {
  id: string;
  ownerId: string;
  semesterId: string;
  courseId: string;
  title: string;
  weekLabel: string;
  isProcessed: boolean;
  notes: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

// Validation & Volumetric Boundary Constants synced verbatim with firebase-blueprint.json & firestore.rules
export const VALIDATION_LIMITS = {
  ID_REGEX: /^[a-zA-Z0-9_-]+$/,
  ID_MAX_LEN: 128,
  SEMESTER_TITLE_MAX: 120,
  ACADEMIC_YEAR_MAX: 40,
  COURSE_CODE_MAX: 30,
  COURSE_NAME_MAX: 200,
  TEACHER_MAX: 200,
  ROOM_MAX: 120,
  SCHEDULE_MAX: 200,
  DATE_TITLE_MAX: 200,
  DATE_STR_MAX: 60,
  TIME_STR_MAX: 60,
  TASK_TITLE_MAX: 250,
  TASK_DESC_MAX: 2000,
  TOPIC_TITLE_MAX: 250,
  TOPIC_WEEK_MAX: 60,
  TOPIC_NOTES_MAX: 20000,
};

export function clampString(value: string, maxLength: number, fallback = ''): string {
  const trimmed = value.trim();
  if (!trimmed && fallback) return fallback.slice(0, maxLength);
  return trimmed.slice(0, maxLength);
}

export function generateSafeId(prefix: string): string {
  const randomPart = Math.random().toString(36).substring(2, 10);
  const timePart = Date.now().toString(36);
  const raw = `${prefix}_${timePart}_${randomPart}`;
  return raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);
}
