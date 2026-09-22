import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in Phase 10 app:', error, errorInfo);
  }

  public handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center select-none">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-red-500/20 border border-red-500 flex items-center justify-center text-red-400 animate-bounceShort">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h2 className="text-xl font-black text-white">حدث خطأ غير متوقع / Unexpected Error</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              {this.state.error?.message || 'Something went wrong while rendering the game.'}
            </p>

            <button
              onClick={this.handleReload}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-white font-black text-sm shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              <span>إعادة تحميل اللعبة (Reload Game)</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
