import { StrictMode, Component, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

// Catch all silent React crashes and display them instead of blank screen
class ErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error: error.message + '\n' + error.stack };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ background: '#0f172a', color: '#f87171', padding: '2rem', fontFamily: 'monospace', minHeight: '100vh' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>⚠️ Runtime Error Caught</h1>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.875rem' }}>{this.state.error}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <App />
      </HashRouter>
    </ErrorBoundary>
  </StrictMode>,
)
