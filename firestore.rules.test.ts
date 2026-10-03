/**
 * Phase 0 Test Runner for Firestore Security Rules ("Dirty Dozen" Verification)
 */
import {
  assertFails,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import * as fs from 'fs';

export async function runSecurityRulesTests() {
  const testEnv: RulesTestEnvironment = await initializeTestEnvironment({
    projectId: 'demo-study-organizer',
    firestore: {
      rules: fs.readFileSync('firestore.rules', 'utf8'),
    },
  });

  const aliceDb = testEnv
    .authenticatedContext('alice_uid', { email_verified: true })
    .firestore();
  const unverifiedDb = testEnv
    .authenticatedContext('alice_uid', { email_verified: false })
    .firestore();
  const bobDb = testEnv
    .authenticatedContext('bob_uid', { email_verified: true })
    .firestore();

  // 1. Identity Spoofing on Create
  await assertFails(
    aliceDb.collection('semesters').doc('sem_1').set({
      ownerId: 'bob_uid',
      title: '1. semestr',
      academicYear: '2026/2027',
      period: 'Podzim',
      order: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  );

  // 2. Unverified Email Write
  await assertFails(
    unverifiedDb.collection('semesters').doc('sem_1').set({
      ownerId: 'alice_uid',
      title: '1. semestr',
      academicYear: '2026/2027',
      period: 'Podzim',
      order: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  );

  // 3. Shadow Field / Ghost Key Injection
  await assertFails(
    aliceDb.collection('semesters').doc('sem_1').set({
      ownerId: 'alice_uid',
      title: '1. semestr',
      academicYear: '2026/2027',
      period: 'Podzim',
      order: 1,
      isAdminOverride: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  );

  // 4. Orphaned Course Creation (non-existent semesterId)
  await assertFails(
    aliceDb.collection('courses').doc('course_1').set({
      ownerId: 'alice_uid',
      semesterId: 'missing_sem',
      code: 'AI001',
      name: 'Elements of AI',
      teacher: '',
      room: '',
      scheduleSummary: '',
      completionType: 'Zápočet',
      credits: 2,
      isCompleted: false,
      order: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  );

  // 5. Orphaned Task Creation
  await assertFails(
    aliceDb.collection('tasks').doc('task_1').set({
      ownerId: 'alice_uid',
      semesterId: 'missing_sem',
      courseId: 'missing_course',
      title: 'Úkol 1',
      dueDate: '2026-11-01',
      description: '',
      priority: 'Střední',
      isCompleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  );

  // 6. Cross-tenant Read/Delete
  await assertFails(bobDb.collection('semesters').doc('sem_1').get());

  await testEnv.cleanup();
}
