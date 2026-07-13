"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Command, ArrowRight, Store, Wrench, Settings, FileText, CheckCircle, User, Package, Database, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { apiGet } from "@/lib/api";
import { NAV_ITEMS } from "@/lib/navigation";

const STATIC_LINKS = NAV_ITEMS.map((item) => ({
  title: item.label,
  href: item.href,
  icon: item.icon,
}));

const ICONS_MAP: Record<string, any> = {
  project: Store,
  work_order: Wrench,
  user: User,
  inventory: Package,
};

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  
  const [dynamicResults, setDynamicResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard open/close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setDynamicResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Fetch dynamic results
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      setIsLoading(true);
      apiGet(`/search?q=${encodeURIComponent(debouncedQuery)}`)
        .then((res: any) => {
          if (res?.results) {
            setDynamicResults(res.results);
          } else {
            setDynamicResults([]);
          }
        })
        .catch(() => {
          setDynamicResults([]);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setDynamicResults([]);
    }
  }, [debouncedQuery]);

  // Compute total list
  const filteredLinks = STATIC_LINKS.filter(
    (l) => l.title.toLowerCase().includes(query.toLowerCase())
  );
  
  // Create a flattened array of all searchable items so keyboard navigation works easily
  const allItems = [
    ...filteredLinks.map((item) => ({ ...item, isStatic: true })),
    ...dynamicResults.map((item) => ({ ...item, isStatic: false }))
  ];

  // Reset index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, dynamicResults]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (allItems.length > 0) {
        setSelectedIndex((prev) => (prev + 1) % allItems.length);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (allItems.length > 0) {
        setSelectedIndex((prev) => (prev - 1 + allItems.length) % allItems.length);
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (allItems[selectedIndex]) {
        const item = allItems[selectedIndex];
        handleSelect(item.href || item.url);
      }
    }
  };

  const handleSelect = (href: string) => {
    setIsOpen(false);
    router.push(href);
  };

  return (
    <>
      {/* Trigger Button */}
      <div 
        onClick={() => setIsOpen(true)}
        className="relative w-full max-w-md transition-all duration-200 cursor-pointer group"
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
        <div className="w-full pl-9 pr-4 py-2 bg-slate-100/70 border border-transparent group-hover:bg-white group-hover:border-blue-200 group-hover:shadow-sm rounded-lg text-sm text-slate-500 transition-all flex items-center justify-between">
          <span>Sistemde ara...</span>
          <kbd className="hidden sm:inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-1.5 font-mono text-[10px] font-medium text-slate-500 opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>
      </div>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 px-4 sm:px-0">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsOpen(false)} />
          
          <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden ring-1 ring-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center border-b border-slate-100 px-4 py-3">
              <Search className="h-5 w-5 text-slate-400 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Proje, iş emri, malzeme, kullanıcı veya modül ara..."
                className="flex-1 bg-transparent border-none outline-none focus:ring-0 px-3 text-base text-slate-900 placeholder:text-slate-400"
              />
              {isLoading ? (
                 <Loader2 className="h-4 w-4 text-blue-500 animate-spin mr-3" />
              ) : null}
              <kbd className="hidden sm:inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-1.5 font-mono text-[10px] font-medium text-slate-500">
                ESC
              </kbd>
            </div>
            
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {allItems.length === 0 ? (
                <div className="py-14 text-center text-sm text-slate-500 flex flex-col items-center gap-2">
                  <Database className="h-8 w-8 text-slate-300" />
                  <span>Sonuç bulunamadı.</span>
                </div>
              ) : (
                <div className="space-y-4 py-2">
                  {filteredLinks.length > 0 && (
                    <div className="space-y-1">
                      <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Hızlı Erişim (Modüller)
                      </div>
                      {filteredLinks.map((link) => {
                        const idx = allItems.findIndex(i => i.isStatic && i.href === link.href);
                        const active = idx === selectedIndex;
                        const Icon = link.icon;
                        return (
                          <button
                            key={link.href}
                            onClick={() => handleSelect(link.href)}
                            onMouseEnter={() => setSelectedIndex(idx)}
                            className={cn(
                              "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-colors text-left",
                              active ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"
                            )}
                          >
                            <Icon className={cn("h-4 w-4 shrink-0", active ? "text-blue-600" : "text-slate-400")} />
                            <span className="flex-1 font-medium">{link.title}</span>
                            {active && <ArrowRight className="h-4 w-4 text-blue-500 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {dynamicResults.length > 0 && (
                    <div className="space-y-1">
                      <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                        <span>Veritabanı Sonuçları</span>
                        <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-[10px]">
                          {dynamicResults.length} Kayıt
                        </span>
                      </div>
                      {dynamicResults.map((item) => {
                        const idx = allItems.findIndex(i => !i.isStatic && i.id === item.id);
                        const active = idx === selectedIndex;
                        const Icon = ICONS_MAP[item.type] || Database;
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleSelect(item.url)}
                            onMouseEnter={() => setSelectedIndex(idx)}
                            className={cn(
                              "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-colors text-left",
                              active ? "bg-blue-50 border border-blue-100" : "hover:bg-slate-50 border border-transparent"
                            )}
                          >
                            <div className={cn(
                              "p-2 rounded-md shrink-0",
                              active ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"
                            )}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col flex-1 min-w-0">
                               <span className={cn(
                                 "font-medium truncate",
                                 active ? "text-blue-900" : "text-slate-900"
                               )}>
                                 {item.title}
                               </span>
                               <span className={cn(
                                 "text-xs truncate",
                                 active ? "text-blue-600" : "text-slate-500"
                               )}>
                                 {item.subtitle}
                               </span>
                            </div>
                            {active && <ArrowRight className="h-4 w-4 text-blue-500 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
