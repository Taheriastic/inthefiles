export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface Stats {
  numberOfDocuments: number;
  rawDocumentDbSize: number;
  isIndexing: boolean;
  fieldDistribution: Record<string, number>;
}
