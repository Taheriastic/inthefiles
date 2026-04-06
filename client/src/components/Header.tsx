import { FileSearch, Shield } from "lucide-react";

export function Header() {
  return (
    <header className="header">
      <div className="header-inner">
        <div className="header-brand">
          <div className="header-logo">
            <FileSearch size={28} />
          </div>
          <div>
            <h1 className="header-title">InTheFiles</h1>
            <p className="header-subtitle">Epstein Files Search Engine</p>
          </div>
        </div>
        <div className="header-badge">
          <Shield size={14} />
          <span>Public Records</span>
        </div>
      </div>
    </header>
  );
}
