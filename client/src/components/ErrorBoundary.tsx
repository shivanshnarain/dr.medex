import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
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
    console.error("DR.MEDEX Uncaught React Error Boundary:", error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex items-center justify-center p-6 bg-white">
          <div className="max-w-md w-full bg-white border border-neutral-200 rounded-2xl p-8 text-center space-y-4 shadow-sm">
            <div className="w-12 h-12 mx-auto rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <AlertTriangle size={24} />
            </div>
            <h2 className="text-xl font-extrabold text-[#111111]">
              {this.props.fallbackTitle || "Something went wrong"}
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
              {this.props.fallbackMessage ||
                "A rendering issue occurred while displaying this page. Our team has been notified."}
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-5 py-2.5 bg-[#111111] hover:bg-black text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2"
              >
                <RotateCcw size={14} />
                <span>Reload Page</span>
              </button>
              <a
                href="/"
                className="px-5 py-2.5 bg-white border border-neutral-300 text-neutral-900 rounded-xl text-xs font-bold hover:bg-neutral-50 transition-colors flex items-center gap-2"
              >
                <Home size={14} />
                <span>Return Home</span>
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
