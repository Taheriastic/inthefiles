import { Router, Request, Response } from "express";

const router = Router();
const MEILI_HOST = process.env.MEILI_HOST || "https://epstein.dugganusa.com";
const MEILI_KEY = process.env.MEILI_KEY!;
const STATS_KEY = process.env.STATS_KEY!;
const GROQ_API_KEY = process.env.GROQ_API_KEY!;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

const MEILI_HEADERS = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${MEILI_KEY}`,
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)",
  Origin: MEILI_HOST,
  Referer: `${MEILI_HOST}/`,
};

const DOJ_EPSTEIN_URL = "https://www.justice.gov/epstein";

const SYSTEM_PROMPT = `You are "InTheFiles", an expert AI analyst specializing in the Jeffrey Epstein case files. You have access to a database of 88,000+ court documents, flight logs, depositions, emails, and other public records related to the Epstein case.

Your job:
- Answer user questions using the document excerpts provided as context.
- Be detailed, thorough, and well-organized in your responses.
- Use markdown formatting: headers, bold, bullet points, tables when appropriate.
- If asked to summarize, provide a clear and concise summary.
- If asked about flight records, list them in a structured table format.
- If asked about people/connections, explain relationships found in the documents.
- Always cite which documents your information comes from (use EFTA IDs or source when available).
- If the primary database documents don't contain enough info, you may supplement with your knowledge of public records related to the case — clearly mark these as "Source: Public Records".
- If you still don't have enough info, say so honestly and suggest what the user could search for instead.
- Never fabricate information that isn't in the provided documents or public knowledge.
- Be neutral and factual — present what the documents say without editorializing.`;

// Helper: search the Epstein files API (Meilisearch)
async function searchFiles(query: string, limit = 20): Promise<any> {
  const response = await fetch(`${MEILI_HOST}/indexes/epstein_files/search`, {
    method: "POST",
    headers: MEILI_HEADERS,
    body: JSON.stringify({ q: query, limit }),
  });
  if (!response.ok) throw new Error(`Search API error: ${response.status}`);
  return response.json();
}

// Helper: call Groq (OpenAI-compatible)
async function callGroq(messages: any[], temperature = 0.7, maxTokens = 4096): Promise<string> {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

// Helper: extract search keywords from a conversational query
async function extractSearchQueries(userMessage: string, chatHistory: any[]): Promise<string[]> {
  const recentContext = chatHistory.slice(-6).map((m: any) => `${m.role}: ${m.content}`).join("\n");

  const text = await callGroq([
    {
      role: "user",
      content: `Given this chat history and the latest user message, extract 1-3 concise search queries (keywords/names/phrases) to search the Epstein files database. Return ONLY the queries, one per line, no numbering or extra text.

Chat context:
${recentContext}

Latest message: "${userMessage}"

Search queries:`,
    },
  ], 0.1, 100);

  const queries = text
    .split("\n")
    .map((q: string) => q.trim())
    .filter((q: string) => q.length > 0 && q.length < 200);

  return queries.length > 0 ? queries.slice(0, 3) : [userMessage];
}

// Helper: generate AI response using document context
async function generateResponse(
  userMessage: string,
  documents: any[],
  chatHistory: any[]
): Promise<string> {
  const docContext = documents
    .slice(0, 15)
    .map((doc: any, i: number) => {
      const parts = [`--- Document ${i + 1} ---`];
      if (doc.efta_id) parts.push(`EFTA ID: ${doc.efta_id}`);
      if (doc.doc_type) parts.push(`Type: ${doc.doc_type}`);
      if (doc.source) parts.push(`Source: ${doc.source}`);
      if (doc.people?.length) parts.push(`People: ${doc.people.join(", ")}`);
      if (doc.locations?.length) parts.push(`Locations: ${doc.locations.join(", ")}`);
      if (doc.aircraft?.length) parts.push(`Aircraft: ${doc.aircraft.join(", ")}`);
      const content = doc.content || doc.content_preview || "";
      if (content) parts.push(`Content:\n${content.slice(0, 1500)}`);
      return parts.join("\n");
    })
    .join("\n\n");

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...chatHistory.slice(-8).map((m: any) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    })),
    {
      role: "user",
      content: `=== PRIMARY SOURCE: Epstein Files Database ===\n\n${docContext || "(No matching documents found in the database)"}\n\n---\n\nUser's question: ${userMessage}\n\nProvide a detailed, well-formatted response citing document sources where available.`,
    },
  ];

  return callGroq(messages, 0.7, 4096);
}

// ============================================
// Routes
// ============================================

// Smart chat endpoint — searches DB + AI response
router.post("/chat", async (req: Request, res: Response) => {
  try {
    const { message, history } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Step 1: Extract smart search queries from the user message
    const searchQueries = await extractSearchQueries(message, history || []);
    console.log("🔍 Search queries:", searchQueries);

    // Step 2: Search the files DB with all queries in parallel
    const searchPromises = searchQueries.map((q) => searchFiles(q).catch(() => null));
    const searchResults = await Promise.all(searchPromises);

    // Step 3: Merge & deduplicate results
    const allDocs: any[] = [];
    const seenIds = new Set<string>();
    for (const result of searchResults) {
      const hits = result?.hits || [];
      for (const hit of hits) {
        const id = hit.id || hit.efta_id || JSON.stringify(hit).slice(0, 100);
        if (!seenIds.has(id)) {
          seenIds.add(id);
          allDocs.push(hit);
        }
      }
    }

    const totalHits = searchResults.reduce(
      (sum, r) => sum + (r?.estimatedTotalHits || 0),
      0
    );

    const dbAvailable = searchResults.some((r) => r !== null);

    // Step 4: Generate AI response using document context
    const aiResponse = await generateResponse(message, allDocs, history || []);

    const sources: string[] = [];
    if (dbAvailable && allDocs.length > 0) sources.push("Epstein Files Database");
    if (sources.length === 0) sources.push("Public Records");

    return res.json({
      success: true,
      response: aiResponse,
      dbAvailable,
      meta: {
        searchQueries,
        totalDocumentsFound: totalHits,
        documentsUsed: Math.min(allDocs.length, 15),
        sources,
      },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return res.status(500).json({ error: "Failed to generate response" });
  }
});

// Raw search endpoint
router.get("/search", async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ error: "Query parameter 'q' is required" });
    }

    const data = await searchFiles(query);
    return res.json(data);
  } catch (error) {
    console.error("Search error:", error);
    return res.status(500).json({ error: "Failed to fetch search results" });
  }
});

// Stats endpoint
router.get("/stats", async (_req: Request, res: Response) => {
  try {
    const response = await fetch(`${MEILI_HOST}/indexes/epstein_files/stats`, {
      headers: {
        Authorization: `Bearer ${STATS_KEY}`,
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)",
        Origin: MEILI_HOST,
        Referer: `${MEILI_HOST}/`,
      },
    });

    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }

    const data = await response.json();
    return res.json(data);
  } catch (error) {
    console.error("Stats error:", error);
    return res.status(500).json({ error: "Failed to fetch stats" });
  }
});

export { router as searchRouter };
