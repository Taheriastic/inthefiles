import { Router, Request, Response } from "express";

const router = Router();
const MEILI_HOST = process.env.MEILI_HOST || "https://epstein.dugganusa.com";
const MEILI_KEY = process.env.MEILI_KEY!;
const STATS_KEY = process.env.STATS_KEY!;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

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
- If the primary database documents don't contain enough info, you may also have supplementary context from the DOJ Epstein Library (${DOJ_EPSTEIN_URL}) and other public sources — use those too and clearly mark them as "Source: DOJ / Public Records".
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

// Helper: Use Gemini with Google Search grounding to find additional public info
async function searchWebForContext(query: string): Promise<string> {
  const body = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Search for information about this topic related to the Jeffrey Epstein case from official sources like justice.gov/epstein, court records, and news reports. Be factual and cite your sources.

Topic: ${query}

Provide a factual summary of what you find, with source URLs where possible.`,
          },
        ],
      },
    ],
    tools: [
      {
        google_search: {},
      },
    ],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 2048,
    },
  };

  try {
    const res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error("Web search grounding failed:", res.status);
      return "";
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Also extract grounding sources if available
    const groundingMeta = data.candidates?.[0]?.groundingMetadata;
    const sources = groundingMeta?.groundingChunks
      ?.map((chunk: any) => chunk.web?.uri)
      .filter(Boolean)
      ?.slice(0, 5) || [];

    let result = text;
    if (sources.length > 0) {
      result += `\n\nWeb Sources:\n${sources.map((s: string) => `- ${s}`).join("\n")}`;
    }

    return result;
  } catch (err) {
    console.error("Web search error:", err);
    return "";
  }
}

// Helper: extract search keywords from a conversational query using Gemini
async function extractSearchQueries(userMessage: string, chatHistory: any[]): Promise<string[]> {
  const recentContext = chatHistory.slice(-6).map((m: any) => `${m.role}: ${m.content}`).join("\n");

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Given this chat history and the latest user message, extract 1-3 concise search queries (keywords/names/phrases) to search the Epstein files database. Return ONLY the queries, one per line, no numbering or extra text.

Chat context:
${recentContext}

Latest message: "${userMessage}"

Search queries:`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 100,
    },
  };

  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) return [userMessage];

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || userMessage;
  const queries = text
    .split("\n")
    .map((q: string) => q.trim())
    .filter((q: string) => q.length > 0 && q.length < 200);

  return queries.length > 0 ? queries.slice(0, 3) : [userMessage];
}

// Helper: call Gemini with context
async function generateResponse(
  userMessage: string,
  documents: any[],
  webContext: string,
  chatHistory: any[]
): Promise<string> {
  // Build document context
  const docContext = documents
    .slice(0, 20)
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

  // Build supplementary web context section
  const webSection = webContext
    ? `\n\n=== SUPPLEMENTARY CONTEXT (from DOJ Epstein Library & public sources) ===\n${webContext}`
    : "";

  // Build chat history for Gemini (convert to Gemini format)
  const geminiHistory = chatHistory.slice(-8).map((m: any) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const contents = [
    {
      role: "user",
      parts: [{ text: SYSTEM_PROMPT }],
    },
    {
      role: "model",
      parts: [
        {
          text: "Understood. I'm InTheFiles, ready to analyze Epstein case documents. I'll provide detailed, well-sourced answers using the database documents as my primary source, supplemented by DOJ and public records when needed.",
        },
      ],
    },
    ...geminiHistory,
    {
      role: "user",
      parts: [
        {
          text: `=== PRIMARY SOURCE: Epstein Files Database ===\n\n${docContext || "(No matching documents found in the database)"}\n${webSection}\n\n---\n\nUser's question: ${userMessage}\n\nProvide a detailed, well-formatted response. Prioritize information from the database documents, and supplement with web sources when the database doesn't have enough. Clearly indicate the source of each piece of information.`,
        },
      ],
    },
  ];

  const body = {
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 4096,
    },
  };

  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Gemini API error:", errText);
    throw new Error(`Gemini API error: ${res.status}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't generate a response. Please try again.";
}

// ============================================
// Routes
// ============================================

// Smart chat endpoint — searches DB + web + AI response
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

    // Step 4: If DB results are sparse, also search the web (DOJ site + public sources)
    let webContext = "";
    let usedWebSearch = false;
    const dbAvailable = searchResults.some((r) => r !== null);

    if (allDocs.length < 5) {
      console.log("📡 Few DB results — searching web for supplementary info...");
      webContext = await searchWebForContext(message);
      usedWebSearch = !!webContext;
    }

    // Step 5: Generate AI response using all context
    const aiResponse = await generateResponse(message, allDocs, webContext, history || []);

    const sources: string[] = [];
    if (dbAvailable && allDocs.length > 0) sources.push("Epstein Files Database");
    if (usedWebSearch) sources.push("DOJ Epstein Library & Public Records");
    if (sources.length === 0) sources.push("Public Records (Web)");

    return res.json({
      success: true,
      response: aiResponse,
      dbAvailable,
      meta: {
        searchQueries,
        totalDocumentsFound: totalHits,
        documentsUsed: Math.min(allDocs.length, 20),
        sources,
        usedWebSearch,
      },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return res.status(500).json({ error: "Failed to generate response" });
  }
});

// Raw search endpoint (kept for direct searches)
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
