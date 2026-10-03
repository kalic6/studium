import React, { useState } from 'react';
import {
  LogIn,
  UserPlus,
  KeyRound,
  Check,
  AlertCircle,
} from 'lucide-react';
import {
  ActiveStudentSession,
  registerWithNicknameAndPassword,
  signInWithNicknameOrEmail,
  resetAccountPassword,
} from '../authAccounts';

interface AuthScreenProps {
  onAuthenticated: (
    session: ActiveStudentSession,
    infoBanner?: string | null
  ) => void;
  onGoogleSignIn: () => Promise<void>;
  externalError?: string | null;
}

type AuthTab = 'login' | 'register' | 'reset';

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onAuthenticated,
  onGoogleSignIn,
  externalError,
}) => {
  const [tab, setTab] = useState<AuthTab>('login');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Login fields
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register fields
  const [regNickname, setRegNickname] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('');

  // Password reset fields
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [needsLocalResetFields, setNeedsLocalResetFields] = useState(false);
  const [resetEmailConfirm, setResetEmailConfirm] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');

  const switchTab = (next: AuthTab) => {
    setTab(next);
    setErrorMsg(null);
    setSuccessMsg(null);
    setNeedsLocalResetFields(false);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);
    try {
      const result = await signInWithNicknameOrEmail({
        identifier: loginIdentifier,
        password: loginPassword,
      });
      onAuthenticated(result.session, null);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Přihlášení se nezdařilo.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (regPassword !== regPasswordConfirm) {
      setErrorMsg('Zadaná hesla se neshodují. Zkontrolujte prosím potvrzení hesla.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await registerWithNicknameAndPassword({
        nickname: regNickname,
        email: regEmail,
        password: regPassword,
      });

      const banner = result.verificationEmailSent
        ? `Účet „${result.session.nickname}“ byl vytvořen. Na adresu ${result.session.email} jsme odeslali ověřovací e-mail pro plnou cloudovou synchronizaci.`
        : `Účet „${result.session.nickname}“ (${result.session.email}) byl úspěšně vytvořen.`;

      onAuthenticated(result.session, banner);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Registrace se nezdařila.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      const res = await resetAccountPassword({
        identifier: resetIdentifier,
        emailConfirmation: needsLocalResetFields ? resetEmailConfirm : undefined,
        newLocalPassword: needsLocalResetFields ? resetNewPassword : undefined,
      });

      if (res.mode === 'email_sent') {
        setSuccessMsg(
          `Na spárovaný e-mail (${res.targetEmail}) byl odeslán odkaz pro nastavení nového hesla. Zkontrolujte svou e-mailovou schránku (případně složku Spam).`
        );
      } else if (res.mode === 'needs_local_new_password') {
        setNeedsLocalResetFields(true);
        setSuccessMsg(
          `Účet nalezen. Pro okamžité nastavení nového hesla potvrďte svůj spárovaný e-mail a zadejte nové heslo.`
        );
      } else if (res.mode === 'local_reset_done') {
        setNeedsLocalResetFields(false);
        setResetNewPassword('');
        setResetEmailConfirm('');
        setTab('login');
        setLoginIdentifier(res.nickname || res.targetEmail);
        setSuccessMsg(
          'Vaše heslo bylo úspěšně změněno. Nyní se můžete přihlásit novým heslem.'
        );
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Obnova hesla se nezdařila. Zkontrolujte zadané údaje.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayedError = errorMsg || externalError;

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
        <span className="text-lg font-bold tracking-tight text-[#003865]">
          Studijní deník
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => switchTab('login')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              tab === 'login'
                ? 'bg-[#003865] text-white'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            Přihlášení
          </button>
          <button
            type="button"
            onClick={() => switchTab('register')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              tab === 'register'
                ? 'bg-[#003865] text-white'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            Vytvořit účet
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-md max-w-md w-full p-7 space-y-6">
          {/* Header */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#5BC0F8] text-white flex items-center justify-center font-mono font-semibold text-sm select-none shrink-0">
                M
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Studijní deník
                </h1>
                <p className="text-xs text-slate-500">
                  Osobní organizace studia, předmětů, úkolů a zápisů
                </p>
              </div>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => switchTab('login')}
              className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                tab === 'login'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Přihlásit se
            </button>
            <button
              type="button"
              onClick={() => switchTab('register')}
              className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                tab === 'register'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Nový účet
            </button>
            <button
              type="button"
              onClick={() => switchTab('reset')}
              className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                tab === 'reset'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Obnova hesla
            </button>
          </div>

          {/* Feedback Notices */}
          {displayedError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{displayedError}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md flex items-start gap-2 text-xs text-emerald-800">
              <Check className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 1: LOGIN WITH NICKNAME OR EMAIL + PASSWORD                  */}
          {/* =============================================================== */}
          {tab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Přezdívka nebo e-mail *
                </label>
                <input
                  type="text"
                  required
                  autoComplete="username"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="Zadejte svou přezdívku (nebo e-mail)..."
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:border-[#003865]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-700">
                    Heslo *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetIdentifier(loginIdentifier);
                      switchTab('reset');
                    }}
                    className="text-xs text-[#003865] hover:underline font-medium"
                  >
                    Zapomněli jste heslo?
                  </button>
                </div>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Zadejte své heslo..."
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:border-[#003865]"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#003865] rounded-md hover:bg-[#002848] transition-colors disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" />
                <span>
                  {isSubmitting ? 'Přihlašuji...' : 'Přihlásit se'}
                </span>
              </button>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                <span>Ještě nemáte vytvořený účet?</span>
                <button
                  type="button"
                  onClick={() => switchTab('register')}
                  className="font-semibold text-[#003865] hover:underline"
                >
                  Zaregistrovat přezdívku →
                </button>
              </div>
            </form>
          )}

          {/* =============================================================== */}
          {/* TAB 2: REGISTER NEW ACCOUNT (NICKNAME + EMAIL + PASSWORD)       */}
          {/* =============================================================== */}
          {tab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Zvolená přezdívka (uživatelské jméno) *
                </label>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={50}
                  autoComplete="username"
                  value={regNickname}
                  onChange={(e) => setRegNickname(e.target.value)}
                  placeholder="např. katka / honza_muni"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:border-[#003865]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Váš e-mail (pro spárování účtu a obnovu hesla) *
                </label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="vas.email@priklad.cz"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:border-[#003865]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Heslo (min. 6 znaků) *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:border-[#003865]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Potvrzení hesla *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={regPasswordConfirm}
                    onChange={(e) => setRegPasswordConfirm(e.target.value)}
                    placeholder="••••••"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:border-[#003865]"
                  />
                </div>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                Každému zaregistrovanému studentovi se vytvoří vlastní oddělený prostor s předměty 1. semestru, které si může libovolně upravovat.
              </p>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#003865] rounded-md hover:bg-[#002848] transition-colors disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                <span>
                  {isSubmitting ? 'Vytvářím účet...' : 'Vytvořit účet a přihlásit se'}
                </span>
              </button>
            </form>
          )}

          {/* =============================================================== */}
          {/* TAB 3: PASSWORD RESET                                           */}
          {/* =============================================================== */}
          {tab === 'reset' && (
            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div className="text-xs text-slate-600 leading-relaxed">
                Zadejte svou <strong>přezdívku</strong> nebo <strong>spárovaný e-mail</strong>, který jste uvedli při registraci, pro obnovení zapomenutého hesla.
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Přezdívka nebo spárovaný e-mail *
                </label>
                <input
                  type="text"
                  required
                  value={resetIdentifier}
                  onChange={(e) => setResetIdentifier(e.target.value)}
                  placeholder="např. katka nebo vas.email@priklad.cz"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:border-[#003865]"
                />
              </div>

              {needsLocalResetFields && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Potvrďte svůj spárovaný e-mail *
                    </label>
                    <input
                      type="email"
                      required
                      value={resetEmailConfirm}
                      onChange={(e) => setResetEmailConfirm(e.target.value)}
                      placeholder="vas.email@priklad.cz"
                      className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:border-[#003865]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Nové heslo (min. 6 znaků) *
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={resetNewPassword}
                      onChange={(e) => setResetNewPassword(e.target.value)}
                      placeholder="Zadejte nové heslo..."
                      className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:border-[#003865]"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#003865] rounded-md hover:bg-[#002848] transition-colors disabled:opacity-50"
              >
                <KeyRound className="w-4 h-4" />
                <span>
                  {isSubmitting
                    ? 'Zpracovávám...'
                    : needsLocalResetFields
                    ? 'Nastavit nové heslo'
                    : 'Obnovit zapomenuté heslo'}
                </span>
              </button>

              <div className="pt-2 border-t border-slate-200 text-center">
                <button
                  type="button"
                  onClick={() => switchTab('login')}
                  className="text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  ← Zpět na přihlášení
                </button>
              </div>
            </form>
          )}

          {/* Secondary Google Login Option */}
          <div className="pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onGoogleSignIn}
              className="w-full px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors"
            >
              Nebo se přihlásit přes účet Google
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};
