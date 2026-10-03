import {
  Semester,
  Course,
  CourseDate,
  CourseTask,
  CourseTopic,
} from './types';

export const DEFAULT_SEMESTER_ID = 'sem_1_podzim_2026';

export function sanitizeOwnerKey(ownerId: string): string {
  const cleaned = ownerId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
  return cleaned || 'user';
}

export function getDefaultSemesterId(ownerId: string): string {
  return `sem_1_podzim_${sanitizeOwnerKey(ownerId)}`;
}

export function getInitialSemesters(ownerId: string): Semester[] {
  const semId = getDefaultSemesterId(ownerId);
  return [
    {
      id: semId,
      ownerId,
      title: '1. semestr',
      academicYear: '2026/2027',
      period: 'Podzim',
      order: 1,
    },
  ];
}

export function getInitialCourses(
  ownerId: string,
  semesterId = getDefaultSemesterId(ownerId)
): Course[] {
  const key = sanitizeOwnerKey(ownerId);
  return [
    {
      id: `course_AI001_${key}`,
      ownerId,
      semesterId,
      code: 'AI001',
      name: 'Elements of AI',
      teacher: '',
      room: '',
      scheduleSummary: '',
      completionType: 'Zápočet',
      credits: 2,
      isCompleted: false,
      order: 1,
    },
    {
      id: `course_ISKB02_${key}`,
      ownerId,
      semesterId,
      code: 'ISKB02',
      name: 'Úvod do knihovnictví',
      teacher: '',
      room: '',
      scheduleSummary: '',
      completionType: 'Zkouška',
      credits: 5,
      isCompleted: false,
      order: 2,
    },
    {
      id: `course_ISKB03_${key}`,
      ownerId,
      semesterId,
      code: 'ISKB03',
      name: 'Informační služby a vyhledávání',
      teacher: '',
      room: '',
      scheduleSummary: '',
      completionType: 'Zkouška',
      credits: 5,
      isCompleted: false,
      order: 3,
    },
    {
      id: `course_ISKB04_${key}`,
      ownerId,
      semesterId,
      code: 'ISKB04',
      name: 'Psaní odborných textů',
      teacher: '',
      room: '',
      scheduleSummary: '',
      completionType: 'Zápočet',
      credits: 4,
      isCompleted: false,
      order: 4,
    },
    {
      id: `course_ISKB08_${key}`,
      ownerId,
      semesterId,
      code: 'ISKB08',
      name: 'Literatura v kulturním kontextu',
      teacher: '',
      room: '',
      scheduleSummary: '',
      completionType: 'Kolokvium',
      credits: 4,
      isCompleted: false,
      order: 5,
    },
    {
      id: `course_ISKB60_${key}`,
      ownerId,
      semesterId,
      code: 'ISKB60',
      name: 'Prolegomena k oboru',
      teacher: '',
      room: '',
      scheduleSummary: '',
      completionType: 'Zápočet',
      credits: 4,
      isCompleted: false,
      order: 6,
    },
    {
      id: `course_ISKB65_${key}`,
      ownerId,
      semesterId,
      code: 'ISKB65',
      name: 'Blok expertů',
      teacher: '',
      room: '',
      scheduleSummary: '',
      completionType: 'Kolokvium',
      credits: 3,
      isCompleted: false,
      order: 7,
    },
    {
      id: `course_PHK0001_${key}`,
      ownerId,
      semesterId,
      code: 'PHK0001',
      name: 'Filozofie pro posluchače nefilozofických oborů',
      teacher: '',
      room: '',
      scheduleSummary: '',
      completionType: 'Zkouška',
      credits: 4,
      isCompleted: false,
      order: 8,
    },
  ];
}

export function getInitialTopics(
  _ownerId: string,
  _semesterId?: string
): CourseTopic[] {
  return [];
}

export function getInitialTasks(
  _ownerId: string,
  _semesterId?: string
): CourseTask[] {
  return [];
}

export function getInitialDates(
  _ownerId: string,
  _semesterId?: string
): CourseDate[] {
  return [];
}
