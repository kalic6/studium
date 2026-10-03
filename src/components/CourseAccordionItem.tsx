import React, { useState, useEffect } from 'react';
import {
  ChevronDown,
  Check,
  Plus,
  Trash2,
  Edit3,
  FileText,
  Save,
} from 'lucide-react';
import {
  Course,
  CourseDate,
  CourseTask,
  CourseTopic,
  CompletionType,
  DateCategory,
  TaskPriority,
  VALIDATION_LIMITS,
  clampString,
} from '../types';

interface CourseAccordionItemProps {
  course: Course;
  isExpanded: boolean;
  onToggleExpand: () => void;
  topics: CourseTopic[];
  tasks: CourseTask[];
  dates: CourseDate[];
  onToggleCourseCompleted: (course: Course) => void;
  onUpdateCourse: (
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
  ) => void;
  onDeleteCourse: (courseId: string) => void;
  onAddTopic: (
    courseId: string,
    payload: { title: string; weekLabel: string; notes: string; isProcessed: boolean }
  ) => void;
  onUpdateTopic: (
    topicId: string,
    updates: Partial<Pick<CourseTopic, 'title' | 'weekLabel' | 'isProcessed' | 'notes'>>
  ) => void;
  onDeleteTopic: (topicId: string) => void;
  onAddTask: (
    courseId: string,
    payload: {
      title: string;
      dueDate: string;
      description: string;
      priority: TaskPriority;
    }
  ) => void;
  onUpdateTask: (
    taskId: string,
    updates: Partial<
      Pick<CourseTask, 'title' | 'dueDate' | 'description' | 'priority' | 'isCompleted'>
    >
  ) => void;
  onDeleteTask: (taskId: string) => void;
  onAddDate: (
    courseId: string,
    payload: {
      title: string;
      date: string;
      time: string;
      room: string;
      teacher: string;
      category: DateCategory;
    }
  ) => void;
  onUpdateDate: (
    dateId: string,
    updates: Partial<
      Pick<
        CourseDate,
        'title' | 'date' | 'time' | 'room' | 'teacher' | 'category' | 'isCompleted'
      >
    >
  ) => void;
  onDeleteDate: (dateId: string) => void;
}

type ActiveSubTab = 'topics' | 'tasks' | 'dates' | 'settings';

export const CourseAccordionItem: React.FC<CourseAccordionItemProps> = ({
  course,
  isExpanded,
  onToggleExpand,
  topics,
  tasks,
  dates,
  onToggleCourseCompleted,
  onUpdateCourse,
  onDeleteCourse,
  onAddTopic,
  onUpdateTopic,
  onDeleteTopic,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onAddDate,
  onUpdateDate,
  onDeleteDate,
}) => {
  const [activeTab, setActiveTab] = useState<ActiveSubTab>('topics');

  // Selected topic for note writing (zápis k probíranému tématu)
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(
    topics[0]?.id ?? null
  );
  const selectedTopic =
    topics.find((t) => t.id === selectedTopicId) || topics[0] || null;

  const [noteDraft, setNoteDraft] = useState<string>(selectedTopic?.notes || '');
  const [topicTitleDraft, setTopicTitleDraft] = useState<string>(
    selectedTopic?.title || ''
  );
  const [topicWeekDraft, setTopicWeekDraft] = useState<string>(
    selectedTopic?.weekLabel || ''
  );
  const [noteSavedNotice, setNoteSavedNotice] = useState(false);

  useEffect(() => {
    if (selectedTopic) {
      setNoteDraft(selectedTopic.notes);
      setTopicTitleDraft(selectedTopic.title);
      setTopicWeekDraft(selectedTopic.weekLabel);
    } else {
      setNoteDraft('');
      setTopicTitleDraft('');
      setTopicWeekDraft('');
    }
  }, [selectedTopic?.id, selectedTopic?.notes, selectedTopic?.title, selectedTopic?.weekLabel]);

  // Add new topic form state
  const [showNewTopicForm, setShowNewTopicForm] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicWeek, setNewTopicWeek] = useState('');
  const [newTopicNotes, setNewTopicNotes] = useState('');

  // Add new task form state
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('Střední');
  const [newTaskDesc, setNewTaskDesc] = useState('');

  // Edit task inline state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskDueDate, setEditTaskDueDate] = useState('');
  const [editTaskPriority, setEditTaskPriority] = useState<TaskPriority>('Střední');
  const [editTaskDesc, setEditTaskDesc] = useState('');

  // Add new course date form state
  const [showNewDateForm, setShowNewDateForm] = useState(false);
  const [newDateTitle, setNewDateTitle] = useState('');
  const [newDateCategory, setNewDateCategory] = useState<DateCategory>('Přednáška');
  const [newDateValue, setNewDateValue] = useState('');
  const [newDateTime, setNewDateTime] = useState('');
  const [newDateRoom, setNewDateRoom] = useState(course.room);
  const [newDateTeacher, setNewDateTeacher] = useState(course.teacher);

  // Course settings form state
  const [courseCode, setCourseCode] = useState(course.code);
  const [courseName, setCourseName] = useState(course.name);
  const [courseTeacher, setCourseTeacher] = useState(course.teacher);
  const [courseRoom, setCourseRoom] = useState(course.room);
  const [courseSchedule, setCourseSchedule] = useState(course.scheduleSummary);
  const [courseCompletionType, setCourseCompletionType] = useState<CompletionType>(
    course.completionType
  );
  const [courseCredits, setCourseCredits] = useState<number>(course.credits);
  const [confirmDeleteCourse, setConfirmDeleteCourse] = useState(false);
  const [courseSavedBanner, setCourseSavedBanner] = useState(false);

  useEffect(() => {
    setCourseCode(course.code);
    setCourseName(course.name);
    setCourseTeacher(course.teacher);
    setCourseRoom(course.room);
    setCourseSchedule(course.scheduleSummary);
    setCourseCompletionType(course.completionType);
    setCourseCredits(course.credits);
  }, [course]);

  const processedTopicsCount = topics.filter((t) => t.isProcessed).length;
  const completedTasksCount = tasks.filter((t) => t.isCompleted).length;
  const pendingTasksCount = tasks.length - completedTasksCount;

  const handleSaveTopicNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTopic) return;
    onUpdateTopic(selectedTopic.id, {
      title: clampString(
        topicTitleDraft,
        VALIDATION_LIMITS.TOPIC_TITLE_MAX,
        selectedTopic.title
      ),
      weekLabel: clampString(topicWeekDraft, VALIDATION_LIMITS.TOPIC_WEEK_MAX),
      notes: noteDraft.slice(0, VALIDATION_LIMITS.TOPIC_NOTES_MAX),
      isProcessed: selectedTopic.isProcessed,
    });
    setNoteSavedNotice(true);
    setTimeout(() => setNoteSavedNotice(false), 2000);
  };

  const handleInsertMarkdownTemplate = (snippet: string) => {
    setNoteDraft((prev) => {
      const separator = prev.endsWith('\n') || prev.length === 0 ? '' : '\n\n';
      return (prev + separator + snippet).slice(
        0,
        VALIDATION_LIMITS.TOPIC_NOTES_MAX
      );
    });
  };

  const handleCreateTopic = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = clampString(newTopicTitle, VALIDATION_LIMITS.TOPIC_TITLE_MAX);
    if (!cleanTitle) return;
    onAddTopic(course.id, {
      title: cleanTitle,
      weekLabel: clampString(newTopicWeek, VALIDATION_LIMITS.TOPIC_WEEK_MAX),
      notes: newTopicNotes.slice(0, VALIDATION_LIMITS.TOPIC_NOTES_MAX),
      isProcessed: false,
    });
    setNewTopicTitle('');
    setNewTopicWeek('');
    setNewTopicNotes('');
    setShowNewTopicForm(false);
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = clampString(newTaskTitle, VALIDATION_LIMITS.TASK_TITLE_MAX);
    if (!cleanTitle) return;
    onAddTask(course.id, {
      title: cleanTitle,
      dueDate: clampString(newTaskDueDate, VALIDATION_LIMITS.DATE_STR_MAX),
      description: clampString(newTaskDesc, VALIDATION_LIMITS.TASK_DESC_MAX),
      priority: newTaskPriority,
    });
    setNewTaskTitle('');
    setNewTaskDueDate('');
    setNewTaskDesc('');
    setNewTaskPriority('Střední');
    setShowNewTaskForm(false);
  };

  const startEditTask = (task: CourseTask) => {
    setEditingTaskId(task.id);
    setEditTaskTitle(task.title);
    setEditTaskDueDate(task.dueDate);
    setEditTaskPriority(task.priority);
    setEditTaskDesc(task.description);
  };

  const handleSaveTaskEdit = (e: React.FormEvent, task: CourseTask) => {
    e.preventDefault();
    const cleanTitle = clampString(editTaskTitle, VALIDATION_LIMITS.TASK_TITLE_MAX);
    if (!cleanTitle) return;
    onUpdateTask(task.id, {
      title: cleanTitle,
      dueDate: clampString(editTaskDueDate, VALIDATION_LIMITS.DATE_STR_MAX),
      priority: editTaskPriority,
      description: clampString(editTaskDesc, VALIDATION_LIMITS.TASK_DESC_MAX),
      isCompleted: task.isCompleted,
    });
    setEditingTaskId(null);
  };

  const handleCreateDate = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = clampString(newDateTitle, VALIDATION_LIMITS.DATE_TITLE_MAX);
    const cleanDate = clampString(newDateValue, VALIDATION_LIMITS.DATE_STR_MAX);
    if (!cleanTitle || !cleanDate) return;
    onAddDate(course.id, {
      title: cleanTitle,
      date: cleanDate,
      time: clampString(newDateTime, VALIDATION_LIMITS.TIME_STR_MAX),
      room: clampString(newDateRoom, VALIDATION_LIMITS.ROOM_MAX),
      teacher: clampString(newDateTeacher, VALIDATION_LIMITS.TEACHER_MAX),
      category: newDateCategory,
    });
    setNewDateTitle('');
    setNewDateValue('');
    setNewDateTime('');
    setShowNewDateForm(false);
  };

  const handleSaveCourseDetails = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = clampString(courseCode, VALIDATION_LIMITS.COURSE_CODE_MAX);
    const cleanName = clampString(courseName, VALIDATION_LIMITS.COURSE_NAME_MAX);
    if (!cleanCode || !cleanName) return;
    onUpdateCourse(course.id, {
      code: cleanCode,
      name: cleanName,
      teacher: clampString(courseTeacher, VALIDATION_LIMITS.TEACHER_MAX),
      room: clampString(courseRoom, VALIDATION_LIMITS.ROOM_MAX),
      scheduleSummary: clampString(courseSchedule, VALIDATION_LIMITS.SCHEDULE_MAX),
      completionType: courseCompletionType,
      credits: Math.max(0, Math.min(60, Number(courseCredits) || 0)),
      isCompleted: course.isCompleted,
    });
    setCourseSavedBanner(true);
    setTimeout(() => setCourseSavedBanner(false), 2000);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-md transition-colors">
      {/* Main Accordion Row — inspired directly by the IS MUNI screenshot */}
      <div className="flex items-center justify-between px-4 py-3.5 gap-4 hover:bg-slate-50/80 transition-colors">
        <button
          type="button"
          onClick={onToggleExpand}
          className="flex items-center gap-3.5 flex-1 text-left min-w-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#003865]"
        >
          {/* MUNI-style light-blue academic monogram emblem */}
          <div
            aria-hidden="true"
            className="w-9 h-9 rounded-full bg-[#5BC0F8] text-white flex items-center justify-center shrink-0 font-mono font-semibold text-sm tracking-tighter select-none"
          >
            M
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="font-mono font-semibold text-sm text-slate-800 tabular-nums">
                {course.code}
              </span>
              <span className="text-[15px] font-medium text-slate-800 truncate">
                {course.name}
              </span>
            </div>

            {/* Zero-Pill Metadata line with subtle typographic separators */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 mt-0.5">
              <span>{course.completionType}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{course.credits} kr.</span>
              {course.teacher && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="truncate max-w-[220px]">{course.teacher}</span>
                </>
              )}
              {course.room && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="truncate max-w-[160px]">{course.room}</span>
                </>
              )}
              {course.scheduleSummary && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="truncate max-w-[180px]">{course.scheduleSummary}</span>
                </>
              )}
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                Témata: {processedTopicsCount}/{topics.length}
              </span>
              {pendingTasksCount > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-amber-700 font-medium font-mono tabular-nums">
                    Úkoly k odevzdání: {pendingTasksCount}
                  </span>
                </>
              )}
            </div>
          </div>
        </button>

        {/* Right Side Controls: Course Completion Checkmark (like ISKB60 in screenshot) + Expand Chevron */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleCourseCompleted(course);
            }}
            title={
              course.isCompleted
                ? 'Předmět je ukončen (splněn) — kliknutím vrátíte do stavu Probíhá'
                : 'Označit předmět jako ukončený (splněný)'
            }
            className={`inline-flex items-center gap-1.5 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-[#003865] ${
              course.isCompleted
                ? 'text-emerald-700 font-medium'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center border transition-colors ${
                course.isCompleted
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-600'
                  : 'border-slate-300 bg-white text-transparent hover:border-slate-400'
              }`}
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            </span>
            <span className="hidden sm:inline whitespace-nowrap">
              {course.isCompleted ? 'Ukončeno' : 'Splnit předmět'}
            </span>
          </button>

          <button
            type="button"
            onClick={onToggleExpand}
            aria-label={isExpanded ? 'Sbalit detail předmětu' : 'Rozbalit detail předmětu'}
            className="p-1.5 text-slate-600 hover:text-slate-900 rounded transition-colors"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-150 ${
                isExpanded ? 'rotate-180 text-[#003865]' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Expanded Course Workspace */}
      {isExpanded && (
        <div className="border-t border-slate-200 px-5 py-5 space-y-5 bg-slate-50/40">
          {/* Quick Course Info & Sub-Navigation Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            {/* Segmented Interactive Sub-Tabs */}
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-lg w-fit">
              <button
                type="button"
                onClick={() => setActiveTab('topics')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  activeTab === 'topics'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Témata a zápisy ({processedTopicsCount}/{topics.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('tasks')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  activeTab === 'tasks'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Úkoly k odevzdání ({completedTasksCount}/{tasks.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('dates')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  activeTab === 'dates'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Termíny předmětu ({dates.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  activeTab === 'settings'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Vyučující, místnost a úprava
              </button>
            </div>

            {/* Quick Contextual Summary of Teacher & Room */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
              <span>
                Vyučující:{' '}
                <strong className="font-medium text-slate-900">
                  {course.teacher || 'Nezadáno'}
                </strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Místnost:{' '}
                <strong className="font-medium text-slate-900">
                  {course.room || 'Nezadáno'}
                </strong>
              </span>
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className="text-[#003865] hover:underline font-medium whitespace-nowrap"
              >
                Upravit údaje
              </button>
            </div>
          </div>

          {/* =============================================================== */}
          {/* TAB 1: TÉMATA KE ZPRACOVÁNÍ + ZÁPIS (POZNÁMKY K TÉMATU)         */}
          {/* =============================================================== */}
          {activeTab === 'topics' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">
                    Probíraná témata a studijní zápisy
                  </h4>
                  <p className="text-xs text-slate-500">
                    Zaškrtněte zpracovaná témata a pište si ke každému tématu podrobné poznámky ke zkoušce nebo kolokviu.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewTopicForm((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#003865] rounded-md hover:bg-[#002848] transition-colors whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Přidat téma
                </button>
              </div>

              {showNewTopicForm && (
                <form
                  onSubmit={handleCreateTopic}
                  className="bg-white border border-slate-200 rounded-md p-4 space-y-3"
                >
                  <div className="text-xs font-semibold text-slate-900">
                    Nové téma ke zpracování
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">
                        Týden / blok (volitelné)
                      </label>
                      <input
                        type="text"
                        value={newTopicWeek}
                        onChange={(e) => setNewTopicWeek(e.target.value)}
                        placeholder="např. 3. týden"
                        maxLength={VALIDATION_LIMITS.TOPIC_WEEK_MAX}
                        className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:border-[#003865]"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-xs text-slate-600 mb-1">
                        Název probíraného tématu *
                      </label>
                      <input
                        type="text"
                        required
                        value={newTopicTitle}
                        onChange={(e) => setNewTopicTitle(e.target.value)}
                        placeholder="např. Katalogizace, metadatové standardy a MARC 21"
                        maxLength={VALIDATION_LIMITS.TOPIC_TITLE_MAX}
                        className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:border-[#003865]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">
                      Úvodní zápis / poznámky k tématu (volitelné)
                    </label>
                    <textarea
                      rows={3}
                      value={newTopicNotes}
                      onChange={(e) => setNewTopicNotes(e.target.value)}
                      placeholder="Zde si můžete rovnou zapsat poznámky z přednášky nebo četby..."
                      maxLength={VALIDATION_LIMITS.TOPIC_NOTES_MAX}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:border-[#003865]"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowNewTopicForm(false)}
                      className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
                    >
                      Zrušit
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs font-medium text-white bg-[#003865] rounded hover:bg-[#002848] transition-colors whitespace-nowrap"
                    >
                      Uložit téma
                    </button>
                  </div>
                </form>
              )}

              {topics.length === 0 ? (
                <div className="py-8 text-center border border-dashed border-slate-300 rounded-md bg-white px-4">
                  <p className="text-sm text-slate-600">
                    Zatím zde nejsou žádná témata ke zpracování.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowNewTopicForm(true)}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[#003865] hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Přidat první téma a vytvořit zápis
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                  {/* Left Column: Topics Checklist (5 cols) */}
                  <div className="lg:col-span-5 bg-white border border-slate-200 rounded-md divide-y divide-slate-200">
                    {topics.map((topic) => {
                      const isSelected = selectedTopic?.id === topic.id;
                      return (
                        <div
                          key={topic.id}
                          className={`p-3.5 transition-colors flex items-start gap-3 ${
                            isSelected ? 'bg-sky-50/70' : 'hover:bg-slate-50'
                          }`}
                        >
                          {/* Checkbox pro zpracování */}
                          <input
                            type="checkbox"
                            checked={topic.isProcessed}
                            onChange={() =>
                              onUpdateTopic(topic.id, {
                                isProcessed: !topic.isProcessed,
                              })
                            }
                            aria-label={`Zpracováno: ${topic.title}`}
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-[#003865] focus:ring-[#003865] cursor-pointer shrink-0"
                          />

                          <button
                            type="button"
                            onClick={() => setSelectedTopicId(topic.id)}
                            className="flex-1 text-left min-w-0"
                          >
                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                              {topic.weekLabel && (
                                <>
                                  <span className="font-mono tabular-nums">
                                    {topic.weekLabel}
                                  </span>
                                  <span aria-hidden="true">·</span>
                                </>
                              )}
                              <span
                                className={
                                  topic.isProcessed
                                    ? 'text-emerald-700 font-medium'
                                    : 'text-slate-500'
                                }
                              >
                                {topic.isProcessed ? 'Zpracováno' : 'Ke zpracování'}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono tabular-nums">
                                {topic.notes.trim().length > 0
                                  ? `${topic.notes.trim().length} zn.`
                                  : 'Bez zápisu'}
                              </span>
                            </div>
                            <p
                              className={`text-sm font-medium mt-0.5 ${
                                topic.isProcessed
                                  ? 'text-slate-600 line-through decoration-slate-300'
                                  : 'text-slate-900'
                              }`}
                            >
                              {topic.title}
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() => onDeleteTopic(topic.id)}
                            title="Smazat téma"
                            className="p-1 text-slate-400 hover:text-red-600 transition-colors shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Right Column: Study Notes Editor (Zápis k probíranému tématu) (7 cols) */}
                  <div className="lg:col-span-7 bg-white border border-slate-200 rounded-md p-4">
                    {selectedTopic ? (
                      <form onSubmit={handleSaveTopicNote} className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-[#003865] shrink-0" />
                            <span className="text-xs font-semibold text-slate-900">
                              Zápis k probíranému tématu
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={selectedTopic.isProcessed}
                                onChange={() =>
                                  onUpdateTopic(selectedTopic.id, {
                                    isProcessed: !selectedTopic.isProcessed,
                                  })
                                }
                                className="h-4 w-4 rounded border-slate-300 text-[#003865] focus:ring-[#003865]"
                              />
                              <span>Téma zpracováno</span>
                            </label>

                            <button
                              type="submit"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#003865] rounded hover:bg-[#002848] transition-colors whitespace-nowrap"
                            >
                              <Save className="w-3.5 h-3.5" />
                              Uložit zápis
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">
                              Označení týdne
                            </label>
                            <input
                              type="text"
                              value={topicWeekDraft}
                              onChange={(e) => setTopicWeekDraft(e.target.value)}
                              placeholder="1. týden"
                              maxLength={VALIDATION_LIMITS.TOPIC_WEEK_MAX}
                              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-none focus:border-[#003865]"
                            />
                          </div>
                          <div className="sm:col-span-3">
                            <label className="block text-xs text-slate-500 mb-1">
                              Název tématu
                            </label>
                            <input
                              type="text"
                              required
                              value={topicTitleDraft}
                              onChange={(e) => setTopicTitleDraft(e.target.value)}
                              maxLength={VALIDATION_LIMITS.TOPIC_TITLE_MAX}
                              className="w-full px-2.5 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-none focus:border-[#003865]"
                            />
                          </div>
                        </div>

                        {/* Formatting helper buttons for structured academic notes */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                handleInsertMarkdownTemplate('## Hlavní myšlenky přednášky\n- ')
                              }
                              className="px-2 py-1 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded transition-colors whitespace-nowrap"
                            >
                              + Nadpis sekce
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleInsertMarkdownTemplate('- **Klíčový pojem**: definice...')
                              }
                              className="px-2 py-1 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded transition-colors whitespace-nowrap"
                            >
                              + Klíčový pojem
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleInsertMarkdownTemplate(
                                  '### Shrnutí ke zkoušce\n1. \n2. '
                                )
                              }
                              className="px-2 py-1 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded transition-colors whitespace-nowrap"
                            >
                              + Shrnutí ke zkoušce
                            </button>
                          </div>
                          {noteSavedNotice && (
                            <span className="text-xs text-emerald-700 font-medium">
                              Zápis uložen
                            </span>
                          )}
                        </div>

                        <textarea
                          rows={10}
                          value={noteDraft}
                          onChange={(e) => setNoteDraft(e.target.value)}
                          placeholder="Zde pište poznámky k probíranému tématu, definice, literaturu a otázky ke zkoušce..."
                          maxLength={VALIDATION_LIMITS.TOPIC_NOTES_MAX}
                          className="w-full px-3.5 py-3 text-sm leading-relaxed bg-slate-50/60 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:border-[#003865] font-sans"
                        />

                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span>
                            Tip: Změny uložíte tlačítkem „Uložit zápis“.
                          </span>
                          <span className="font-mono tabular-nums">
                            {noteDraft.length} / {VALIDATION_LIMITS.TOPIC_NOTES_MAX} znaků
                          </span>
                        </div>
                      </form>
                    ) : (
                      <div className="py-10 text-center text-sm text-slate-500">
                        Vyberte téma vlevo pro zobrazení a úpravu studijního zápisu.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 2: ÚKOLY K ODEVZDÁNÍ                                        */}
          {/* =============================================================== */}
          {activeTab === 'tasks' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">
                    Úkoly k odevzdání a studijní povinnosti
                  </h4>
                  <p className="text-xs text-slate-500">
                    Sledujte termíny odevzdání seminárních prací, esejů a průběžných cvičení.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewTaskForm((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#003865] rounded-md hover:bg-[#002848] transition-colors whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Přidat úkol k odevzdání
                </button>
              </div>

              {showNewTaskForm && (
                <form
                  onSubmit={handleCreateTask}
                  className="bg-white border border-slate-200 rounded-md p-4 space-y-3"
                >
                  <div className="text-xs font-semibold text-slate-900">
                    Nový úkol k odevzdání
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs text-slate-600 mb-1">
                        Název úkolu *
                      </label>
                      <input
                        type="text"
                        required
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder="např. Seminární práce — rešerše zdrojů"
                        maxLength={VALIDATION_LIMITS.TASK_TITLE_MAX}
                        className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:border-[#003865]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">
                        Termín odevzdání
                      </label>
                      <input
                        type="date"
                        value={newTaskDueDate}
                        onChange={(e) => setNewTaskDueDate(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:border-[#003865] font-mono tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">
                        Priorita
                      </label>
                      <select
                        value={newTaskPriority}
                        onChange={(e) =>
                          setNewTaskPriority(e.target.value as TaskPriority)
                        }
                        className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:border-[#003865]"
                      >
                        <option value="Nízká">Nízká</option>
                        <option value="Střední">Střední</option>
                        <option value="Vysoká">Vysoká</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">
                      Požadavky / poznámka k odevzdání
                    </label>
                    <textarea
                      rows={2}
                      value={newTaskDesc}
                      onChange={(e) => setNewTaskDesc(e.target.value)}
                      placeholder="Rozsah, formát, odkaz na odevzdávárnu..."
                      maxLength={VALIDATION_LIMITS.TASK_DESC_MAX}
                      className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:border-[#003865]"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowNewTaskForm(false)}
                      className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
                    >
                      Zrušit
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs font-medium text-white bg-[#003865] rounded hover:bg-[#002848] transition-colors whitespace-nowrap"
                    >
                      Uložit úkol
                    </button>
                  </div>
                </form>
              )}

              {tasks.length === 0 ? (
                <div className="py-8 text-center border border-dashed border-slate-300 rounded-md bg-white px-4">
                  <p className="text-sm text-slate-600">
                    Pro tento předmět nejsou evidovány žádné úkoly k odevzdání.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowNewTaskForm(true)}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[#003865] hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Přidat první úkol
                  </button>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-md divide-y divide-slate-200">
                  {tasks.map((task) => {
                    if (editingTaskId === task.id) {
                      return (
                        <form
                          key={task.id}
                          onSubmit={(e) => handleSaveTaskEdit(e, task)}
                          className="p-4 space-y-3 bg-slate-50"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                            <div className="sm:col-span-2">
                              <input
                                type="text"
                                required
                                value={editTaskTitle}
                                onChange={(e) => setEditTaskTitle(e.target.value)}
                                className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded"
                              />
                            </div>
                            <div>
                              <input
                                type="date"
                                value={editTaskDueDate}
                                onChange={(e) => setEditTaskDueDate(e.target.value)}
                                className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded font-mono tabular-nums"
                              />
                            </div>
                            <div>
                              <select
                                value={editTaskPriority}
                                onChange={(e) =>
                                  setEditTaskPriority(e.target.value as TaskPriority)
                                }
                                className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded"
                              >
                                <option value="Nízká">Nízká</option>
                                <option value="Střední">Střední</option>
                                <option value="Vysoká">Vysoká</option>
                              </select>
                            </div>
                          </div>
                          <textarea
                            rows={2}
                            value={editTaskDesc}
                            onChange={(e) => setEditTaskDesc(e.target.value)}
                            className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingTaskId(null)}
                              className="px-3 py-1 text-xs text-slate-600"
                            >
                              Zrušit
                            </button>
                            <button
                              type="submit"
                              className="px-3 py-1 text-xs font-medium text-white bg-[#003865] rounded"
                            >
                              Uložit změny
                            </button>
                          </div>
                        </form>
                      );
                    }

                    return (
                      <div
                        key={task.id}
                        className="p-3.5 flex items-start justify-between gap-4 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <input
                            type="checkbox"
                            checked={task.isCompleted}
                            onChange={() =>
                              onUpdateTask(task.id, {
                                isCompleted: !task.isCompleted,
                              })
                            }
                            aria-label={`Odevzdáno: ${task.title}`}
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-[#003865] focus:ring-[#003865] cursor-pointer shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <p
                              className={`text-sm font-medium ${
                                task.isCompleted
                                  ? 'text-slate-500 line-through'
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
                                Stav:{' '}
                                <strong
                                  className={
                                    task.isCompleted
                                      ? 'text-emerald-700 font-medium'
                                      : 'text-amber-700 font-medium'
                                  }
                                >
                                  {task.isCompleted ? 'Odevzdáno' : 'K odevzdání'}
                                </strong>
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>
                                Termín:{' '}
                                <span className="font-mono tabular-nums text-slate-700">
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

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => startEditTask(task)}
                            title="Upravit úkol"
                            className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteTask(task.id)}
                            title="Smazat úkol"
                            className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
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
          )}

          {/* =============================================================== */}
          {/* TAB 3: TERMÍNY PŘEDMĚTU                                         */}
          {/* =============================================================== */}
          {activeTab === 'dates' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">
                    Termíny předmětu, bloková výuka a zkouškové termíny
                  </h4>
                  <p className="text-xs text-slate-500">
                    Evidujte si data přednášek, seminářů, konzultací a zkouškových termínů včetně místnosti a vyučujícího.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setNewDateRoom(course.room);
                    setNewDateTeacher(course.teacher);
                    setShowNewDateForm((v) => !v);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#003865] rounded-md hover:bg-[#002848] transition-colors whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Přidat termín předmětu
                </button>
              </div>

              {showNewDateForm && (
                <form
                  onSubmit={handleCreateDate}
                  className="bg-white border border-slate-200 rounded-md p-4 space-y-3"
                >
                  <div className="text-xs font-semibold text-slate-900">
                    Nový termín předmětu
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs text-slate-600 mb-1">
                        Popis / název termínu *
                      </label>
                      <input
                        type="text"
                        required
                        value={newDateTitle}
                        onChange={(e) => setNewDateTitle(e.target.value)}
                        placeholder="např. 1. řádný termín zkoušky / Blokový seminář"
                        maxLength={VALIDATION_LIMITS.DATE_TITLE_MAX}
                        className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:border-[#003865]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">
                        Typ termínu
                      </label>
                      <select
                        value={newDateCategory}
                        onChange={(e) =>
                          setNewDateCategory(e.target.value as DateCategory)
                        }
                        className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:border-[#003865]"
                      >
                        <option value="Přednáška">Přednáška</option>
                        <option value="Seminář">Seminář</option>
                        <option value="Zkouška">Zkouška</option>
                        <option value="Bloková výuka">Bloková výuka</option>
                        <option value="Konzultace">Konzultace</option>
                        <option value="Jiné">Jiné</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">
                        Datum *
                      </label>
                      <input
                        type="date"
                        required
                        value={newDateValue}
                        onChange={(e) => setNewDateValue(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:border-[#003865] font-mono tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">
                        Čas (např. 10:00–11:40)
                      </label>
                      <input
                        type="text"
                        value={newDateTime}
                        onChange={(e) => setNewDateTime(e.target.value)}
                        placeholder="10:00–11:40"
                        maxLength={VALIDATION_LIMITS.TIME_STR_MAX}
                        className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:border-[#003865] font-mono tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">
                        Místnost
                      </label>
                      <input
                        type="text"
                        value={newDateRoom}
                        onChange={(e) => setNewDateRoom(e.target.value)}
                        placeholder="Učebna A22"
                        maxLength={VALIDATION_LIMITS.ROOM_MAX}
                        className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:border-[#003865]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">
                        Vyučující
                      </label>
                      <input
                        type="text"
                        value={newDateTeacher}
                        onChange={(e) => setNewDateTeacher(e.target.value)}
                        placeholder="Jméno vyučujícího"
                        maxLength={VALIDATION_LIMITS.TEACHER_MAX}
                        className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:border-[#003865]"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowNewDateForm(false)}
                      className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
                    >
                      Zrušit
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs font-medium text-white bg-[#003865] rounded hover:bg-[#002848] transition-colors whitespace-nowrap"
                    >
                      Uložit termín
                    </button>
                  </div>
                </form>
              )}

              {dates.length === 0 ? (
                <div className="py-8 text-center border border-dashed border-slate-300 rounded-md bg-white px-4">
                  <p className="text-sm text-slate-600">
                    Zatím nejsou přidány žádné konkrétní termíny předmětu.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowNewDateForm(true)}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[#003865] hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Přidat první termín
                  </button>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-md divide-y divide-slate-200">
                  {dates.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 flex items-start justify-between gap-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={item.isCompleted}
                          onChange={() =>
                            onUpdateDate(item.id, {
                              isCompleted: !item.isCompleted,
                            })
                          }
                          aria-label={`Absolvováno: ${item.title}`}
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-[#003865] focus:ring-[#003865] cursor-pointer shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm font-medium ${
                              item.isCompleted
                                ? 'text-slate-500 line-through'
                                : 'text-slate-900'
                            }`}
                          >
                            {item.title}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                            <span className="font-medium text-slate-700">
                              {item.category}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums text-slate-800">
                              {item.date}
                              {item.time ? ` (${item.time})` : ''}
                            </span>
                            {item.room && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>Místnost: {item.room}</span>
                              </>
                            )}
                            {item.teacher && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>Vyučující: {item.teacher}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onDeleteDate(item.id)}
                        title="Smazat termín"
                        className="p-1.5 text-slate-400 hover:text-red-600 transition-colors shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 4: VYUČUJÍCÍ, MÍSTNOST A ÚPRAVA PŘEDMĚTU                    */}
          {/* =============================================================== */}
          {activeTab === 'settings' && (
            <form
              onSubmit={handleSaveCourseDetails}
              className="bg-white border border-slate-200 rounded-md p-4 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">
                    Údaje předmětu (vyučující, místnost, ukončení)
                  </h4>
                  <p className="text-xs text-slate-500">
                    Upravte kód, název, vyučujícího, místnost nebo způsob ukončení předmětu.
                  </p>
                </div>
                {courseSavedBanner && (
                  <span className="text-xs font-medium text-emerald-700">
                    Změny předmětu byly uloženy
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">
                    Kód předmětu *
                  </label>
                  <input
                    type="text"
                    required
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                    maxLength={VALIDATION_LIMITS.COURSE_CODE_MAX}
                    className="w-full px-3 py-1.5 text-sm font-mono bg-white border border-slate-300 rounded focus:outline-none focus:border-[#003865]"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs text-slate-600 mb-1">
                    Název předmětu *
                  </label>
                  <input
                    type="text"
                    required
                    value={courseName}
                    onChange={(e) => setCourseName(e.target.value)}
                    maxLength={VALIDATION_LIMITS.COURSE_NAME_MAX}
                    className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:border-[#003865]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">
                    Vyučující
                  </label>
                  <input
                    type="text"
                    value={courseTeacher}
                    onChange={(e) => setCourseTeacher(e.target.value)}
                    placeholder="např. PhDr. Petr Škyřík, Ph.D."
                    maxLength={VALIDATION_LIMITS.TEACHER_MAX}
                    className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:border-[#003865]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">
                    Místnost / učebna
                  </label>
                  <input
                    type="text"
                    value={courseRoom}
                    onChange={(e) => setCourseRoom(e.target.value)}
                    placeholder="např. Učebna A22 / Online"
                    maxLength={VALIDATION_LIMITS.ROOM_MAX}
                    className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:border-[#003865]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">
                    Pravidelný termín / rozvrh
                  </label>
                  <input
                    type="text"
                    value={courseSchedule}
                    onChange={(e) => setCourseSchedule(e.target.value)}
                    placeholder="např. Út 10:00–11:40"
                    maxLength={VALIDATION_LIMITS.SCHEDULE_MAX}
                    className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:border-[#003865]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">
                    Způsob ukončení
                  </label>
                  <select
                    value={courseCompletionType}
                    onChange={(e) =>
                      setCourseCompletionType(e.target.value as CompletionType)
                    }
                    className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:border-[#003865]"
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
                  <label className="block text-xs text-slate-600 mb-1">
                    Počet kreditů (ECTS)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={courseCredits}
                    onChange={(e) => setCourseCredits(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded focus:outline-none focus:border-[#003865]"
                  />
                </div>
                <div className="flex items-end pb-1">
                  <label className="inline-flex items-center gap-2 text-sm text-slate-800 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={course.isCompleted}
                      onChange={() => onToggleCourseCompleted(course)}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
                    />
                    <span>Předmět je úspěšně ukončen (splněn)</span>
                  </label>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
                <div>
                  {!confirmDeleteCourse ? (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteCourse(true)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Smazat předmět ze semestru
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-red-700 font-medium">
                        Opravdu smazat předmět {course.code} i s úkoly a zápisy?
                      </span>
                      <button
                        type="button"
                        onClick={() => onDeleteCourse(course.id)}
                        className="px-2.5 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700"
                      >
                        Ano, smazat
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteCourse(false)}
                        className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900"
                      >
                        Zrušit
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#003865] rounded-md hover:bg-[#002848] transition-colors whitespace-nowrap"
                >
                  <Save className="w-3.5 h-3.5" />
                  Uložit údaje předmětu
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
