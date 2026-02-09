"use client";

import { useMailStore } from "@/store/mailStore";
import { X, Filter, Trash2 } from "lucide-react";
import { useState } from "react";

export default function FilterBar() {
  const { filters, setFilters, clearFilters } = useMailStore();
  const [senderInput, setSenderInput] = useState(filters.sender || "");

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <select
        value={filters.dateRange || ""}
        onChange={(e) => setFilters({ dateRange: e.target.value || undefined })}
        className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
      >
        <option value="">All Time</option>
        <option value="today">Today</option>
        <option value="last_week">Last Week</option>
        <option value="last_month">Last Month</option>
      </select>

      <input
        type="text"
        placeholder="Filter by sender..."
        value={senderInput}
        onChange={(e) => setSenderInput(e.target.value)}
        onBlur={() => setFilters({ sender: senderInput || undefined })}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            setFilters({ sender: senderInput || undefined });
          }
        }}
        className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
      />

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={filters.unread || false}
          onChange={(e) =>
            setFilters({ unread: e.target.checked || undefined })
          }
          className="rounded"
        />
        <span className="text-zinc-700 dark:text-zinc-300">Unread Only</span>
      </label>

      {(filters.dateRange || filters.sender || filters.unread) && (
        <button
          onClick={clearFilters}
          className="ml-auto flex items-center gap-1 rounded-md bg-zinc-100 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
