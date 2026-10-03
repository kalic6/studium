import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'Neočekávaná chyba aplikace.',
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error in ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let parsedError: Record<string, unknown> | null = null;
      try {
        parsedError = JSON.parse(this.state.errorMessage);
      } catch {
        parsedError = null;
      }

      return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-slate-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-2 flex-1">
                <h2 className="text-base font-semibold text-slate-900">
                  Došlo k chybě při zpracování požadavku
                </h2>
                <p className="text-sm text-slate-600">
                  Operaci se nepodařilo dokončit. Zkontrolujte prosím připojení nebo oprávnění účtu.
                </p>
                {parsedError ? (
                  <pre className="text-xs font-mono bg-slate-50 border border-slate-200 rounded p-3 overflow-x-auto text-slate-700">
                    {JSON.stringify(parsedError, null, 2)}
                  </pre>
                ) : (
                  <p className="text-xs font-mono bg-slate-50 border border-slate-200 rounded p-3 text-slate-700">
                    {this.state.errorMessage}
                  </p>
                )}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      this.setState({ hasError: false, errorMessage: '' });
                      window.location.reload();
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#003865] rounded-md hover:bg-[#002848] transition-colors whitespace-nowrap"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Obnovit aplikaci
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
