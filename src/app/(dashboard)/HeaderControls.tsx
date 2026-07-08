"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Mail,
  MessageCircle,
  Users,
  FileCode,
  ArrowRight,
  Clock,
  Compass,
  Video,
  X
} from "lucide-react";

interface SearchResults {
  navigation: Array<{ label: string; href: string; desc: string }>;
  campaigns: Array<{ id: string; title: string; subtitle: string; tag: string; href: string }>;
  reminders: Array<{ id: string; title: string; subtitle: string; tag: string; href: string }>;
  templates: Array<{ id: string; title: string; subtitle: string; tag: string; href: string }>;
  subscribers: Array<{ id: string; title: string; subtitle: string; tag: string; href: string }>;
}

export default function HeaderControls() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);

  // Debounced search trigger
  useEffect(() => {
    if (query.trim().length < 2) {
      setSearchResults(null);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch (err) {
        console.error("Failed to fetch search results", err);
      } finally {
        setSearchLoading(false);
      }
    }, 250);
    return () => clearTimeout(delayDebounce);
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleResultClick = (href: string) => {
    setSearchOpen(false);
    setQuery("");
    router.push(href);
  };

  const clearSearch = () => {
    setQuery("");
    setSearchResults(null);
    setSearchOpen(false);
  };

  const getPageIcon = (href: string) => {
    switch (href) {
      case "/dashboard": return Compass;
      case "/subscribers": return Users;
      case "/campaigns": return Mail;
      case "/templates": return FileCode;
      case "/webinars": return Video;
      default: return Compass;
    }
  };

  return (
    <div className="flex items-center w-full sm:w-auto relative">
      {/* Search Container */}
      <div ref={searchRef} className="relative z-40 w-full sm:w-auto">

        {/* Search Input Pill */}
        <div className="relative flex items-center gap-2 bg-white rounded-full border border-slate-200/60 shadow-sm px-3.5 py-2 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-400/60 transition-all w-64">
          <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            placeholder="Search anything..."
            className="bg-transparent text-slate-800 text-[11px] font-semibold focus:outline-none flex-1 placeholder-slate-400 border-none p-0 min-w-0"
          />
          {query.length > 0 && (
            <button
              onClick={clearSearch}
              className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer shrink-0"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {searchOpen && (query.trim().length >= 2 || searchResults) && (
          <div className="absolute right-0 mt-2 w-[420px] bg-white border border-slate-200/50 shadow-2xl rounded-[28px] p-5 max-h-[80vh] overflow-y-auto z-50 animate-scale-up">
            {searchLoading && (
              <div className="py-8 flex items-center justify-center text-xs text-slate-400 font-bold gap-2">
                <Clock className="h-4 w-4 animate-spin text-slate-400" />
                Searching records...
              </div>
            )}

            {!searchLoading && (!searchResults || (
              searchResults.navigation.length === 0 &&
              searchResults.campaigns.length === 0 &&
              searchResults.reminders.length === 0 &&
              searchResults.templates.length === 0 &&
              searchResults.subscribers.length === 0
            )) && (
              <div className="py-8 text-center text-xs text-slate-400 font-bold">
                No matching results found
              </div>
            )}

            {searchResults && !searchLoading && (
              <div className="space-y-5">

                {/* Navigation */}
                {searchResults.navigation.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2 px-2">Navigation</h4>
                    <div className="space-y-1">
                      {searchResults.navigation.map((p, i) => {
                        const Icon = getPageIcon(p.href);
                        return (
                          <button
                            key={i}
                            onClick={() => handleResultClick(p.href)}
                            className="w-full text-left px-3 py-2.5 hover:bg-slate-55 hover:text-emerald-700 rounded-xl flex items-center justify-between group transition-all duration-200 cursor-pointer"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-500 flex items-center justify-center shrink-0 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                                <Icon className="h-4 w-4" />
                              </div>
                              <div>
                                <span className="text-xs font-bold text-slate-800 block group-hover:text-emerald-700">{p.label}</span>
                                <span className="text-[10px] text-slate-400 font-medium block mt-0.5">{p.desc}</span>
                              </div>
                            </div>
                            <span className="text-[9px] font-bold bg-slate-100 text-slate-500 rounded-full px-2 py-0.5 group-hover:bg-emerald-100 group-hover:text-emerald-700 transition-colors select-none">
                              Page
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Campaigns */}
                {searchResults.campaigns.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2 px-2">Campaigns</h4>
                    <div className="space-y-1">
                      {searchResults.campaigns.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => handleResultClick(c.href)}
                          className="w-full text-left px-3 py-2.5 hover:bg-slate-50 rounded-xl flex items-center justify-between group transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                              <Mail className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-bold text-slate-800 truncate">{c.title}</span>
                                <span className="text-[10px] text-slate-400 font-semibold shrink-0">• {c.tag}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-medium block truncate mt-0.5">{c.subtitle}</span>
                            </div>
                          </div>
                          <ArrowRight className="h-3.5 w-3.5 text-slate-350 opacity-0 group-hover:opacity-100 transition-all shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reminders */}
                {searchResults.reminders.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2 px-2">Reminders</h4>
                    <div className="space-y-1">
                      {searchResults.reminders.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => handleResultClick(r.href)}
                          className="w-full text-left px-3 py-2.5 hover:bg-slate-50 rounded-xl flex items-center justify-between group transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                              <Video className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-bold text-slate-800 truncate">{r.title}</span>
                                <span className="text-[10px] text-slate-400 font-semibold shrink-0">• {r.tag}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-medium block truncate mt-0.5">{r.subtitle}</span>
                            </div>
                          </div>
                          <ArrowRight className="h-3.5 w-3.5 text-slate-350 opacity-0 group-hover:opacity-100 transition-all shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Templates */}
                {searchResults.templates.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2 px-2">Templates</h4>
                    <div className="space-y-1">
                      {searchResults.templates.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => handleResultClick(t.href)}
                          className="w-full text-left px-3 py-2.5 hover:bg-slate-50 rounded-xl flex items-center justify-between group transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                              <FileCode className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-bold text-slate-800 truncate">{t.title}</span>
                                <span className="text-[10px] text-teal-600 font-bold shrink-0">• {t.tag}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-medium block truncate mt-0.5">{t.subtitle}</span>
                            </div>
                          </div>
                          <ArrowRight className="h-3.5 w-3.5 text-slate-350 opacity-0 group-hover:opacity-100 transition-all shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Subscribers */}
                {searchResults.subscribers.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2 px-2">Subscribers</h4>
                    <div className="space-y-1">
                      {searchResults.subscribers.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => handleResultClick(s.href)}
                          className="w-full text-left px-3 py-2.5 hover:bg-slate-50 rounded-xl flex items-center justify-between group transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                              <Users className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-bold text-slate-800 truncate">{s.title}</span>
                                <span className="text-[10px] text-slate-400 font-semibold shrink-0">• {s.tag}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-medium block truncate mt-0.5">{s.subtitle}</span>
                            </div>
                          </div>
                          <ArrowRight className="h-3.5 w-3.5 text-slate-350 opacity-0 group-hover:opacity-100 transition-all shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

