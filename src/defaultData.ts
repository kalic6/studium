import {
  Semester,
  Course,
  CourseDate,
  CourseTask,
  CourseTopic,
} from './types';

export const DEFAULT_SEMESTER_ID = 'sem_1_podzim_2026';

export const LEGACY_PREFILLED_COURSE_PREFIXES = [
  'course_AI001',
  'course_ISKB02',
  'course_ISKB03',
  'course_ISKB04',
  'course_ISKB08',
  'course_ISKB60',
  'course_ISKB65',
  'course_PHK0001',
];

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
  _ownerId: string,
  _semesterId?: string
): Course[] {
  return [];
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
