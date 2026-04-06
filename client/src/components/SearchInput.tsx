import { useState, type FormEvent, type KeyboardEvent } from "react";
import { Search, ArrowUp } from "lucide-react";

interface Props {
  onSubmit: (query: string) => void;
  isLoading: boolean;
}

export function SearchInput({ onSubmit, isLoading }: Props) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onSubmit(query.trim());
      setQuery("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form className="search-form" onSubmit={handleSubmit}>
      <div className="search-input-wrapper">
        <Search size={20} className="search-icon" />
        <textarea
          className="search-input"
          placeholder="Ask anything about the Epstein files... (e.g., 'Summarize the flight logs')"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={isLoading}
        />
        <button
          className="search-button"
          type="submit"
          disabled={!query.trim() || isLoading}
          aria-label="Search"
        >
          <ArrowUp size={18} />
        </button>
      </div>
      <p className="search-disclaimer">
        Searches public court documents and released files. All information is from public records.
      </p>
    </form>
  );
}
