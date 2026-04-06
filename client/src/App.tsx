import { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { ChatWindow } from "./components/ChatWindow";
import { SearchInput } from "./components/SearchInput";
import { StatsBar } from "./components/StatsBar";
import { SuggestedQueries } from "./components/SuggestedQueries";
import type { Message, Stats } from "./types";

function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Welcome to **InTheFiles** 🔍\n\nI'm an AI-powered analyst with access to **88,000+** Epstein case documents — court filings, flight logs, depositions, emails, and more.\n\nAsk me anything:\n- *\"Summarize the flight logs involving Bill Clinton\"*\n- *\"What do the documents say about Ghislaine Maxwell's role?\"*\n- *\"List all people connected to Little St. James Island\"*\n\nI'll search the files and give you a detailed, sourced answer.",
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/stats");
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  };

  const handleSearch = async (query: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: query,
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      // Build chat history for the API (exclude welcome message)
      const history = updatedMessages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: query, history }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to get response");
      }

      // Build the response with metadata
      let responseContent = data.response;
      if (data.meta) {
        const { totalDocumentsFound, documentsUsed, searchQueries, sources } = data.meta;
        const srcList = (sources || ["Epstein Files Database"]).join(" + ");
        responseContent += `\n\n---\n*📊 Searched ${totalDocumentsFound.toLocaleString()} documents (analyzed ${documentsUsed} most relevant) | Sources: ${srcList} | Queries: ${searchQueries.map((q: string) => `\`${q}\``).join(", ")}*`;
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: responseContent,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "⚠️ Sorry, I encountered an error processing your request. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app">
      <Header />
      <StatsBar stats={stats} />
      <main className="main-content">
        <ChatWindow messages={messages} isLoading={isLoading} />
        {messages.length <= 1 && !isLoading && (
          <SuggestedQueries onSelect={handleSearch} />
        )}
        <SearchInput onSubmit={handleSearch} isLoading={isLoading} />
      </main>
    </div>
  );
}

export default App;
