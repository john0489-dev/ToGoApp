import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error("[ErrorBoundary]", error, info);
  }

  handleReload = () => {
    if (typeof window !== "undefined") window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#f5f0e8",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          textAlign: "center",
          color: "#1a1a18",
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "rgba(196,132,74,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#c4844a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>Algo deu errado</h1>
        <p style={{ marginTop: 8, marginBottom: 20, fontSize: 15, color: "#5a5a55", fontFamily: "system-ui, sans-serif" }}>
          Tente recarregar a página.
        </p>
        <button
          onClick={this.handleReload}
          style={{
            background: "#c4844a",
            color: "#fff",
            border: "none",
            borderRadius: 999,
            padding: "10px 22px",
            fontSize: 15,
            cursor: "pointer",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          Recarregar página
        </button>
      </div>
    );
  }
}
