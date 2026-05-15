import { StrictMode, Component, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: "100svh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, background: "#f8fafc", fontFamily: "sans-serif" }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: 32, maxWidth: 340, width: "100%", textAlign: "center", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <p style={{ fontWeight: 800, fontSize: 16, color: "#0f172a", marginBottom: 8 }}>Something went wrong</p>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 24 }}>The app ran into an unexpected error. Tap below to reload.</p>
            <button
              onClick={() => window.location.replace("/")}
              style={{ width: "100%", padding: "12px 0", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 14, fontWeight: 800, fontSize: 14, cursor: "pointer" }}
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
