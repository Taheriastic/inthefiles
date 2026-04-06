export function LoadingIndicator() {
  return (
    <div className="message message-assistant">
      <div className="message-avatar loading-avatar">
        <div className="pulse-dot" />
      </div>
      <div className="message-content">
        <div className="loading-dots">
          <span />
          <span />
          <span />
        </div>
        <p className="loading-text">Searching files & analyzing documents...</p>
      </div>
    </div>
  );
}
