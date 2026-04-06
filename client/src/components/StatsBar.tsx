import { Database, FileText, HardDrive } from "lucide-react";
import type { Stats } from "../types";

interface Props {
  stats: Stats | null;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000_000) return (bytes / 1_000_000_000).toFixed(1) + " GB";
  if (bytes >= 1_000_000) return (bytes / 1_000_000).toFixed(1) + " MB";
  return bytes.toLocaleString() + " B";
}

export function StatsBar({ stats }: Props) {
  if (!stats?.numberOfDocuments) return null;

  const docCount = stats.numberOfDocuments;
  const dbSize = stats.rawDocumentDbSize ?? 0;

  const items = [
    {
      icon: <FileText size={14} />,
      label: "Documents",
      value: docCount.toLocaleString(),
    },
    {
      icon: <Database size={14} />,
      label: "Database",
      value: formatBytes(dbSize),
    },
    {
      icon: <HardDrive size={14} />,
      label: "Index",
      value: "epstein_files",
    },
  ];

  return (
    <div className="stats-bar">
      {items.map((item) => (
        <div className="stats-item" key={item.label}>
          {item.icon}
          <span className="stats-label">{item.label}:</span>
          <span className="stats-value">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
