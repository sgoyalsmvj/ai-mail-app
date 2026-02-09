"use client";

import { useMailStore } from "@/store/mailStore";
import { X, Filter } from "lucide-react";
import { useState } from "react";

export default function FilterBar() {
  const { filters, setFilters, clearFilters } = useMailStore();
  const [senderInput, setSenderInput] = useState(filters.sender || "");

  const handleSenderChange = (value: string) => {
    setSenderInput(value);
    // Apply filter on blur or Enter
  };

  const hasActiveFilters = filters.dateRange || filters.sender || filters.unread;

  return (
    <div className="mb-4 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          <Filter className="h-4 w-4" />
          <span>Filters:</span>
        </div>

        {/* Date Range Dropdown */}
        <select
          value={filters.dateRange || ""}
          onChange={(e) => setFilters({ dateRange: e.target.value || undefined })}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
        >
          <option value="">All Time</option>
          <option value="today">Today</option>
          <option value="last_week">Last Week</option>
          <option value="last_month">Last Month</option>
        </select>

        {/* Sender Search Input */}
        <input
          type="text"
          placeholder="Search by sender..."
          value={senderInput}
          onChange={(e) => handleSenderChange(e.target.value)}
          onBlur={() => setFilters({ sender: senderInput || undefined })}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setFilters({ sender: senderInput || undefined });
            }
          }}
          className="w-48 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:placeholder-zinc-500"
        />

        {/* Unread Checkbox */}
        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <input
            type="checkbox"
            checked={filters.unread || false}
            onChange={(e) => setFilters({ unread: e.target.checked || undefined })}
            className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-zinc-600"
          />
          <span>Unread only</span>
        </label>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="ml-auto flex items-center gap-1.5 rounded-md bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            <X className="h-4 w-4" />
            Clear
          </button>
        )}
      </div>
    </div>
  );
}