import React, { useState, useEffect, useMemo } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  sendEmailVerification,
  User,
} from 'firebase/auth';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  Check,
  FileText,
  LogOut,
  X,
  Save,
} from 'lucide-react';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from './firebase';
import {
  Semester,
  Course,
  CourseDate,
  CourseTask,
  CourseTopic,
  SemesterPeriod,
  CompletionType,
  TaskPriority,
  DateCategory,
  VALIDATION_LIMITS,
  clampString,
  generateSafeId,
  stripHtmlToText,
} from './types';
import {
  DEFAULT_SEMESTER_ID,
  LEGACY_PREFILLED_COURSE_PREFIXES,
  getInitialSemesters,
} from './defaultData';
import {
  ActiveStudentSession,
  buildSessionFromFirebaseUser,
  getSavedActiveLocalSession,
  saveActiveLocalSession,
  loadUserStudyData,
  saveUserStudyData,
} from './authAccounts';
import { AuthScreen } from './components/AuthScreen';
import { CourseAccordionItem } from './components/CourseAccordionItem';
import { RichNoteEditor } from './components/RichNoteEditor';
import { ErrorBoundary } from './components/ErrorBoundary';

type MainNavView = 'courses' | 'agenda' | 'notes' | 'overview';
type CourseFilter = 'all' | 'active' | 'completed';
type AgendaFilter = 'all' | 'pending' | 'completed';

export default function App() {
  return (
    <ErrorBoundary>
      <StudyOrganizerWorkspace />
    </ErrorBoundary>
  );
}

function StudyOrganizerWorkspace() {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveStudentSession | null>(
    null
  );
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isLoadingUserCloud, setIsLoadingUserCloud] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [isSeedingCloud, setIsSeedingCloud] = useState(false);

  const isCloudVerified = Boolean(
    user && activeSession?.isFirebaseAuth && activeSession?.isEmailVerified
  );
  const currentOwnerId = activeSession?.uid || 'local_user';

  // Data state (isolated per student account UID)
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [topics, setTopics] = useState<CourseTopic[]>([]);
  const [tasks, setTasks] = useState<CourseTask[]>([]);
  const [dates, setDates] = useState<CourseDate[]>([]);

  // UI Navigation State
  const [activeNav, setActiveNav] = useState<MainNavView>('courses');
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>(
    DEFAULT_SEMESTER_ID
  );
  const [expandedCourseIds, setExpandedCourseIds] = useState<Record<string, boolean>>({
    course_AI001: true,
  });
  const [courseSearch, setCourseSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState<CourseFilter>('all');
  const [agendaFilter, setAgendaFilter] = useState<AgendaFilter>('all');
  const [notesSearch, setNotesSearch] = useState('');
  const [selectedGlobalTopicId, setSelectedGlobalTopicId] = useState<string | null>(
    null
  );
  const [globalNoteDraft, setGlobalNoteDraft] = useState('');
  const [globalNoteSaved, setGlobalNoteSaved] = useState(false);

  // Modals State
  const [semesterModalMode, setSemesterModalMode] = useState<
    'closed' | 'create' | 'edit'
  >('closed');
  const [editingSemester, setEditingSemester] = useState<Semester | null>(null);
  const [semTitleInput, setSemTitleInput] = useState('');
  const [semYearInput, setSemYearInput] = useState('2026/2027');
  const [semPeriodInput, setSemPeriodInput] = useState<SemesterPeriod>('Podzim');
  const [semOrderInput, setSemOrderInput] = useState<number>(1);
  const [semesterToDelete, setSemesterToDelete] = useState<Semester | null>(null);

  const [showNewCourseModal, setShowNewCourseModal] = useState(false);
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseTeacher, setNewCourseTeacher] = useState('');
  const [newCourseRoom, setNewCourseRoom] = useState('');
  const [newCourseSchedule, setNewCourseSchedule] = useState('');
  const [newCourseCompletion, setNewCourseCompletion] =
    useState<CompletionType>('Zkouška');
  const [newCourseCredits, setNewCourseCredits] = useState<number>(4);

  // Quick Task / Date creation in Agenda view
  const [showQuickTaskModal, setShowQuickTaskModal] = useState(false);
  const [quickTaskCourseId, setQuickTaskCourseId] = useState('');
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [quickTaskDueDate, setQuickTaskDueDate] = useState('');
  const [quickTaskPriority, setQuickTaskPriority] =
    useState<TaskPriority>('Střední');
  const [quickTaskDesc, setQuickTaskDesc] = useState('');
  const [quickTaskWorkNotes, setQuickTaskWorkNotes] = useState('');
  const [agendaOpenNotesTaskId, setAgendaOpenNotesTaskId] = useState<string | null>(
    null
  );
  const [agendaWorkNotesDraft, setAgendaWorkNotesDraft] = useState('');
  const [agendaWorkNotesSavedId, setAgendaWorkNotesSavedId] = useState<string | null>(
    null
  );

  // Listen to Firebase Auth state & restore active session ONLY if explicitly signed in via AuthScreen (v3)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      const savedExplicit = getSavedActiveLocalSession();
      if (savedExplicit) {
        if (
          savedExplicit.isFirebaseAuth &&
          currentUser &&
          savedExplicit.uid === currentUser.uid
        ) {
          const session = buildSessionFromFirebaseUser(
            currentUser,
            savedExplicit.nickname
          );
          setActiveSession(session);
        } else if (!savedExplicit.isFirebaseAuth) {
          setActiveSession(savedExplicit);
        } else {
          setActiveSession(null);
        }
      } else {
        setActiveSession(null);
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Load isolated study data whenever the signed-in student UID changes
  useEffect(() => {
    if (!activeSession?.uid) {
      setSemesters([]);
      setCourses([]);
      setTopics([]);
      setTasks([]);
      setDates([]);
      return;
    }
    const bundle = loadUserStudyData(activeSession.uid);
    setSemesters(bundle.semesters);
    setCourses(bundle.courses);
    setTopics(bundle.topics);
    setTasks(bundle.tasks);
    setDates(bundle.dates);
    if (bundle.semesters[0]) {
      setSelectedSemesterId(bundle.semesters[0].id);
    }
  }, [activeSession?.uid]);

  // Persist changes to per-student isolated storage
  useEffect(() => {
    if (activeSession?.uid && semesters.length > 0) {
      saveUserStudyData(activeSession.uid, {
        semesters,
        courses,
        topics,
        tasks,
        dates,
      });
    }
  }, [activeSession?.uid, semesters, courses, topics, tasks, dates]);

  // Seed only an empty 1st semester into Firestore for a new authenticated user
  const seedUserDatabase = async (uid: string) => {
    setIsSeedingCloud(true);
    try {
      const initialSem = getInitialSemesters(uid)[0];
      try {
        await setDoc(doc(db, 'semesters', initialSem.id), {
          ownerId: uid,
          title: initialSem.title,
          academicYear: initialSem.academicYear,
          period: initialSem.period,
          order: initialSem.order,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `semesters/${initialSem.id}`);
      }
    } finally {
      setIsSeedingCloud(false);
    }
  };

  // Attach Firestore listeners strictly when auth is ready and user has a verified Firebase session
  useEffect(() => {
    if (!isAuthReady || !user || !isCloudVerified) {
      setIsLoadingUserCloud(false);
      return;
    }

    setIsLoadingUserCloud(true);
    let hasCheckedEmpty = false;
    const resetFlagKey = `studijni_denik_cloud_courses_cleared_v2_${user.uid}`;
    const shouldWipeExistingOnce =
      localStorage.getItem(resetFlagKey) !== 'done';

    const semQuery = query(
      collection(db, 'semesters'),
      where('ownerId', '==', user.uid)
    );
    const unsubSemesters = onSnapshot(
      semQuery,
      async (snapshot) => {
        if (snapshot.empty && !hasCheckedEmpty) {
          hasCheckedEmpty = true;
          await seedUserDatabase(user.uid);
          setIsLoadingUserCloud(false);
          return;
        }
        hasCheckedEmpty = true;
        const loaded: Semester[] = snapshot.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<Semester, 'id'>) }))
          .sort((a, b) => a.order - b.order);
        setSemesters(loaded);
        setIsLoadingUserCloud(false);
      },
      (err) => {
        setIsLoadingUserCloud(false);
        handleFirestoreError(err, OperationType.LIST, 'semesters');
      }
    );

    const coursesQuery = query(
      collection(db, 'courses'),
      where('ownerId', '==', user.uid)
    );
    const unsubCourses = onSnapshot(
      coursesQuery,
      async (snapshot) => {
        const docsToDelete = snapshot.docs.filter(
          (d) =>
            shouldWipeExistingOnce ||
            LEGACY_PREFILLED_COURSE_PREFIXES.some((prefix) =>
              d.id.startsWith(prefix)
            )
        );

        if (shouldWipeExistingOnce) {
          try {
            localStorage.setItem(resetFlagKey, 'done');
          } catch {
            // ignore storage errors
          }
        }

        if (docsToDelete.length > 0) {
          try {
            const batch = writeBatch(db);
            docsToDelete.forEach((d) => batch.delete(doc(db, 'courses', d.id)));
            await batch.commit();
          } catch (err) {
            handleFirestoreError(err, OperationType.DELETE, 'courses');
          }
          return;
        }

        const loaded: Course[] = snapshot.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<Course, 'id'>) }))
          .sort((a, b) => a.order - b.order || a.code.localeCompare(b.code));
        setCourses(loaded);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'courses')
    );

    const topicsQuery = query(
      collection(db, 'topics'),
      where('ownerId', '==', user.uid)
    );
    const unsubTopics = onSnapshot(
      topicsQuery,
      async (snapshot) => {
        if (shouldWipeExistingOnce && snapshot.docs.length > 0) {
          try {
            const batch = writeBatch(db);
            snapshot.docs.forEach((d) => batch.delete(doc(db, 'topics', d.id)));
            await batch.commit();
          } catch {
            // ignore
          }
          return;
        }
        const loaded: CourseTopic[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<CourseTopic, 'id'>),
        }));
        setTopics(loaded);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'topics')
    );

    const tasksQuery = query(
      collection(db, 'tasks'),
      where('ownerId', '==', user.uid)
    );
    const unsubTasks = onSnapshot(
      tasksQuery,
      async (snapshot) => {
        if (shouldWipeExistingOnce && snapshot.docs.length > 0) {
          try {
            const batch = writeBatch(db);
            snapshot.docs.forEach((d) => batch.delete(doc(db, 'tasks', d.id)));
            await batch.commit();
          } catch {
            // ignore
          }
          return;
        }
        const loaded: CourseTask[] = snapshot.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<CourseTask, 'id'>) }))
          .sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));
        setTasks(loaded);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'tasks')
    );

    const datesQuery = query(
      collection(db, 'courseDates'),
      where('ownerId', '==', user.uid)
    );
    const unsubDates = onSnapshot(
      datesQuery,
      async (snapshot) => {
        if (shouldWipeExistingOnce && snapshot.docs.length > 0) {
          try {
            const batch = writeBatch(db);
            snapshot.docs.forEach((d) =>
              batch.delete(doc(db, 'courseDates', d.id))
            );
            await batch.commit();
          } catch {
            // ignore
          }
          return;
        }
        const loaded: CourseDate[] = snapshot.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<CourseDate, 'id'>) }))
          .sort((a, b) => a.date.localeCompare(b.date));
        setDates(loaded);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'courseDates')
    );

    return () => {
      unsubSemesters();
      unsubCourses();
      unsubTopics();
      unsubTasks();
      unsubDates();
    };
  }, [isAuthReady, user, isCloudVerified]);

  // Ensure selectedSemesterId always points to an existing semester
  const activeSemester = useMemo(() => {
    return (
      semesters.find((s) => s.id === selectedSemesterId) || semesters[0] || null
    );
  }, [semesters, selectedSemesterId]);

  useEffect(() => {
    if (activeSemester && activeSemester.id !== selectedSemesterId) {
      setSelectedSemesterId(activeSemester.id);
    }
  }, [activeSemester, selectedSemesterId]);

  // Derived collections for the active semester
  const semesterCourses = useMemo(() => {
    if (!activeSemester) return [];
    return courses
      .filter((c) => c.semesterId === activeSemester.id)
      .sort((a, b) => a.order - b.order || a.code.localeCompare(b.code));
  }, [courses, activeSemester]);

  const filteredSemesterCourses = useMemo(() => {
    return semesterCourses.filter((c) => {
      if (courseFilter === 'active' && c.isCompleted) return false;
      if (courseFilter === 'completed' && !c.isCompleted) return false;
      if (courseSearch.trim()) {
        const q = courseSearch.toLowerCase();
        return (
          c.code.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          c.teacher.toLowerCase().includes(q) ||
          c.room.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [semesterCourses, courseFilter, courseSearch]);

  const semesterTopics = useMemo(() => {
    if (!activeSemester) return [];
    return topics.filter((t) => t.semesterId === activeSemester.id);
  }, [topics, activeSemester]);

  const semesterTasks = useMemo(() => {
    if (!activeSemester) return [];
    return tasks.filter((t) => t.semesterId === activeSemester.id);
  }, [tasks, activeSemester]);

  const semesterDates = useMemo(() => {
    if (!activeSemester) return [];
    return dates.filter((d) => d.semesterId === activeSemester.id);
  }, [dates, activeSemester]);

  // Summary metrics for active semester
  const completedCoursesCount = semesterCourses.filter((c) => c.isCompleted).length;
  const totalCredits = semesterCourses.reduce((acc, c) => acc + c.credits, 0);
  const earnedCredits = semesterCourses
    .filter((c) => c.isCompleted)
    .reduce((acc, c) => acc + c.credits, 0);
  const processedTopicsCount = semesterTopics.filter((t) => t.isProcessed).length;
  const completedTasksCount = semesterTasks.filter((t) => t.isCompleted).length;

  // Sync global note editor selection
  const activeGlobalTopic = useMemo(() => {
    const found = semesterTopics.find((t) => t.id === selectedGlobalTopicId);
    return found || semesterTopics[0] || null;
  }, [semesterTopics, selectedGlobalTopicId]);

  useEffect(() => {
    if (activeGlobalTopic) {
      setGlobalNoteDraft(activeGlobalTopic.notes);
    } else {
      setGlobalNoteDraft('');
    }
  }, [activeGlobalTopic?.id, activeGlobalTopic?.notes]);

  // =========================================================================
  // AUTH HANDLERS
  // =========================================================================
  const handleAuthenticatedSession = (
    session: ActiveStudentSession,
    infoBanner?: string | null
  ) => {
    setAuthError(null);
    setAuthNotice(infoBanner || null);
    setActiveSession(session);
    saveActiveLocalSession(session);
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setAuthNotice(null);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const session = buildSessionFromFirebaseUser(cred.user);
      setActiveSession(session);
      saveActiveLocalSession(session);
    } catch (err) {
      setAuthError(
        err instanceof Error
          ? err.message
          : 'Přihlášení přes Google se nezdařilo.'
      );
    }
  };

  const handleRefreshEmailVerification = async () => {
    if (!auth.currentUser) return;
    try {
      await auth.currentUser.reload();
      const updated = buildSessionFromFirebaseUser(auth.currentUser);
      setActiveSession(updated);
      saveActiveLocalSession(updated);
      if (updated.isEmailVerified) {
        setAuthNotice('E-mail byl úspěšně ověřen! Vaše studijní záznamy jsou nyní synchronizovány s cloudem.');
      } else {
        setAuthNotice('E-mail zatím nebyl potvrzen. Klikněte na odkaz v doručeném e-mailu a poté zkuste znovu.');
      }
    } catch {
      // ignore reload error
    }
  };

  const handleResendVerificationEmail = async () => {
    if (!auth.currentUser) return;
    try {
      await sendEmailVerification(auth.currentUser);
      setAuthNotice(`Ověřovací e-mail byl znovu odeslán na adresu ${auth.currentUser.email}.`);
    } catch {
      setAuthNotice('Ověřovací e-mail byl odeslán nedávno. Zkontrolujte prosím svou schránku.');
    }
  };

  const handleSignOut = async () => {
    setAuthNotice(null);
    setAuthError(null);
    saveActiveLocalSession(null);
    setActiveSession(null);
    try {
      await signOut(auth);
    } catch {
      // ignore signOut errors for local accounts
    }
    setSemesters([]);
    setCourses([]);
    setTopics([]);
    setTasks([]);
    setDates([]);
  };

  // =========================================================================
  // SEMESTER CRUD HANDLERS
  // =========================================================================
  const openCreateSemesterModal = () => {
    const nextOrder = semesters.length + 1;
    setEditingSemester(null);
    setSemTitleInput(`${nextOrder}. semestr`);
    setSemYearInput('2026/2027');
    setSemPeriodInput(nextOrder % 2 === 0 ? 'Jaro' : 'Podzim');
    setSemOrderInput(nextOrder);
    setSemesterModalMode('create');
  };

  const openEditSemesterModal = (sem: Semester) => {
    setEditingSemester(sem);
    setSemTitleInput(sem.title);
    setSemYearInput(sem.academicYear);
    setSemPeriodInput(sem.period);
    setSemOrderInput(sem.order);
    setSemesterModalMode('edit');
  };

  const handleSaveSemester = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = clampString(
      semTitleInput,
      VALIDATION_LIMITS.SEMESTER_TITLE_MAX
    );
    const cleanYear = clampString(
      semYearInput,
      VALIDATION_LIMITS.ACADEMIC_YEAR_MAX,
      '2026/2027'
    );
    const cleanOrder = Math.max(0, Math.min(1000, Number(semOrderInput) || 1));
    if (!cleanTitle) return;

    if (semesterModalMode === 'create') {
      const newId = generateSafeId('sem');
      if (isCloudVerified && user) {
        try {
          await setDoc(doc(db, 'semesters', newId), {
            ownerId: user.uid,
            title: cleanTitle,
            academicYear: cleanYear,
            period: semPeriodInput,
            order: cleanOrder,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `semesters/${newId}`);
        }
      } else {
        setSemesters((prev) =>
          [
            ...prev,
            {
              id: newId,
              ownerId: currentOwnerId,
              title: cleanTitle,
              academicYear: cleanYear,
              period: semPeriodInput,
              order: cleanOrder,
            },
          ].sort((a, b) => a.order - b.order)
        );
      }
      setSelectedSemesterId(newId);
    } else if (semesterModalMode === 'edit' && editingSemester) {
      if (isCloudVerified && user) {
        try {
          await updateDoc(doc(db, 'semesters', editingSemester.id), {
            title: cleanTitle,
            academicYear: cleanYear,
            period: semPeriodInput,
            order: cleanOrder,
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(
            err,
            OperationType.UPDATE,
            `semesters/${editingSemester.id}`
          );
        }
      } else {
        setSemesters((prev) =>
          prev
            .map((s) =>
              s.id === editingSemester.id
                ? {
                    ...s,
                    title: cleanTitle,
                    academicYear: cleanYear,
                    period: semPeriodInput,
                    order: cleanOrder,
                  }
                : s
            )
            .sort((a, b) => a.order - b.order)
        );
      }
    }

    setSemesterModalMode('closed');
  };

  const handleConfirmDeleteSemester = async () => {
    if (!semesterToDelete) return;
    const targetId = semesterToDelete.id;
    setSemesterToDelete(null);

    if (isCloudVerified && user) {
      try {
        const batch = writeBatch(db);
        topics
          .filter((t) => t.semesterId === targetId)
          .forEach((t) => batch.delete(doc(db, 'topics', t.id)));
        tasks
          .filter((t) => t.semesterId === targetId)
          .forEach((t) => batch.delete(doc(db, 'tasks', t.id)));
        dates
          .filter((d) => d.semesterId === targetId)
          .forEach((d) => batch.delete(doc(db, 'courseDates', d.id)));
        courses
          .filter((c) => c.semesterId === targetId)
          .forEach((c) => batch.delete(doc(db, 'courses', c.id)));
        batch.delete(doc(db, 'semesters', targetId));
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `semesters/${targetId}`);
      }
    } else {
      setTopics((prev) => prev.filter((t) => t.semesterId !== targetId));
      setTasks((prev) => prev.filter((t) => t.semesterId !== targetId));
      setDates((prev) => prev.filter((d) => d.semesterId !== targetId));
      setCourses((prev) => prev.filter((c) => c.semesterId !== targetId));
      setSemesters((prev) => prev.filter((s) => s.id !== targetId));
    }
  };

  // =========================================================================
  // COURSE CRUD HANDLERS
  // =========================================================================
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSemester) return;
    const cleanCode = clampString(
      newCourseCode,
      VALIDATION_LIMITS.COURSE_CODE_MAX
    ).toUpperCase();
    const cleanName = clampString(newCourseName, VALIDATION_LIMITS.COURSE_NAME_MAX);
    if (!cleanCode || !cleanName) return;

    const newId = generateSafeId('course');
    const order = semesterCourses.length + 1;

    if (isCloudVerified && user) {
      try {
        await setDoc(doc(db, 'courses', newId), {
          ownerId: user.uid,
          semesterId: activeSemester.id,
          code: cleanCode,
          name: cleanName,
          teacher: clampString(newCourseTeacher, VALIDATION_LIMITS.TEACHER_MAX),
          room: clampString(newCourseRoom, VALIDATION_LIMITS.ROOM_MAX),
          scheduleSummary: clampString(
            newCourseSchedule,
            VALIDATION_LIMITS.SCHEDULE_MAX
          ),
          completionType: newCourseCompletion,
          credits: Math.max(0, Math.min(60, Number(newCourseCredits) || 0)),
          isCompleted: false,
          order,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `courses/${newId}`);
      }
    } else {
      setCourses((prev) => [
        ...prev,
        {
          id: newId,
          ownerId: currentOwnerId,
          semesterId: activeSemester.id,
          code: cleanCode,
          name: cleanName,
          teacher: clampString(newCourseTeacher, VALIDATION_LIMITS.TEACHER_MAX),
          room: clampString(newCourseRoom, VALIDATION_LIMITS.ROOM_MAX),
          scheduleSummary: clampString(
            newCourseSchedule,
            VALIDATION_LIMITS.SCHEDULE_MAX
          ),
          completionType: newCourseCompletion,
          credits: Math.max(0, Math.min(60, Number(newCourseCredits) || 0)),
          isCompleted: false,
          order,
        },
      ]);
    }

    setExpandedCourseIds((prev) => ({ ...prev, [newId]: true }));
    setNewCourseCode('');
    setNewCourseName('');
    setNewCourseTeacher('');
    setNewCourseRoom('');
    setNewCourseSchedule('');
    setNewCourseCredits(4);
    setShowNewCourseModal(false);
  };

  const handleToggleCourseCompleted = async (course: Course) => {
    const nextState = !course.isCompleted;
    if (isCloudVerified && user) {
      try {
        await updateDoc(doc(db, 'courses', course.id), {
          isCompleted: nextState,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `courses/${course.id}`);
      }
    } else {
      setCourses((prev) =>
        prev.map((c) =>
          c.id === course.id ? { ...c, isCompleted: nextState } : c
        )
      );
    }
  };

  const handleUpdateCourse = async (
    courseId: string,
    updates: Partial<
      Pick<
        Course,
        | 'code'
        | 'name'
        | 'teacher'
        | 'room'
        | 'scheduleSummary'
        | 'completionType'
        | 'credits'
        | 'isCompleted'
      >
    >
  ) => {
    const existingCourse = courses.find((c) => c.id === courseId);
    if (!existingCourse) return;

    const payload = {
      code: clampString(
        updates.code ?? existingCourse.code,
        VALIDATION_LIMITS.COURSE_CODE_MAX
      ),
      name: clampString(
        updates.name ?? existingCourse.name,
        VALIDATION_LIMITS.COURSE_NAME_MAX
      ),
      teacher: clampString(
        updates.teacher ?? existingCourse.teacher,
        VALIDATION_LIMITS.TEACHER_MAX
      ),
      room: clampString(
        updates.room ?? existingCourse.room,
        VALIDATION_LIMITS.ROOM_MAX
      ),
      scheduleSummary: clampString(
        updates.scheduleSummary ?? existingCourse.scheduleSummary,
        VALIDATION_LIMITS.SCHEDULE_MAX
      ),
      completionType: updates.completionType ?? existingCourse.completionType,
      credits: Math.max(
        0,
        Math.min(60, Number(updates.credits ?? existingCourse.credits) || 0)
      ),
      isCompleted: updates.isCompleted ?? existingCourse.isCompleted,
      order: existingCourse.order,
    };

    if (isCloudVerified && user) {
      try {
        await updateDoc(doc(db, 'courses', courseId), {
          ...payload,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `courses/${courseId}`);
      }
    } else {
      setCourses((prev) =>
        prev.map((c) => (c.id === courseId ? { ...c, ...payload } : c))
      );
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (isCloudVerified && user) {
      try {
        const batch = writeBatch(db);
        topics
          .filter((t) => t.courseId === courseId)
          .forEach((t) => batch.delete(doc(db, 'topics', t.id)));
        tasks
          .filter((t) => t.courseId === courseId)
          .forEach((t) => batch.delete(doc(db, 'tasks', t.id)));
        dates
          .filter((d) => d.courseId === courseId)
          .forEach((d) => batch.delete(doc(db, 'courseDates', d.id)));
        batch.delete(doc(db, 'courses', courseId));
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `courses/${courseId}`);
      }
    } else {
      setTopics((prev) => prev.filter((t) => t.courseId !== courseId));
      setTasks((prev) => prev.filter((t) => t.courseId !== courseId));
      setDates((prev) => prev.filter((d) => d.courseId !== courseId));
      setCourses((prev) => prev.filter((c) => c.id !== courseId));
    }
  };

  // =========================================================================
  // TOPICS & NOTES CRUD HANDLERS
  // =========================================================================
  const handleAddTopic = async (
    courseId: string,
    payload: {
      title: string;
      weekLabel: string;
      notes: string;
      isProcessed: boolean;
    }
  ) => {
    const course = courses.find((c) => c.id === courseId);
    if (!course) return;
    const newId = generateSafeId('topic');

    if (isCloudVerified && user) {
      try {
        await setDoc(doc(db, 'topics', newId), {
          ownerId: user.uid,
          semesterId: course.semesterId,
          courseId: course.id,
          title: clampString(payload.title, VALIDATION_LIMITS.TOPIC_TITLE_MAX),
          weekLabel: clampString(
            payload.weekLabel,
            VALIDATION_LIMITS.TOPIC_WEEK_MAX
          ),
          isProcessed: payload.isProcessed,
          notes: payload.notes.slice(0, VALIDATION_LIMITS.TOPIC_NOTES_MAX),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `topics/${newId}`);
      }
    } else {
      setTopics((prev) => [
        ...prev,
        {
          id: newId,
          ownerId: currentOwnerId,
          semesterId: course.semesterId,
          courseId: course.id,
          title: clampString(payload.title, VALIDATION_LIMITS.TOPIC_TITLE_MAX),
          weekLabel: clampString(
            payload.weekLabel,
            VALIDATION_LIMITS.TOPIC_WEEK_MAX
          ),
          isProcessed: payload.isProcessed,
          notes: payload.notes.slice(0, VALIDATION_LIMITS.TOPIC_NOTES_MAX),
        },
      ]);
    }
  };

  const handleUpdateTopic = async (
    topicId: string,
    updates: Partial<
      Pick<CourseTopic, 'title' | 'weekLabel' | 'isProcessed' | 'notes'>
    >
  ) => {
    const existingTopic = topics.find((t) => t.id === topicId);
    if (!existingTopic) return;

    const isToggleOnly =
      Object.keys(updates).length === 1 && updates.isProcessed !== undefined;

    if (isCloudVerified && user) {
      try {
        if (isToggleOnly) {
          await updateDoc(doc(db, 'topics', topicId), {
            isProcessed: Boolean(updates.isProcessed),
            updatedAt: serverTimestamp(),
          });
        } else {
          await updateDoc(doc(db, 'topics', topicId), {
            title: clampString(
              updates.title ?? existingTopic.title,
              VALIDATION_LIMITS.TOPIC_TITLE_MAX
            ),
            weekLabel: clampString(
              updates.weekLabel ?? existingTopic.weekLabel,
              VALIDATION_LIMITS.TOPIC_WEEK_MAX
            ),
            isProcessed: updates.isProcessed ?? existingTopic.isProcessed,
            notes: (updates.notes ?? existingTopic.notes).slice(
              0,
              VALIDATION_LIMITS.TOPIC_NOTES_MAX
            ),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `topics/${topicId}`);
      }
    } else {
      setTopics((prev) =>
        prev.map((t) =>
          t.id === topicId
            ? {
                ...t,
                title: clampString(
                  updates.title ?? t.title,
                  VALIDATION_LIMITS.TOPIC_TITLE_MAX
                ),
                weekLabel: clampString(
                  updates.weekLabel ?? t.weekLabel,
                  VALIDATION_LIMITS.TOPIC_WEEK_MAX
                ),
                isProcessed: updates.isProcessed ?? t.isProcessed,
                notes: (updates.notes ?? t.notes).slice(
                  0,
                  VALIDATION_LIMITS.TOPIC_NOTES_MAX
                ),
              }
            : t
        )
      );
    }
  };

  const handleDeleteTopic = async (topicId: string) => {
    if (isCloudVerified && user) {
      try {
        await deleteDoc(doc(db, 'topics', topicId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `topics/${topicId}`);
      }
    } else {
      setTopics((prev) => prev.filter((t) => t.id !== topicId));
    }
  };

  // =========================================================================
  // TASKS CRUD HANDLERS
  // =========================================================================
  const handleAddTask = async (
    courseId: string,
    payload: {
      title: string;
      dueDate: string;
      description: string;
      workNotes?: string;
      priority: TaskPriority;
    }
  ) => {
    const course = courses.find((c) => c.id === courseId);
    if (!course) return;
    const newId = generateSafeId('task');
    const cleanWorkNotes = (payload.workNotes || '').slice(
      0,
      VALIDATION_LIMITS.TASK_WORK_NOTES_MAX
    );

    if (isCloudVerified && user) {
      try {
        await setDoc(doc(db, 'tasks', newId), {
          ownerId: user.uid,
          semesterId: course.semesterId,
          courseId: course.id,
          title: clampString(payload.title, VALIDATION_LIMITS.TASK_TITLE_MAX),
          dueDate: clampString(payload.dueDate, VALIDATION_LIMITS.DATE_STR_MAX),
          description: clampString(
            payload.description,
            VALIDATION_LIMITS.TASK_DESC_MAX
          ),
          workNotes: cleanWorkNotes,
          priority: payload.priority,
          isCompleted: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `tasks/${newId}`);
      }
    } else {
      setTasks((prev) => [
        ...prev,
        {
          id: newId,
          ownerId: currentOwnerId,
          semesterId: course.semesterId,
          courseId: course.id,
          title: clampString(payload.title, VALIDATION_LIMITS.TASK_TITLE_MAX),
          dueDate: clampString(payload.dueDate, VALIDATION_LIMITS.DATE_STR_MAX),
          description: clampString(
            payload.description,
            VALIDATION_LIMITS.TASK_DESC_MAX
          ),
          workNotes: cleanWorkNotes,
          priority: payload.priority,
          isCompleted: false,
        },
      ]);
    }
  };

  const handleUpdateTask = async (
    taskId: string,
    updates: Partial<
      Pick<
        CourseTask,
        | 'title'
        | 'dueDate'
        | 'description'
        | 'workNotes'
        | 'priority'
        | 'isCompleted'
      >
    >
  ) => {
    const existingTask = tasks.find((t) => t.id === taskId);
    if (!existingTask) return;

    const isToggleOnly =
      Object.keys(updates).length === 1 && updates.isCompleted !== undefined;
    const isWorkNotesOnly =
      Object.keys(updates).length === 1 && updates.workNotes !== undefined;

    if (isCloudVerified && user) {
      try {
        if (isToggleOnly) {
          await updateDoc(doc(db, 'tasks', taskId), {
            isCompleted: Boolean(updates.isCompleted),
            updatedAt: serverTimestamp(),
          });
        } else if (isWorkNotesOnly) {
          await updateDoc(doc(db, 'tasks', taskId), {
            workNotes: (updates.workNotes ?? '').slice(
              0,
              VALIDATION_LIMITS.TASK_WORK_NOTES_MAX
            ),
            updatedAt: serverTimestamp(),
          });
        } else {
          await updateDoc(doc(db, 'tasks', taskId), {
            title: clampString(
              updates.title ?? existingTask.title,
              VALIDATION_LIMITS.TASK_TITLE_MAX
            ),
            dueDate: clampString(
              updates.dueDate ?? existingTask.dueDate,
              VALIDATION_LIMITS.DATE_STR_MAX
            ),
            description: clampString(
              updates.description ?? existingTask.description,
              VALIDATION_LIMITS.TASK_DESC_MAX
            ),
            workNotes: (
              updates.workNotes ??
              existingTask.workNotes ??
              ''
            ).slice(0, VALIDATION_LIMITS.TASK_WORK_NOTES_MAX),
            priority: updates.priority ?? existingTask.priority,
            isCompleted: updates.isCompleted ?? existingTask.isCompleted,
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `tasks/${taskId}`);
      }
    } else {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                title: clampString(
                  updates.title ?? t.title,
                  VALIDATION_LIMITS.TASK_TITLE_MAX
                ),
                dueDate: clampString(
                  updates.dueDate ?? t.dueDate,
                  VALIDATION_LIMITS.DATE_STR_MAX
                ),
                description: clampString(
                  updates.description ?? t.description,
                  VALIDATION_LIMITS.TASK_DESC_MAX
                ),
                workNotes: (updates.workNotes ?? t.workNotes ?? '').slice(
                  0,
                  VALIDATION_LIMITS.TASK_WORK_NOTES_MAX
                ),
                priority: updates.priority ?? t.priority,
                isCompleted: updates.isCompleted ?? t.isCompleted,
              }
            : t
        )
      );
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (isCloudVerified && user) {
      try {
        await deleteDoc(doc(db, 'tasks', taskId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `tasks/${taskId}`);
      }
    } else {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    }
  };

  // =========================================================================
  // COURSE DATES CRUD HANDLERS
  // =========================================================================
  const handleAddDate = async (
    courseId: string,
    payload: {
      title: string;
      date: string;
      time: string;
      room: string;
      teacher: string;
      category: DateCategory;
    }
  ) => {
    const course = courses.find((c) => c.id === courseId);
    if (!course) return;
    const newId = generateSafeId('date');

    if (isCloudVerified && user) {
      try {
        await setDoc(doc(db, 'courseDates', newId), {
          ownerId: user.uid,
          semesterId: course.semesterId,
          courseId: course.id,
          title: clampString(payload.title, VALIDATION_LIMITS.DATE_TITLE_MAX),
          date: clampString(payload.date, VALIDATION_LIMITS.DATE_STR_MAX),
          time: clampString(payload.time, VALIDATION_LIMITS.TIME_STR_MAX),
          room: clampString(payload.room, VALIDATION_LIMITS.ROOM_MAX),
          teacher: clampString(payload.teacher, VALIDATION_LIMITS.TEACHER_MAX),
          category: payload.category,
          isCompleted: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.CREATE,
          `courseDates/${newId}`
        );
      }
    } else {
      setDates((prev) => [
        ...prev,
        {
          id: newId,
          ownerId: currentOwnerId,
          semesterId: course.semesterId,
          courseId: course.id,
          title: clampString(payload.title, VALIDATION_LIMITS.DATE_TITLE_MAX),
          date: clampString(payload.date, VALIDATION_LIMITS.DATE_STR_MAX),
          time: clampString(payload.time, VALIDATION_LIMITS.TIME_STR_MAX),
          room: clampString(payload.room, VALIDATION_LIMITS.ROOM_MAX),
          teacher: clampString(payload.teacher, VALIDATION_LIMITS.TEACHER_MAX),
          category: payload.category,
          isCompleted: false,
        },
      ]);
    }
  };

  const handleUpdateDate = async (
    dateId: string,
    updates: Partial<
      Pick<
        CourseDate,
        'title' | 'date' | 'time' | 'room' | 'teacher' | 'category' | 'isCompleted'
      >
    >
  ) => {
    const existingDate = dates.find((d) => d.id === dateId);
    if (!existingDate) return;

    const isToggleOnly =
      Object.keys(updates).length === 1 && updates.isCompleted !== undefined;

    if (isCloudVerified && user) {
      try {
        if (isToggleOnly) {
          await updateDoc(doc(db, 'courseDates', dateId), {
            isCompleted: Boolean(updates.isCompleted),
            updatedAt: serverTimestamp(),
          });
        } else {
          await updateDoc(doc(db, 'courseDates', dateId), {
            title: clampString(
              updates.title ?? existingDate.title,
              VALIDATION_LIMITS.DATE_TITLE_MAX
            ),
            date: clampString(
              updates.date ?? existingDate.date,
              VALIDATION_LIMITS.DATE_STR_MAX
            ),
            time: clampString(
              updates.time ?? existingDate.time,
              VALIDATION_LIMITS.TIME_STR_MAX
            ),
            room: clampString(
              updates.room ?? existingDate.room,
              VALIDATION_LIMITS.ROOM_MAX
            ),
            teacher: clampString(
              updates.teacher ?? existingDate.teacher,
              VALIDATION_LIMITS.TEACHER_MAX
            ),
            category: updates.category ?? existingDate.category,
            isCompleted: updates.isCompleted ?? existingDate.isCompleted,
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.UPDATE,
          `courseDates/${dateId}`
        );
      }
    } else {
      setDates((prev) =>
        prev.map((d) => (d.id === dateId ? { ...d, ...updates } : d))
      );
    }
  };

  const handleDeleteDate = async (dateId: string) => {
    if (isCloudVerified && user) {
      try {
        await deleteDoc(doc(db, 'courseDates', dateId));
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.DELETE,
          `courseDates/${dateId}`
        );
      }
    } else {
      setDates((prev) => prev.filter((d) => d.id !== dateId));
    }
  };

  const courseById = useMemo(() => {
    const map: Record<string, Course> = {};
    courses.forEach((c) => {
      map[c.id] = c;
    });
    return map;
  }, [courses]);

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] text-[#0F172A] p-6">
        <div className="text-sm text-slate-600">
          Načítám přihlášení do Studijního deníku...
        </div>
      </div>
    );
  }

  if (!activeSession) {
    return (
      <AuthScreen
        onAuthenticated={handleAuthenticatedSession}
        onGoogleSignIn={handleGoogleSignIn}
        externalError={authError}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
      {/* =================================================================== */}
      {/* TOP BAR CONTRACT: Strictly 3 zones (Brand | 4 Nav Links | 2 Actions) */}
      {/* =================================================================== */}
      <header className="flex items-center justify-between px-6 py-3.5 bg-white border-b border-slate-200 sticky top-0 z-20">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#prehled"
          onClick={(e) => {
            e.preventDefault();
            setActiveNav('courses');
          }}
          className="text-lg font-bold tracking-tight text-[#003865] whitespace-nowrap"
        >
          Studijní deník
        </a>

        {/* Zone 2: 4 clean text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <a
            href="#predmety"
            onClick={(e) => {
              e.preventDefault();
              setActiveNav('courses');
            }}
            className={`transition-colors whitespace-nowrap pb-0.5 ${
              activeNav === 'courses'
                ? 'text-[#003865] font-semibold underline underline-offset-8 decoration-2 decoration-[#003865]'
                : 'hover:text-slate-900 hover:underline underline-offset-8'
            }`}
          >
            Předměty v semestru
          </a>
          <a
            href="#ukoly"
            onClick={(e) => {
              e.preventDefault();
              setActiveNav('agenda');
            }}
            className={`transition-colors whitespace-nowrap pb-0.5 ${
              activeNav === 'agenda'
                ? 'text-[#003865] font-semibold underline underline-offset-8 decoration-2 decoration-[#003865]'
                : 'hover:text-slate-900 hover:underline underline-offset-8'
            }`}
          >
            Úkoly a termíny
          </a>
          <a
            href="#zapisy"
            onClick={(e) => {
              e.preventDefault();
              setActiveNav('notes');
            }}
            className={`transition-colors whitespace-nowrap pb-0.5 ${
              activeNav === 'notes'
                ? 'text-[#003865] font-semibold underline underline-offset-8 decoration-2 decoration-[#003865]'
                : 'hover:text-slate-900 hover:underline underline-offset-8'
            }`}
          >
            Studijní zápisy
          </a>
          <a
            href="#statistiky"
            onClick={(e) => {
              e.preventDefault();
              setActiveNav('overview');
            }}
            className={`transition-colors whitespace-nowrap pb-0.5 ${
              activeNav === 'overview'
                ? 'text-[#003865] font-semibold underline underline-offset-8 decoration-2 decoration-[#003865]'
                : 'hover:text-slate-900 hover:underline underline-offset-8'
            }`}
          >
            Přehled studia
          </a>
        </nav>

        {/* Zone 3: 1-2 Primary Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowNewCourseModal(true)}
            disabled={!activeSemester}
            className="px-3.5 py-2 text-xs font-medium text-white bg-[#003865] rounded-md hover:bg-[#002848] transition-colors whitespace-nowrap disabled:opacity-50"
          >
            + Přidat předmět
          </button>

          <button
            type="button"
            onClick={handleSignOut}
            title={`Přihlášený účet: @${activeSession.nickname} (${activeSession.email}) — Kliknutím přejdete na Přihlášení / Registraci`}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 border border-slate-300 rounded-md hover:bg-slate-200 transition-colors whitespace-nowrap"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>@{activeSession.nickname} · Odhlásit / Jiný účet</span>
          </button>
        </div>
      </header>

      {/* =================================================================== */}
      {/* WORKSPACE CANVAS: Left Sidebar (Semesters) + Main Viewport          */}
      {/* =================================================================== */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-[1440px] w-full mx-auto">
        {/* Left Sidebar: Semesters Management (260px on desktop) */}
        <aside className="w-full lg:w-[270px] shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 p-5 flex flex-col justify-between gap-6">
          <div className="space-y-5">
            {/* Mobile Nav Switcher */}
            <div className="flex md:hidden items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveNav('courses')}
                className={`px-2.5 py-1.5 text-xs font-medium rounded whitespace-nowrap ${
                  activeNav === 'courses'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600'
                }`}
              >
                Předměty
              </button>
              <button
                type="button"
                onClick={() => setActiveNav('agenda')}
                className={`px-2.5 py-1.5 text-xs font-medium rounded whitespace-nowrap ${
                  activeNav === 'agenda'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600'
                }`}
              >
                Úkoly a termíny
              </button>
              <button
                type="button"
                onClick={() => setActiveNav('notes')}
                className={`px-2.5 py-1.5 text-xs font-medium rounded whitespace-nowrap ${
                  activeNav === 'notes'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600'
                }`}
              >
                Zápisy
              </button>
              <button
                type="button"
                onClick={() => setActiveNav('overview')}
                className={`px-2.5 py-1.5 text-xs font-medium rounded whitespace-nowrap ${
                  activeNav === 'overview'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600'
                }`}
              >
                Přehled
              </button>
            </div>

            {/* Semesters Header + Add Semester Button */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold text-slate-900">
                  Semestry studia
                </h2>
                <button
                  type="button"
                  onClick={openCreateSemesterModal}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#003865] hover:underline whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Přidat semestr
                </button>
              </div>

              {/* Semesters List */}
              {semesters.length === 0 ? (
                <div className="p-3 border border-dashed border-slate-300 rounded text-xs text-slate-500">
                  Zatím nemáte vytvořený žádný semestr.
                </div>
              ) : (
                <div className="space-y-1">
                  {semesters.map((sem) => {
                    const isSelected = activeSemester?.id === sem.id;
                    const semCourses = courses.filter(
                      (c) => c.semesterId === sem.id
                    );
                    const semDone = semCourses.filter((c) => c.isCompleted).length;

                    return (
                      <div
                        key={sem.id}
                        className={`group flex items-center justify-between rounded-md px-3 py-2.5 text-left transition-colors ${
                          isSelected
                            ? 'bg-[#003865] text-white'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedSemesterId(sem.id)}
                          className="flex-1 text-left min-w-0"
                        >
                          <div className="text-sm font-semibold truncate">
                            {sem.title}
                          </div>
                          <div
                            className={`text-xs flex items-center gap-1.5 mt-0.5 ${
                              isSelected ? 'text-sky-100' : 'text-slate-500'
                            }`}
                          >
                            <span>{sem.period}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">
                              {sem.academicYear}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">
                              {semDone}/{semCourses.length} předm.
                            </span>
                          </div>
                        </button>

                        {/* Edit & Delete Semester Actions */}
                        <div className="flex items-center gap-1 ml-2 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditSemesterModal(sem);
                            }}
                            title="Upravit semestr"
                            className={`p-1 rounded transition-colors ${
                              isSelected
                                ? 'text-sky-200 hover:text-white hover:bg-white/10'
                                : 'text-slate-400 hover:text-slate-700'
                            }`}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSemesterToDelete(sem);
                            }}
                            title="Smazat semestr"
                            className={`p-1 rounded transition-colors ${
                              isSelected
                                ? 'text-sky-200 hover:text-red-200 hover:bg-white/10'
                                : 'text-slate-400 hover:text-red-600'
                            }`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Active Semester Progress Summary */}
            {activeSemester && (
              <div className="pt-4 border-t border-slate-200 space-y-3">
                <div className="text-xs font-semibold text-slate-900">
                  Bilance: {activeSemester.title}
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Ukončené předměty</span>
                    <span className="font-mono font-semibold text-slate-900 tabular-nums">
                      {completedCoursesCount} / {semesterCourses.length}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 transition-transform duration-200 origin-left"
                      style={{
                        transform: `scaleX(${
                          semesterCourses.length > 0
                            ? completedCoursesCount / semesterCourses.length
                            : 0
                        })`,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-slate-600 pt-1">
                    <span>Splněné kredity</span>
                    <span className="font-mono font-semibold text-slate-900 tabular-nums">
                      {earnedCredits} / {totalCredits} kr.
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600 pt-1">
                    <span>Zpracovaná témata</span>
                    <span className="font-mono font-semibold text-slate-900 tabular-nums">
                      {processedTopicsCount} / {semesterTopics.length}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600 pt-1">
                    <span>Odevzdané úkoly</span>
                    <span className="font-mono font-semibold text-slate-900 tabular-nums">
                      {completedTasksCount} / {semesterTasks.length}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Account / Student Profile Info */}
          <div className="pt-4 border-t border-slate-200 text-xs text-slate-500 space-y-2.5">
            <div className="space-y-2">
              <div>
                <div className="font-semibold text-slate-900">
                  Přihlášený student
                </div>
                <div className="text-xs font-semibold text-[#003865] truncate mt-0.5">
                  @{activeSession.nickname}
                </div>
                <div className="truncate font-mono text-[11px] text-slate-600 mt-0.5">
                  {activeSession.email}
                </div>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Zobrazují se výhradně předměty, úkoly a zápisy vašeho účtu.
              </p>

              {activeSession.isFirebaseAuth && !activeSession.isEmailVerified && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-900 space-y-1.5">
                  <div>
                    Potvrďte svůj e-mail pro plnou cloudovou synchronizaci mezi zařízeními.
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={handleRefreshEmailVerification}
                      className="px-2 py-1 text-[11px] font-medium bg-white border border-amber-300 rounded hover:bg-amber-100 transition-colors"
                    >
                      Hotovo, zkontrolovat
                    </button>
                    <button
                      type="button"
                      onClick={handleResendVerificationEmail}
                      className="px-2 py-1 text-[11px] font-medium text-amber-800 hover:underline"
                    >
                      Znovu poslat e-mail
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="px-2.5 py-1 text-[11px] font-medium text-[#003865] bg-sky-50 rounded hover:bg-sky-100 transition-colors whitespace-nowrap"
                >
                  Přepnout účet
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="px-2.5 py-1 text-[11px] font-medium text-slate-600 bg-slate-100 rounded hover:bg-slate-200 transition-colors whitespace-nowrap"
                >
                  Odhlásit se
                </button>
              </div>
            </div>
            {authError && (
              <p className="text-xs text-red-600 font-medium">{authError}</p>
            )}
          </div>
        </aside>

        {/* Main Content Viewport */}
        <main className="flex-1 p-6 lg:p-8 space-y-6 min-w-0">
          {authNotice && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-md flex items-center justify-between gap-3 text-xs text-emerald-900">
              <span>{authNotice}</span>
              <button
                type="button"
                onClick={() => setAuthNotice(null)}
                className="text-emerald-700 hover:text-emerald-950 font-medium shrink-0"
              >
                Zavřít
              </button>
            </div>
          )}

          {(isSeedingCloud || isLoadingUserCloud) && (
            <div className="p-4 bg-sky-50 border border-sky-200 rounded-md text-xs text-sky-900">
              {isSeedingCloud
                ? 'Připravuji váš osobní studijní profil a výchozí předměty 1. semestru...'
                : 'Načítám vaše osobní studijní záznamy...'}
            </div>
          )}

          {!activeSemester ? (
            <div className="bg-white border border-slate-200 rounded-md p-10 text-center space-y-3">
              <h1 className="text-lg font-semibold text-slate-900">
                Vítejte ve Studijním deníku
              </h1>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                Začněte vytvořením prvního semestru, do kterého si můžete přidat své předměty, termíny, úkoly a studijní zápisy.
              </p>
              <button
                type="button"
                onClick={openCreateSemesterModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#003865] rounded-md hover:bg-[#002848]"
              >
                <Plus className="w-4 h-4" />
                Vytvořit 1. semestr
              </button>
            </div>
          ) : (
            <>
              {/* =========================================================== */}
              {/* VIEW 1: PŘEDMĚTY V SEMESTRU (Main Course Accordion List)    */}
              {/* =========================================================== */}
              {activeNav === 'courses' && (
                <div className="space-y-5">
                  {/* Context Header */}
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-slate-200">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>{activeSemester.period}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          Akademický rok {activeSemester.academicYear}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          {semesterCourses.length} předmětů ({totalCredits} kreditů)
                        </span>
                      </div>
                      <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
                        {activeSemester.title} — Moje předměty
                      </h1>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditSemesterModal(activeSemester)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Upravit semestr
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowNewCourseModal(true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-[#003865] rounded-md hover:bg-[#002848] transition-colors whitespace-nowrap"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Přidat předmět do semestru
                      </button>
                    </div>
                  </div>

                  {/* Filter & Search Toolbar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Interactive Filter Segmented Control */}
                    <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg w-fit">
                      <button
                        type="button"
                        onClick={() => setCourseFilter('all')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                          courseFilter === 'all'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Všechny předměty ({semesterCourses.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setCourseFilter('active')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                          courseFilter === 'active'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Probíhající (
                        {semesterCourses.length - completedCoursesCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setCourseFilter('completed')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                          courseFilter === 'completed'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Ukončené / splněné ({completedCoursesCount})
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative flex-1 sm:w-64">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={courseSearch}
                          onChange={(e) => setCourseSearch(e.target.value)}
                          placeholder="Hledat kód, předmět, vyučujícího..."
                          className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#003865]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Course Accordion List */}
                  {filteredSemesterCourses.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-md p-8 text-center space-y-2">
                      <p className="text-sm text-slate-600">
                        {semesterCourses.length === 0
                          ? 'V tomto semestru zatím nejsou žádné předměty. Přidejte si svůj první předmět.'
                          : 'Žádný předmět neodpovídá zvolenému filtru.'}
                      </p>
                      <div className="flex items-center justify-center gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowNewCourseModal(true)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-[#003865] rounded-md hover:bg-[#002848] transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Přidat předmět
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {filteredSemesterCourses.map((course) => (
                        <CourseAccordionItem
                          key={course.id}
                          course={course}
                          isExpanded={Boolean(expandedCourseIds[course.id])}
                          onToggleExpand={() =>
                            setExpandedCourseIds((prev) => ({
                              ...prev,
                              [course.id]: !prev[course.id],
                            }))
                          }
                          topics={semesterTopics.filter(
                            (t) => t.courseId === course.id
                          )}
                          tasks={semesterTasks.filter(
                            (t) => t.courseId === course.id
                          )}
                          dates={semesterDates.filter(
                            (d) => d.courseId === course.id
                          )}
                          onToggleCourseCompleted={handleToggleCourseCompleted}
                          onUpdateCourse={handleUpdateCourse}
                          onDeleteCourse={handleDeleteCourse}
                          onAddTopic={handleAddTopic}
                          onUpdateTopic={handleUpdateTopic}
                          onDeleteTopic={handleDeleteTopic}
                          onAddTask={handleAddTask}
                          onUpdateTask={handleUpdateTask}
                          onDeleteTask={handleDeleteTask}
                          onAddDate={handleAddDate}
                          onUpdateDate={handleUpdateDate}
                          onDeleteDate={handleDeleteDate}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* =========================================================== */}
              {/* VIEW 2: ÚKOLY K ODEVZDÁNÍ A TERMÍNY PŘEDMĚTŮ                */}
              {/* =========================================================== */}
              {activeNav === 'agenda' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-slate-200">
                    <div>
                      <div className="text-xs text-slate-500">
                        {activeSemester.title} · {activeSemester.academicYear}
                      </div>
                      <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
                        Úkoly k odevzdání a termíny předmětů
                      </h1>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
                        <button
                          type="button"
                          onClick={() => setAgendaFilter('all')}
                          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                            agendaFilter === 'all'
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Vše
                        </button>
                        <button
                          type="button"
                          onClick={() => setAgendaFilter('pending')}
                          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                            agendaFilter === 'pending'
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Aktivní / Nesplněné
                        </button>
                        <button
                          type="button"
                          onClick={() => setAgendaFilter('completed')}
                          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                            agendaFilter === 'completed'
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Hotové
                        </button>
                      </div>

                      {semesterCourses.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setQuickTaskCourseId(semesterCourses[0].id);
                            setShowQuickTaskModal(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#003865] rounded-md hover:bg-[#002848] whitespace-nowrap"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Nový úkol
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    {/* Left: Tasks to submit */}
                    <div className="space-y-3">
                      <h2 className="text-sm font-semibold text-slate-900">
                        Úkoly k odevzdání ({semesterTasks.length})
                      </h2>
                      <div className="bg-white border border-slate-200 rounded-md divide-y divide-slate-200">
                        {semesterTasks
                          .filter((t) => {
                            if (agendaFilter === 'pending') return !t.isCompleted;
                            if (agendaFilter === 'completed') return t.isCompleted;
                            return true;
                          })
                          .map((task) => {
                            const c = courseById[task.courseId];
                            const hasWorkNotes =
                              stripHtmlToText(task.workNotes || '').length > 0;
                            const isNotesOpen = agendaOpenNotesTaskId === task.id;
                            return (
                              <div
                                key={task.id}
                                className="p-4 space-y-3 hover:bg-slate-50/70 transition-colors"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-3 min-w-0 flex-1">
                                    <input
                                      type="checkbox"
                                      checked={task.isCompleted}
                                      onChange={() =>
                                        handleUpdateTask(task.id, {
                                          isCompleted: !task.isCompleted,
                                        })
                                      }
                                      className="mt-1 h-4 w-4 rounded border-slate-300 text-[#003865]"
                                    />
                                    <div className="min-w-0 flex-1">
                                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                                        <span className="font-mono font-semibold text-slate-800">
                                          {c?.code || 'Předmět'}
                                        </span>
                                        <span aria-hidden="true">·</span>
                                        <span className="truncate">
                                          {c?.name || ''}
                                        </span>
                                      </div>
                                      <p
                                        className={`text-sm font-medium mt-0.5 ${
                                          task.isCompleted
                                            ? 'text-slate-400 line-through'
                                            : 'text-slate-900'
                                        }`}
                                      >
                                        {task.title}
                                      </p>
                                      {task.description && (
                                        <p className="text-xs text-slate-600 mt-0.5">
                                          {task.description}
                                        </p>
                                      )}
                                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                                        <span>
                                          Termín:{' '}
                                          <span className="font-mono tabular-nums text-slate-800">
                                            {task.dueDate || 'Neurčeno'}
                                          </span>
                                        </span>
                                        <span aria-hidden="true">·</span>
                                        <span
                                          className={
                                            task.priority === 'Vysoká'
                                              ? 'text-red-700 font-medium'
                                              : 'text-slate-500'
                                          }
                                        >
                                          Priorita: {task.priority}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (isNotesOpen) {
                                          setAgendaOpenNotesTaskId(null);
                                        } else {
                                          setAgendaOpenNotesTaskId(task.id);
                                          setAgendaWorkNotesDraft(
                                            task.workNotes || ''
                                          );
                                        }
                                      }}
                                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                                        isNotesOpen
                                          ? 'bg-[#003865] text-white'
                                          : hasWorkNotes
                                          ? 'text-[#003865] bg-sky-50 hover:bg-sky-100'
                                          : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
                                      }`}
                                    >
                                      <FileText className="w-3.5 h-3.5" />
                                      <span>
                                        {hasWorkNotes
                                          ? 'Poznámky k vypracování'
                                          : '+ Poznámky'}
                                      </span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteTask(task.id)}
                                      className="p-1 text-slate-400 hover:text-red-600 shrink-0"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {isNotesOpen && (
                                  <form
                                    onSubmit={(e) => {
                                      e.preventDefault();
                                      handleUpdateTask(task.id, {
                                        workNotes: agendaWorkNotesDraft,
                                      });
                                      setAgendaWorkNotesSavedId(task.id);
                                      setTimeout(() => {
                                        setAgendaWorkNotesSavedId((prev) =>
                                          prev === task.id ? null : prev
                                        );
                                      }, 2000);
                                    }}
                                    className="pl-7 pt-2 space-y-2.5"
                                  >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold text-slate-800">
                                          Poznámky při vypracovávání úkolu
                                        </span>
                                        {agendaWorkNotesSavedId === task.id && (
                                          <span className="text-xs font-medium text-emerald-700">
                                            · Uloženo
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setAgendaOpenNotesTaskId(null)
                                          }
                                          className="px-2 py-1 text-xs text-slate-500 hover:text-slate-900"
                                        >
                                          Skrýt
                                        </button>
                                        <button
                                          type="submit"
                                          className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-white bg-[#003865] rounded hover:bg-[#002848] whitespace-nowrap"
                                        >
                                          <Save className="w-3.5 h-3.5" />
                                          Uložit poznámky
                                        </button>
                                      </div>
                                    </div>
                                    <RichNoteEditor
                                      value={agendaWorkNotesDraft}
                                      onChange={setAgendaWorkNotesDraft}
                                      placeholder="Pište si sem postup vypracování, osnovu, literaturu nebo poznámky k úkolu..."
                                      minHeightClass="min-h-[140px]"
                                      maxLength={
                                        VALIDATION_LIMITS.TASK_WORK_NOTES_MAX
                                      }
                                    />
                                  </form>
                                )}
                              </div>
                            );
                          })}
                        {semesterTasks.length === 0 && (
                          <div className="p-6 text-center text-xs text-slate-500">
                            Žádné úkoly k odevzdání v tomto semestru.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Course Dates / Exam Dates */}
                    <div className="space-y-3">
                      <h2 className="text-sm font-semibold text-slate-900">
                        Termíny předmětů a zkoušek ({semesterDates.length})
                      </h2>
                      <div className="bg-white border border-slate-200 rounded-md divide-y divide-slate-200">
                        {semesterDates
                          .filter((d) => {
                            if (agendaFilter === 'pending') return !d.isCompleted;
                            if (agendaFilter === 'completed') return d.isCompleted;
                            return true;
                          })
                          .map((item) => {
                            const c = courseById[item.courseId];
                            return (
                              <div
                                key={item.id}
                                className="p-4 flex items-start justify-between gap-3 hover:bg-slate-50"
                              >
                                <div className="flex items-start gap-3 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={item.isCompleted}
                                    onChange={() =>
                                      handleUpdateDate(item.id, {
                                        isCompleted: !item.isCompleted,
                                      })
                                    }
                                    className="mt-1 h-4 w-4 rounded border-slate-300 text-[#003865]"
                                  />
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                                      <span className="font-mono font-semibold text-slate-800">
                                        {c?.code || 'Předmět'}
                                      </span>
                                      <span aria-hidden="true">·</span>
                                      <span>{item.category}</span>
                                    </div>
                                    <p
                                      className={`text-sm font-medium mt-0.5 ${
                                        item.isCompleted
                                          ? 'text-slate-400 line-through'
                                          : 'text-slate-900'
                                      }`}
                                    >
                                      {item.title}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                                      <span className="font-mono tabular-nums text-slate-800">
                                        {item.date}
                                        {item.time ? ` (${item.time})` : ''}
                                      </span>
                                      {item.room && (
                                        <>
                                          <span aria-hidden="true">·</span>
                                          <span>{item.room}</span>
                                        </>
                                      )}
                                      {item.teacher && (
                                        <>
                                          <span aria-hidden="true">·</span>
                                          <span>{item.teacher}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDate(item.id)}
                                  className="p-1 text-slate-400 hover:text-red-600 shrink-0"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            );
                          })}
                        {semesterDates.length === 0 && (
                          <div className="p-6 text-center text-xs text-slate-500">
                            Žádné evidované termíny v tomto semestru.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* =========================================================== */}
              {/* VIEW 3: STUDIJNÍ ZÁPISY (All Topics & Notes across courses) */}
              {/* =========================================================== */}
              {activeNav === 'notes' && (
                <div className="space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-slate-200">
                    <div>
                      <div className="text-xs text-slate-500">
                        {activeSemester.title} · Zápisy k probíraným tématům
                      </div>
                      <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
                        Studijní zápisy a poznámky
                      </h1>
                    </div>

                    <div className="relative w-full sm:w-72">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={notesSearch}
                        onChange={(e) => setNotesSearch(e.target.value)}
                        placeholder="Hledat v tématech a zápisech..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#003865]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left: Topics list across all courses in semester */}
                    <div className="lg:col-span-5 bg-white border border-slate-200 rounded-md divide-y divide-slate-200">
                      {semesterTopics
                        .filter((t) => {
                          if (!notesSearch.trim()) return true;
                          const q = notesSearch.toLowerCase();
                          const c = courseById[t.courseId];
                          return (
                            t.title.toLowerCase().includes(q) ||
                            t.notes.toLowerCase().includes(q) ||
                            (c && c.code.toLowerCase().includes(q)) ||
                            (c && c.name.toLowerCase().includes(q))
                          );
                        })
                        .map((topic) => {
                          const c = courseById[topic.courseId];
                          const isSelected = activeGlobalTopic?.id === topic.id;
                          return (
                            <div
                              key={topic.id}
                              className={`p-3.5 flex items-start gap-3 transition-colors ${
                                isSelected ? 'bg-sky-50/70' : 'hover:bg-slate-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={topic.isProcessed}
                                onChange={() =>
                                  handleUpdateTopic(topic.id, {
                                    isProcessed: !topic.isProcessed,
                                  })
                                }
                                className="mt-1 h-4 w-4 rounded border-slate-300 text-[#003865] shrink-0"
                              />
                              <button
                                type="button"
                                onClick={() => setSelectedGlobalTopicId(topic.id)}
                                className="flex-1 text-left min-w-0"
                              >
                                <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                                  <span className="font-mono font-semibold text-slate-800">
                                    {c?.code || 'Předmět'}
                                  </span>
                                  {topic.weekLabel && (
                                    <>
                                      <span aria-hidden="true">·</span>
                                      <span className="font-mono">
                                        {topic.weekLabel}
                                      </span>
                                    </>
                                  )}
                                  <span aria-hidden="true">·</span>
                                  <span
                                    className={
                                      topic.isProcessed
                                        ? 'text-emerald-700 font-medium'
                                        : 'text-slate-500'
                                    }
                                  >
                                    {topic.isProcessed
                                      ? 'Zpracováno'
                                      : 'Ke zpracování'}
                                  </span>
                                </div>
                                <p className="text-sm font-medium text-slate-900 mt-0.5">
                                  {topic.title}
                                </p>
                              </button>
                            </div>
                          );
                        })}
                      {semesterTopics.length === 0 && (
                        <div className="p-6 text-center text-xs text-slate-500">
                          V tomto semestru zatím nejsou žádná témata. Přidejte téma u libovolného předmětu.
                        </div>
                      )}
                    </div>

                    {/* Right: Full-size Note Editor */}
                    <div className="lg:col-span-7 bg-white border border-slate-200 rounded-md p-5">
                      {activeGlobalTopic ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleUpdateTopic(activeGlobalTopic.id, {
                              notes: globalNoteDraft,
                              isProcessed: activeGlobalTopic.isProcessed,
                            });
                            setGlobalNoteSaved(true);
                            setTimeout(() => setGlobalNoteSaved(false), 2000);
                          }}
                          className="space-y-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
                            <div>
                              <div className="text-xs text-slate-500">
                                {courseById[activeGlobalTopic.courseId]?.code} ·{' '}
                                {courseById[activeGlobalTopic.courseId]?.name}
                              </div>
                              <h2 className="text-base font-semibold text-slate-900 mt-0.5">
                                {activeGlobalTopic.title}
                              </h2>
                            </div>
                            <div className="flex items-center gap-3">
                              <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={activeGlobalTopic.isProcessed}
                                  onChange={() =>
                                    handleUpdateTopic(activeGlobalTopic.id, {
                                      isProcessed: !activeGlobalTopic.isProcessed,
                                    })
                                  }
                                  className="h-4 w-4 rounded border-slate-300 text-[#003865]"
                                />
                                <span>Zpracováno</span>
                              </label>
                              <button
                                type="submit"
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-[#003865] rounded hover:bg-[#002848]"
                              >
                                <Save className="w-3.5 h-3.5" />
                                Uložit zápis
                              </button>
                            </div>
                          </div>

                          {globalNoteSaved && (
                            <div className="text-xs font-medium text-emerald-700">
                              Studijní zápis byl úspěšně uložen.
                            </div>
                          )}

                          <RichNoteEditor
                            value={globalNoteDraft}
                            onChange={setGlobalNoteDraft}
                            placeholder="Zde pište studijní zápis k probíranému tématu (můžete použít zvýraznění, tučné písmo, kurzívu či odrážky)..."
                            minHeightClass="min-h-[320px]"
                            maxLength={VALIDATION_LIMITS.TOPIC_NOTES_MAX}
                          />
                        </form>
                      ) : (
                        <div className="py-12 text-center text-sm text-slate-500">
                          Vyberte téma v seznamu vlevo pro zobrazení nebo úpravu zápisu.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* =========================================================== */}
              {/* VIEW 4: PŘEHLED STUDIA (Tabular Semester & Course Matrix)   */}
              {/* =========================================================== */}
              {activeNav === 'overview' && (
                <div className="space-y-6">
                  <div className="pb-4 border-b border-slate-200">
                    <div className="text-xs text-slate-500">
                      Souhrnná evidence plnění a ukončení předmětů
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
                      Přehled studia — {activeSemester.title}
                    </h1>
                  </div>

                  {/* High-Density Tabular Course Completion Table */}
                  <div className="bg-white border border-slate-200 rounded-md overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                          <th className="py-3 px-4">Kód</th>
                          <th className="py-3 px-4">Předmět</th>
                          <th className="py-3 px-4">Vyučující a místnost</th>
                          <th className="py-3 px-4">Ukončení</th>
                          <th className="py-3 px-4 text-right">Kredity</th>
                          <th className="py-3 px-4 text-right">Témata</th>
                          <th className="py-3 px-4 text-right">Úkoly</th>
                          <th className="py-3 px-4 text-right">Stav předmětu</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-sm">
                        {semesterCourses.map((c) => {
                          const cTopics = semesterTopics.filter(
                            (t) => t.courseId === c.id
                          );
                          const cTopicsDone = cTopics.filter(
                            (t) => t.isProcessed
                          ).length;
                          const cTasks = semesterTasks.filter(
                            (t) => t.courseId === c.id
                          );
                          const cTasksDone = cTasks.filter(
                            (t) => t.isCompleted
                          ).length;

                          return (
                            <tr
                              key={c.id}
                              className="hover:bg-slate-50 transition-colors"
                            >
                              <td className="py-3 px-4 font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                                {c.code}
                              </td>
                              <td className="py-3 px-4 font-medium text-slate-900">
                                {c.name}
                              </td>
                              <td className="py-3 px-4 text-xs text-slate-600">
                                {c.teacher || '—'}
                                {c.room ? ` · ${c.room}` : ''}
                              </td>
                              <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">
                                {c.completionType}
                              </td>
                              <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-slate-800">
                                {c.credits}
                              </td>
                              <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-slate-600">
                                {cTopicsDone}/{cTopics.length}
                              </td>
                              <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-slate-600">
                                {cTasksDone}/{cTasks.length}
                              </td>
                              <td className="py-3 px-4 text-right whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => handleToggleCourseCompleted(c)}
                                  className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                                    c.isCompleted
                                      ? 'text-emerald-700'
                                      : 'text-slate-500 hover:text-slate-900'
                                  }`}
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  {c.isCompleted ? 'Ukončeno' : 'Probíhá'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* =================================================================== */}
      {/* MODAL 1: CREATE / EDIT SEMESTER                                     */}
      {/* =================================================================== */}
      {semesterModalMode !== 'closed' && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                {semesterModalMode === 'create'
                  ? 'Přidat nový semestr'
                  : 'Upravit semestr'}
              </h3>
              <button
                type="button"
                onClick={() => setSemesterModalMode('closed')}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSemester} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Název semestru *
                </label>
                <input
                  type="text"
                  required
                  value={semTitleInput}
                  onChange={(e) => setSemTitleInput(e.target.value)}
                  placeholder="např. 2. semestr"
                  maxLength={VALIDATION_LIMITS.SEMESTER_TITLE_MAX}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:border-[#003865]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Období
                  </label>
                  <select
                    value={semPeriodInput}
                    onChange={(e) =>
                      setSemPeriodInput(e.target.value as SemesterPeriod)
                    }
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:border-[#003865]"
                  >
                    <option value="Podzim">Podzim</option>
                    <option value="Jaro">Jaro</option>
                    <option value="Celoroční">Celoroční</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Akademický rok *
                  </label>
                  <input
                    type="text"
                    required
                    value={semYearInput}
                    onChange={(e) => setSemYearInput(e.target.value)}
                    placeholder="2026/2027"
                    maxLength={VALIDATION_LIMITS.ACADEMIC_YEAR_MAX}
                    className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded focus:outline-none focus:border-[#003865]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Pořadí semestru
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={semOrderInput}
                  onChange={(e) => setSemOrderInput(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded focus:outline-none focus:border-[#003865]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSemesterModalMode('closed')}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-[#003865] rounded-md hover:bg-[#002848]"
                >
                  Uložit semestr
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 2: CONFIRM DELETE SEMESTER                                    */}
      {/* =================================================================== */}
      {semesterToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-semibold text-slate-900">
              Smazat {semesterToDelete.title}?
            </h3>
            <p className="text-sm text-slate-600">
              Tímto trvale odstraníte semestr{' '}
              <strong className="font-semibold text-slate-900">
                {semesterToDelete.title} ({semesterToDelete.academicYear})
              </strong>{' '}
              včetně všech jeho předmětů, termínů, úkolů a studijních zápisů.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSemesterToDelete(null)}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Zrušit
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSemester}
                className="px-4 py-2 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Ano, smazat semestr
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 3: ADD NEW COURSE TO SEMESTER                                 */}
      {/* =================================================================== */}
      {showNewCourseModal && activeSemester && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                Přidat předmět do: {activeSemester.title}
              </h3>
              <button
                type="button"
                onClick={() => setShowNewCourseModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCourse} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Kód předmětu *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCourseCode}
                    onChange={(e) => setNewCourseCode(e.target.value)}
                    placeholder="např. ISKB09"
                    maxLength={VALIDATION_LIMITS.COURSE_CODE_MAX}
                    className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded focus:outline-none focus:border-[#003865]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Název předmětu *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCourseName}
                    onChange={(e) => setNewCourseName(e.target.value)}
                    placeholder="např. Organizace znalostí"
                    maxLength={VALIDATION_LIMITS.COURSE_NAME_MAX}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:border-[#003865]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Vyučující
                  </label>
                  <input
                    type="text"
                    value={newCourseTeacher}
                    onChange={(e) => setNewCourseTeacher(e.target.value)}
                    placeholder="Jméno vyučujícího"
                    maxLength={VALIDATION_LIMITS.TEACHER_MAX}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:border-[#003865]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Místnost
                  </label>
                  <input
                    type="text"
                    value={newCourseRoom}
                    onChange={(e) => setNewCourseRoom(e.target.value)}
                    placeholder="např. Učebna A22"
                    maxLength={VALIDATION_LIMITS.ROOM_MAX}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:border-[#003865]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Rozvrh / čas výuky
                  </label>
                  <input
                    type="text"
                    value={newCourseSchedule}
                    onChange={(e) => setNewCourseSchedule(e.target.value)}
                    placeholder="Út 10:00–11:40"
                    maxLength={VALIDATION_LIMITS.SCHEDULE_MAX}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:border-[#003865]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Způsob ukončení
                  </label>
                  <select
                    value={newCourseCompletion}
                    onChange={(e) =>
                      setNewCourseCompletion(e.target.value as CompletionType)
                    }
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:border-[#003865]"
                  >
                    <option value="Zkouška">Zkouška</option>
                    <option value="Zápočet">Zápočet</option>
                    <option value="Kolokvium">Kolokvium</option>
                    <option value="Klasifikovaný zápočet">
                      Klasifikovaný zápočet
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Kredity (ECTS)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={newCourseCredits}
                    onChange={(e) => setNewCourseCredits(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded focus:outline-none focus:border-[#003865]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewCourseModal(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-[#003865] rounded-md hover:bg-[#002848]"
                >
                  Přidat předmět
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 4: QUICK ADD TASK IN AGENDA VIEW                              */}
      {/* =================================================================== */}
      {showQuickTaskModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                Nový úkol k odevzdání
              </h3>
              <button
                type="button"
                onClick={() => setShowQuickTaskModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!quickTaskCourseId || !quickTaskTitle.trim()) return;
                handleAddTask(quickTaskCourseId, {
                  title: quickTaskTitle,
                  dueDate: quickTaskDueDate,
                  priority: quickTaskPriority,
                  description: quickTaskDesc,
                  workNotes: quickTaskWorkNotes,
                });
                setQuickTaskTitle('');
                setQuickTaskDueDate('');
                setQuickTaskDesc('');
                setQuickTaskWorkNotes('');
                setShowQuickTaskModal(false);
              }}
              className="space-y-3.5"
            >
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Předmět *
                </label>
                <select
                  value={quickTaskCourseId}
                  onChange={(e) => setQuickTaskCourseId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:border-[#003865]"
                >
                  {semesterCourses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Název úkolu *
                </label>
                <input
                  type="text"
                  required
                  value={quickTaskTitle}
                  onChange={(e) => setQuickTaskTitle(e.target.value)}
                  placeholder="např. Odevzdat esej"
                  maxLength={VALIDATION_LIMITS.TASK_TITLE_MAX}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:border-[#003865]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Termín odevzdání
                  </label>
                  <input
                    type="date"
                    value={quickTaskDueDate}
                    onChange={(e) => setQuickTaskDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded focus:outline-none focus:border-[#003865]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Priorita
                  </label>
                  <select
                    value={quickTaskPriority}
                    onChange={(e) =>
                      setQuickTaskPriority(e.target.value as TaskPriority)
                    }
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:border-[#003865]"
                  >
                    <option value="Nízká">Nízká</option>
                    <option value="Střední">Střední</option>
                    <option value="Vysoká">Vysoká</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Zadání / požadavky
                </label>
                <input
                  type="text"
                  value={quickTaskDesc}
                  onChange={(e) => setQuickTaskDesc(e.target.value)}
                  maxLength={VALIDATION_LIMITS.TASK_DESC_MAX}
                  placeholder="Rozsah, formát, požadavky..."
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:border-[#003865]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Poznámky při vypracovávání (volitelné)
                </label>
                <RichNoteEditor
                  value={quickTaskWorkNotes}
                  onChange={setQuickTaskWorkNotes}
                  placeholder="Poznámky k vypracování, osnova, literatura..."
                  minHeightClass="min-h-[110px]"
                  maxLength={VALIDATION_LIMITS.TASK_WORK_NOTES_MAX}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuickTaskModal(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-[#003865] rounded-md hover:bg-[#002848]"
                >
                  Uložit úkol
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
