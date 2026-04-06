import { Sparkles } from "lucide-react";

interface Props {
  onSelect: (query: string) => void;
}

const SUGGESTIONS = [
  "Summarize the Epstein flight logs",
  "Who are the key people mentioned in the files?",
  "What do the documents say about Ghislaine Maxwell?",
  "Tell me about Little St. James Island",
  "What connections to Bill Clinton are in the files?",
  "Summarize Prince Andrew's involvement",
  "What did Virginia Giuffre testify about?",
  "List all aircraft mentioned in the documents",
];

export function SuggestedQueries({ onSelect }: Props) {
  return (
    <div className="suggestions">
      <div className="suggestions-header">
        <Sparkles size={16} />
        <span>Suggested Searches</span>
      </div>
      <div className="suggestions-grid">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            className="suggestion-chip"
            onClick={() => onSelect(s)}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
