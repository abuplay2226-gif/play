"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface Option {
  value: string;
  label: string;
  subLabel?: string;
  badge?: string;
}

interface SearchableSelectProps {
  id?: string;
  name?: string;
  options: Option[];
  value?: string;
  onChange?: (value: string) => void;
  onSelect?: (option: Option) => void; // دالة عند اختيار الصنف لنقل المؤشر للكمية
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  required?: boolean;
  allowCreate?: boolean;
  createLabel?: string;
  onCreateClick?: (searchQuery: string) => void;
}

export function SearchableSelect({
  id,
  name,
  options,
  value,
  onChange,
  onSelect,
  placeholder = "-- اختر من القائمة --",
  searchPlaceholder = "ابحث هنا...",
  emptyText = "لا توجد نتائج مطابقة",
  required = false,
  allowCreate = false,
  createLabel = "كعنصر جديد",
  onCreateClick,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [internalValue, setInternalValue] = useState<string>("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const currentValue = value !== undefined ? value : internalValue;

  const selectedOption = useMemo(() => {
    if (!currentValue) return null;
    const found = options.find((o) => o.value === currentValue);
    if (found) return found;

    if (currentValue.startsWith("NEW:")) {
      return {
        value: currentValue,
        label: currentValue.replace("NEW:", ""),
        badge: "جديد ✨",
      };
    }
    return null;
  }, [options, currentValue]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const filteredOptions = options.filter(
    (opt) =>
      opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (opt.subLabel && opt.subLabel.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const exactMatch = options.some(
    (opt) => opt.label.trim().toLowerCase() === searchQuery.trim().toLowerCase()
  );

  const handleSelect = (option: Option) => {
    if (onChange) {
      onChange(option.value);
    } else {
      setInternalValue(option.value);
    }
    setIsOpen(false);
    setSearchQuery("");
    if (onSelect) onSelect(option);
  };

  const handleCreateNew = () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;

    setIsOpen(false);
    setSearchQuery("");

    if (onCreateClick) {
      onCreateClick(trimmed);
      return;
    }

    const newOption: Option = {
      value: `NEW:${trimmed}`,
      label: trimmed,
      badge: "جديد ✨",
    };

    if (onChange) {
      onChange(newOption.value);
    } else {
      setInternalValue(newOption.value);
    }
    if (onSelect) onSelect(newOption);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {name && (
        <input type="hidden" name={name} value={currentValue} required={required} />
      )}

      {/* زر العرض مع ربط الـ id للتركيز عليه بالـ Enter */}
      <button
        id={id}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full rounded-2xl border px-4 py-3 text-right text-xs transition flex items-center justify-between outline-none ${
          isOpen
            ? "border-sky-400 bg-slate-900 text-white shadow-lg shadow-sky-500/10"
            : "border-slate-700 bg-slate-950 text-slate-200 hover:border-slate-600 focus:border-sky-400"
        }`}
      >
        <span className="truncate">
          {selectedOption ? (
            <span className="font-bold text-white flex items-center gap-2">
              <span>{selectedOption.label}</span>
              {selectedOption.badge && (
                <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-300 font-bold">
                  {selectedOption.badge}
                </span>
              )}
              {selectedOption.subLabel && (
                <span className="text-[11px] text-slate-400 font-normal">
                  ({selectedOption.subLabel})
                </span>
              )}
            </span>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </span>
        <span className="text-[10px] text-slate-400 mr-2">{isOpen ? "▲" : "▼"}</span>
      </button>

      {/* القائمة المنسدلة للبحث الحي */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full rounded-2xl border border-slate-700 bg-slate-900 p-2 shadow-2xl backdrop-blur-md animate-in fade-in duration-150">
          <div className="relative mb-2">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-sky-400"
            />
          </div>

          <div className="max-h-52 overflow-y-auto space-y-1 divide-y divide-slate-800/40">
            {allowCreate && searchQuery.trim() !== "" && !exactMatch && (
              <button
                type="button"
                onClick={handleCreateNew}
                className="w-full rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-3 py-2 text-right text-xs font-bold text-emerald-300 hover:bg-emerald-500/25 transition flex items-center justify-between mb-1"
              >
                <span>+ إضافة &quot;{searchQuery.trim()}&quot; {createLabel}</span>
                <span className="text-[10px] bg-emerald-500/20 px-1.5 py-0.5 rounded font-mono">
                  تعريف الصنف ✨
                </span>
              </button>
            )}

            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt)}
                  className={`w-full rounded-xl px-3 py-2 text-right text-xs transition flex items-center justify-between ${
                    currentValue === opt.value
                      ? "bg-sky-500/20 text-sky-300 font-bold"
                      : "text-slate-200 hover:bg-slate-800/80"
                  }`}
                >
                  <div className="truncate">
                    <p className="font-bold">{opt.label}</p>
                    {opt.subLabel && (
                      <p className="text-[10px] text-slate-400 truncate">{opt.subLabel}</p>
                    )}
                  </div>
                  {opt.badge && (
                    <span className="rounded-md bg-slate-800 px-1.5 py-0.5 text-[10px] text-emerald-400 font-mono">
                      {opt.badge}
                    </span>
                  )}
                </button>
              ))
            ) : !allowCreate || searchQuery.trim() === "" ? (
              <div className="p-3 text-center text-xs text-slate-500">{emptyText}</div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}