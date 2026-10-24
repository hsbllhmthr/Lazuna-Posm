import React, { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled Application Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white text-zinc-900 flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full p-6 border border-zinc-200 rounded-xl shadow-sm bg-white text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-[#ff0000]/10 text-[#ff0000] flex items-center justify-center mx-auto text-xl font-bold">
              !
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900">Terjadi Kesalahan Aplikasi</h2>
              <p className="text-xs text-zinc-500 mt-1">
                {this.state.error?.message || 'Error tidak terduga terjadi saat memuat komponen.'}
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-zinc-900 text-white rounded-md text-xs font-medium hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Muat Ulang Halaman
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

