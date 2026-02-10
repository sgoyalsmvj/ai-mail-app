"use client";

import { useMailStore } from "@/store/mailStore";
import { X, Filter, Calendar, Search } from "lucide-react";
import { useState, useEffect } from "react";

export default function FilterBar() {
  const { filters, setFilters, clearFilters, searchQuery } = useMailStore();
  const [senderInput, setSenderInput] = useState(filters.sender || "");
  const [showCustomDate, setShowCustomDate] = useState(
    Boolean(filters.dateFrom || filters.dateTo),
  );

  // Update showCustomDate when filters change externally (e.g., from AI)
  useEffect(() => {
    if (filters.dateFrom || filters.dateTo) {
      setShowCustomDate(true);
    }
  }, [filters.dateFrom, filters.dateTo]);

  // Sync sender input when filters are cleared
  useEffect(() => {
    setSenderInput(filters.sender || "");
  }, [filters.sender]);

  const handleSenderChange = (value: string) => {
    setSenderInput(value);
  };

  const handleDateRangeChange = (value: string) => {
    if (value === "custom") {
      setShowCustomDate(true);
      setFilters({ dateRange: undefined }); // Clear preset when custom selected
    } else {
      setShowCustomDate(false);
      setFilters({
        dateRange: value || undefined,
        dateFrom: undefined,
        dateTo: undefined,
      });
    }
  };

  const hasActiveFilters =
    filters.dateRange ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.sender ||
    filters.unread ||
    searchQuery;

  return (
    <div className="mb-4 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          <Filter className="h-4 w-4" />
          <span>Filters:</span>
        </div>

        {/* Date Range Dropdown */}
        <select
          value={showCustomDate ? "custom" : filters.dateRange || ""}
          onChange={(e) => handleDateRangeChange(e.target.value)}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
        >
          <option value="">All Time</option>
          <option value="today">Today</option>
          <option value="last_week">Last 7 Days</option>
          <option value="last_month">Last 30 Days</option>
          <option value="custom">Custom Range...</option>
        </select>

        {/* Custom Date Range Pickers */}
        {showCustomDate && (
          <>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
              <input
                type="date"
                value={filters.dateFrom || ""}
                onChange={(e) =>
                  setFilters({ dateFrom: e.target.value || undefined })
                }
                max={filters.dateTo || new Date().toISOString().split("T")[0]}
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              />
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                to
              </span>
              <input
                type="date"
                value={filters.dateTo || ""}
                onChange={(e) =>
                  setFilters({ dateTo: e.target.value || undefined })
                }
                min={filters.dateFrom || undefined}
                max={new Date().toISOString().split("T")[0]}
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              />
            </div>
          </>
        )}

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
            onChange={(e) =>
              setFilters({ unread: e.target.checked || undefined })
            }
            className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-zinc-600"
          />
          <span>Unread only</span>
        </label>

        {/* Active Search Query Badge */}
        {searchQuery && (
          <div className="flex items-center gap-1.5 rounded-md bg-blue-100 px-3 py-1.5 text-sm text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            <Search className="h-3.5 w-3.5" />
            <span className="max-w-50 truncate">{searchQuery}</span>
          </div>
        )}

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="ml-auto flex items-center gap-1.5 rounded-md bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            <X className="h-4 w-4" />
            Clear Filters
          </button>
        )}
      </div>
    </div>
  );
}
