import { Component } from 'react';
import { RotateCcw, TriangleAlert } from 'lucide-react';

/**
 * Keeps a render failure inside one region of the tree.
 *
 * React 18 unmounts the entire tree when a component throws during render, so a
 * single bad reference (for example an undeclared prop) used to blank the whole
 * application. With a boundary in place the shell, sidebar and header stay alive
 * and only the failing panel is replaced by a recoverable message.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
    this.reset = this.reset.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidUpdate(prevProps) {
    // Navigating away from a broken view clears the error, so the user is not
    // stuck on a dead panel after switching modules.
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.reset();
    }
  }

  componentDidCatch(error, info) {
    // Keep the detail in the console for the operator, never in the UI.
    console.error('[WatLab] render error caught by ErrorBoundary:', error, info);
  }

  reset() {
    this.setState({ error: null });
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) return this.props.fallback(error, this.reset);

    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 px-6 py-10 text-center">
        <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-red-100">
          <TriangleAlert className="h-4 w-4 text-red-600" />
        </span>
        <h3 className="text-[14px] font-semibold tracking-tight text-slate-900">
          Ce module n’a pas pu s’afficher
        </h3>
        <p className="mt-1 max-w-md text-[11px] leading-4 text-slate-600">
          Les autres modules restent disponibles. Réessayez, ou changez de vue dans le
          menu de gauche.
        </p>
        <pre className="mt-3 max-w-full overflow-x-auto rounded-md border border-red-200 bg-white px-3 py-2 text-left font-mono text-[10px] leading-4 text-red-700">
          {String(error && error.message ? error.message : error)}
        </pre>
        <button
          onClick={this.reset}
          className="mt-4 flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-brand-700"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Réessayer
        </button>
      </div>
    );
  }
}
