import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[SoundWave ErrorBoundary caught error]:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center text-center p-6 bg-slate-950 text-white">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4 text-amber-400">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold mb-2">Something unexpected occurred</h3>
          <p className="text-xs text-slate-400 max-w-sm mb-6">
            SoundWave encountered an error while rendering this view. Your saved music, playlists, and settings are safe.
          </p>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-cyan-500/20"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reload SoundWave</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
