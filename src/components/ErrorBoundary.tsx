import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * Top-level error boundary.
 *
 * Without it, a render-time exception blanks the whole app and the user only
 * sees a white screen. This keeps the failure local, reports it, and offers a
 * reload. It intentionally shows no stack trace, no database detail and no
 * provider error to the user.
 */
interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): State {
    const message =
      error instanceof Error && error.message
        ? 'وقعت مشكل تقنية غير متوقعة.'
        : 'وقعت مشكل تقنية غير متوقعة.';
    return { hasError: true, message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Server-side detail only; nothing sensitive is rendered.
    console.error('Unhandled UI error:', error.message, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-[#090D16] px-4 text-white"
      >
        <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <h1 className="text-xl font-bold">{this.state.message}</h1>
          <p className="mt-3 text-sm text-white/60">
            الصفحة تقدر تكون فيها مشكل مؤقت. جرّب تعاود تحمّلها، ولا كان ديما نفس المشكل
            تواصل مع الدعم.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={this.handleReload}
              className="rounded-full bg-gradient-to-r from-rose-500 to-orange-500 px-6 py-3 text-sm font-semibold"
            >
              إعادة التحميل
            </button>
            <a
              href="/feed"
              className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white/80 hover:bg-white/5"
            >
              رجوع للرئيسية
            </a>
          </div>
        </section>
      </main>
    );
  }
}