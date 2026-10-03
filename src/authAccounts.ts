import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  User,
} from 'firebase/auth';
import { auth } from './firebase';
import {
  Semester,
  Course,
  CourseTopic,
  CourseTask,
  CourseDate,
  generateSafeId,
} from './types';
import {
  getInitialSemesters,
  getInitialCourses,
  getInitialTopics,
  getInitialTasks,
  getInitialDates,
} from './defaultData';

export interface RegisteredAccountRecord {
  uid: string;
  nickname: string;
  normalizedNickname: string;
  email: string;
  normalizedEmail: string;
  /** Stored only for fallback local accounts when Firebase Email/Password provider is not yet enabled in console */
  localPasswordHash?: string;
  createdAt: string;
}

export interface ActiveStudentSession {
  uid: string;
  nickname: string;
  email: string;
  isFirebaseAuth: boolean;
  isEmailVerified: boolean;
}

export interface UserStudyDataBundle {
  semesters: Semester[];
  courses: Course[];
  topics: CourseTopic[];
  tasks: CourseTask[];
  dates: CourseDate[];
}

const ACCOUNTS_REGISTRY_KEY = 'studijni_denik_accounts_registry_v1';
const ACTIVE_LOCAL_SESSION_KEY = 'studijni_denik_active_session_v1';

function simpleHash(password: string): string {
  let hash = 5381;
  for (let i = 0; i < password.length; i++) {
    hash = (hash * 33) ^ password.charCodeAt(i);
  }
  return `h_${(hash >>> 0).toString(16)}_${password.length}`;
}

export function normalizeNickname(nick: string): string {
  return nick.trim().toLowerCase();
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function getAccountsRegistry(): RegisteredAccountRecord[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_REGISTRY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAccountToRegistry(record: RegisteredAccountRecord): void {
  try {
    const current = getAccountsRegistry();
    const filtered = current.filter(
      (a) =>
        a.uid !== record.uid &&
        a.normalizedNickname !== record.normalizedNickname &&
        a.normalizedEmail !== record.normalizedEmail
    );
    filtered.push(record);
    localStorage.setItem(ACCOUNTS_REGISTRY_KEY, JSON.stringify(filtered));
  } catch {
    // ignore storage errors
  }
}

export function findAccountByIdentifier(
  identifier: string
): RegisteredAccountRecord | undefined {
  const clean = identifier.trim().toLowerCase();
  if (!clean) return undefined;
  const registry = getAccountsRegistry();
  return registry.find(
    (a) => a.normalizedNickname === clean || a.normalizedEmail === clean
  );
}

export function saveActiveLocalSession(session: ActiveStudentSession | null): void {
  try {
    if (!session) {
      localStorage.removeItem(ACTIVE_LOCAL_SESSION_KEY);
    } else {
      localStorage.setItem(ACTIVE_LOCAL_SESSION_KEY, JSON.stringify(session));
    }
  } catch {
    // ignore
  }
}

export function getSavedActiveLocalSession(): ActiveStudentSession | null {
  try {
    const raw = localStorage.getItem(ACTIVE_LOCAL_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ActiveStudentSession;
  } catch {
    return null;
  }
}

export function getUserDataStorageKey(uid: string): string {
  const safeUid = uid.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
  return `studijni_denik_userdata_v1_${safeUid}`;
}

export function loadUserStudyData(uid: string): UserStudyDataBundle {
  try {
    const key = getUserDataStorageKey(uid);
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed.semesters) && parsed.semesters.length > 0) {
        return {
          semesters: parsed.semesters,
          courses: Array.isArray(parsed.courses) ? parsed.courses : [],
          topics: Array.isArray(parsed.topics) ? parsed.topics : [],
          tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
          dates: Array.isArray(parsed.dates) ? parsed.dates : [],
        };
      }
    }
  } catch {
    // ignore parse errors
  }

  const initialSemesters = getInitialSemesters(uid);
  const firstSemId = initialSemesters[0].id;
  return {
    semesters: initialSemesters,
    courses: getInitialCourses(uid, firstSemId),
    topics: getInitialTopics(uid, firstSemId),
    tasks: getInitialTasks(uid, firstSemId),
    dates: getInitialDates(uid, firstSemId),
  };
}

export function saveUserStudyData(uid: string, bundle: UserStudyDataBundle): void {
  try {
    const key = getUserDataStorageKey(uid);
    localStorage.setItem(key, JSON.stringify(bundle));
  } catch {
    // ignore quota errors
  }
}

export function buildSessionFromFirebaseUser(
  fbUser: User,
  fallbackNickname?: string
): ActiveStudentSession {
  const email = fbUser.email || '';
  const registryMatch = findAccountByIdentifier(email);
  const nickname =
    fbUser.displayName ||
    fallbackNickname ||
    registryMatch?.nickname ||
    (email.includes('@') ? email.split('@')[0] : 'Student');

  if (email) {
    saveAccountToRegistry({
      uid: fbUser.uid,
      nickname,
      normalizedNickname: normalizeNickname(nickname),
      email,
      normalizedEmail: normalizeEmail(email),
      createdAt: registryMatch?.createdAt || new Date().toISOString(),
    });
  }

  return {
    uid: fbUser.uid,
    nickname,
    email,
    isFirebaseAuth: true,
    isEmailVerified: fbUser.emailVerified,
  };
}

export async function registerWithNicknameAndPassword(params: {
  nickname: string;
  email: string;
  password: string;
}): Promise<{
  session: ActiveStudentSession;
  usedLocalFallback: boolean;
  verificationEmailSent: boolean;
}> {
  const cleanNick = params.nickname.trim();
  const cleanEmail = params.email.trim();
  const password = params.password;

  if (cleanNick.length < 2) {
    throw new Error('Přezdívka musí mít alespoň 2 znaky.');
  }
  if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
    throw new Error('Zadejte platnou e-mailovou adresu.');
  }
  if (password.length < 6) {
    throw new Error('Heslo musí mít alespoň 6 znaků.');
  }

  const existingByNick = findAccountByIdentifier(cleanNick);
  if (
    existingByNick &&
    existingByNick.normalizedEmail !== normalizeEmail(cleanEmail)
  ) {
    throw new Error(
      `Přezdívka „${cleanNick}“ je již v tomto prohlížeči přiřazena jinému účtu. Zvolte prosím jinou přezdívku.`
    );
  }

  try {
    const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
    await updateProfile(cred.user, { displayName: cleanNick });

    let verificationEmailSent = false;
    try {
      await sendEmailVerification(cred.user);
      verificationEmailSent = true;
    } catch {
      // ignore if verification email rate-limited
    }

    const record: RegisteredAccountRecord = {
      uid: cred.user.uid,
      nickname: cleanNick,
      normalizedNickname: normalizeNickname(cleanNick),
      email: cleanEmail,
      normalizedEmail: normalizeEmail(cleanEmail),
      createdAt: new Date().toISOString(),
    };
    saveAccountToRegistry(record);

    const session: ActiveStudentSession = {
      uid: cred.user.uid,
      nickname: cleanNick,
      email: cleanEmail,
      isFirebaseAuth: true,
      isEmailVerified: cred.user.emailVerified,
    };
    saveActiveLocalSession(session);

    return {
      session,
      usedLocalFallback: false,
      verificationEmailSent,
    };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || '';

    if (code === 'auth/email-already-in-use') {
      throw new Error(
        'Tento e-mail je již zaregistrován. Přejděte na Přihlášení nebo použijte Obnovu hesla.'
      );
    }
    if (code === 'auth/invalid-email') {
      throw new Error('Zadaná e-mailová adresa není platná.');
    }
    if (code === 'auth/weak-password') {
      throw new Error('Heslo je příliš slabé (zadejte alespoň 6 znaků).');
    }

    // If Email/Password provider is not yet enabled in Firebase Console (auth/operation-not-allowed),
    // create an isolated local account paired with the nickname & email so the app works immediately.
    if (
      code === 'auth/operation-not-allowed' ||
      code === 'auth/configuration-not-found'
    ) {
      const existingEmail = findAccountByIdentifier(cleanEmail);
      if (existingEmail) {
        throw new Error(
          'Účet s tímto e-mailem nebo přezdívkou již existuje. Přihlaste se prosím.'
        );
      }

      const uid = generateSafeId(`usr_${cleanNick}`);
      const record: RegisteredAccountRecord = {
        uid,
        nickname: cleanNick,
        normalizedNickname: normalizeNickname(cleanNick),
        email: cleanEmail,
        normalizedEmail: normalizeEmail(cleanEmail),
        localPasswordHash: simpleHash(password),
        createdAt: new Date().toISOString(),
      };
      saveAccountToRegistry(record);

      const session: ActiveStudentSession = {
        uid,
        nickname: cleanNick,
        email: cleanEmail,
        isFirebaseAuth: false,
        isEmailVerified: false,
      };
      saveActiveLocalSession(session);

      return {
        session,
        usedLocalFallback: true,
        verificationEmailSent: false,
      };
    }

    throw new Error(
      err instanceof Error
        ? err.message
        : 'Registrace se nezdařila. Zkuste to prosím znovu.'
    );
  }
}

export async function signInWithNicknameOrEmail(params: {
  identifier: string;
  password: string;
}): Promise<{
  session: ActiveStudentSession;
  usedLocalFallback: boolean;
}> {
  const cleanId = params.identifier.trim();
  const password = params.password;

  if (!cleanId) {
    throw new Error('Zadejte svou přezdívku nebo e-mail.');
  }
  if (!password) {
    throw new Error('Zadejte heslo.');
  }

  const matchedAccount = findAccountByIdentifier(cleanId);
  const targetEmail = cleanId.includes('@')
    ? cleanId
    : matchedAccount?.email || '';

  if (!targetEmail) {
    throw new Error(
      `Účet s přezdívkou „${cleanId}“ nebyl na tomto zařízení nalezen. Pokud se přihlašujete z nového prohlížeče poprvé, zadejte svůj spárovaný e-mail, nebo si nejprve vytvořte účet.`
    );
  }

  try {
    const cred = await signInWithEmailAndPassword(auth, targetEmail, password);
    const nickname =
      cred.user.displayName ||
      matchedAccount?.nickname ||
      (targetEmail.includes('@') ? targetEmail.split('@')[0] : cleanId);

    saveAccountToRegistry({
      uid: cred.user.uid,
      nickname,
      normalizedNickname: normalizeNickname(nickname),
      email: targetEmail,
      normalizedEmail: normalizeEmail(targetEmail),
      createdAt: matchedAccount?.createdAt || new Date().toISOString(),
    });

    const session: ActiveStudentSession = {
      uid: cred.user.uid,
      nickname,
      email: targetEmail,
      isFirebaseAuth: true,
      isEmailVerified: cred.user.emailVerified,
    };
    saveActiveLocalSession(session);

    return {
      session,
      usedLocalFallback: false,
    };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || '';

    // Check if this is a local account created while Firebase Email/Password was not yet enabled
    if (
      matchedAccount?.localPasswordHash &&
      (code === 'auth/operation-not-allowed' ||
        code === 'auth/configuration-not-found' ||
        code === 'auth/user-not-found' ||
        code === 'auth/invalid-credential')
    ) {
      if (matchedAccount.localPasswordHash !== simpleHash(password)) {
        throw new Error('Zadali jste nesprávné heslo. Zkuste to znovu nebo heslo obnovte.');
      }
      const session: ActiveStudentSession = {
        uid: matchedAccount.uid,
        nickname: matchedAccount.nickname,
        email: matchedAccount.email,
        isFirebaseAuth: false,
        isEmailVerified: false,
      };
      saveActiveLocalSession(session);
      return {
        session,
        usedLocalFallback: true,
      };
    }

    if (
      code === 'auth/wrong-password' ||
      code === 'auth/invalid-credential' ||
      code === 'auth/user-not-found'
    ) {
      throw new Error(
        'Nesprávná přezdívka/e-mail nebo heslo. Zkontrolujte údaje nebo klikněte na Zapomenuté heslo.'
      );
    }

    throw new Error(
      err instanceof Error
        ? err.message
        : 'Přihlášení se nezdařilo. Zkontrolujte zadané údaje.'
    );
  }
}

export async function resetAccountPassword(params: {
  identifier: string;
  emailConfirmation?: string;
  newLocalPassword?: string;
}): Promise<{
  mode: 'email_sent' | 'local_reset_done' | 'needs_local_new_password';
  targetEmail: string;
  nickname?: string;
}> {
  const cleanId = params.identifier.trim();
  if (!cleanId) {
    throw new Error('Zadejte svou přezdívku nebo spárovaný e-mail.');
  }

  const matchedAccount = findAccountByIdentifier(cleanId);
  const targetEmail = cleanId.includes('@')
    ? cleanId
    : matchedAccount?.email || '';

  if (!targetEmail) {
    throw new Error(
      `Pro přezdívku „${cleanId}“ nebyl nalezen spárovaný e-mail. Zadejte prosím přímo e-mailovou adresu, kterou jste uvedli při registraci.`
    );
  }

  try {
    await sendPasswordResetEmail(auth, targetEmail);
    return {
      mode: 'email_sent',
      targetEmail,
      nickname: matchedAccount?.nickname,
    };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || '';

    // If account was created in local mode before Firebase Email/Password provider was enabled in console
    if (
      matchedAccount &&
      (code === 'auth/operation-not-allowed' ||
        code === 'auth/configuration-not-found' ||
        code === 'auth/user-not-found')
    ) {
      if (!params.newLocalPassword) {
        return {
          mode: 'needs_local_new_password',
          targetEmail: matchedAccount.email,
          nickname: matchedAccount.nickname,
        };
      }
      if (
        params.emailConfirmation &&
        normalizeEmail(params.emailConfirmation) !==
          matchedAccount.normalizedEmail
      ) {
        throw new Error(
          'Zadaný e-mail neodpovídá e-mailu spárovanému s touto přezdívkou.'
        );
      }
      if (params.newLocalPassword.length < 6) {
        throw new Error('Nové heslo musí mít alespoň 6 znaků.');
      }

      saveAccountToRegistry({
        ...matchedAccount,
        localPasswordHash: simpleHash(params.newLocalPassword),
      });

      return {
        mode: 'local_reset_done',
        targetEmail: matchedAccount.email,
        nickname: matchedAccount.nickname,
      };
    }

    if (code === 'auth/invalid-email') {
      throw new Error('Zadaná e-mailová adresa není platná.');
    }

    throw new Error(
      err instanceof Error
        ? err.message
        : 'Nepodařilo se odeslat požadavek na obnovu hesla.'
    );
  }
}
