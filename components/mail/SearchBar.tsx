"use client";

import { useMailStore } from "@/store/mailStore";
import { Search, X } from "lucide-react";
import { useState } from "react";

export default function SearchBar() {
  const { searchQuery, setSearchQuery } = useMailStore();
  const [input, setInput] = useState(searchQuery);

  const handleSearch = () => {
    setSearchQuery(input);
  };

  const handleClear = () => {
    setInput("");
    setSearchQuery("");
  };

  return (
    <div className="mb-4 flex gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          placeholder="Search emails by subject, sender, or content..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearch();
          }}
          className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-10 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
        {input && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <button
        onClick={handleSearch}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
      >
        Search
      </button>
    </div>
  );
}