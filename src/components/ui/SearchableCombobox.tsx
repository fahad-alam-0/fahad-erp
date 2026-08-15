import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, Plus, Loader2, X, AlertCircle } from 'lucide-react';

export interface ComboboxOption {
  id: string;
  name: string;
  subtitle?: string;
}

interface SearchableComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  required?: boolean;
  allowClear?: boolean;
  clearLabel?: string;
  onCreateNew?: (name: string) => Promise<{ id: string; name: string } | null>;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export const SearchableCombobox: React.FC<SearchableComboboxProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select option...',
  searchPlaceholder = 'Type to search or filter...',
  allowClear = false,
  clearLabel = 'None / Clear Selection',
  onCreateNew,
  disabled = false,
  className = '',
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((o) => o.id === value);

  // Filtered options based on search query
  const filteredOptions = options.filter((o) =>
    o.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const exactMatchExists = options.some(
    (o) => o.name.trim().toLowerCase() === searchQuery.trim().toLowerCase()
  );

  const showCreateOption =
    onCreateNew && searchQuery.trim().length > 0 && !exactMatchExists;

  // Handle clicking outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset highlight index when filter changes
  useEffect(() => {
    setHighlightedIndex(0);
    setCreateError(null);
  }, [searchQuery, isOpen]);

  // Focus search input when popover opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (optionId: string) => {
    onChange(optionId);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleCreate = async () => {
    if (!onCreateNew || !searchQuery.trim()) return;
    setCreateError(null);
    try {
      setIsCreating(true);
      const created = await onCreateNew(searchQuery.trim());
      if (created) {
        onChange(created.id);
        setIsOpen(false);
        setSearchQuery('');
      }
    } catch (err: any) {
      console.error('Error in combobox create:', err);
      setCreateError(err.message || 'Permission denied or failed to create item.');
    } finally {
      setIsCreating(false);
    }
  };

  // Keyboard Navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (e.key === 'Escape') {
      setIsOpen(false);
      return;
    }

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    const totalCount = filteredOptions.length + (showCreateOption ? 1 : 0) + (allowClear ? 1 : 0);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % Math.max(1, totalCount));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + totalCount) % Math.max(1, totalCount));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      let index = 0;
      if (allowClear) {
        if (highlightedIndex === 0) {
          handleSelect('');
          return;
        }
        index++;
      }

      const optIndex = highlightedIndex - index;
      if (optIndex >= 0 && optIndex < filteredOptions.length) {
        handleSelect(filteredOptions[optIndex].id);
      } else if (showCreateOption && optIndex === filteredOptions.length) {
        handleCreate();
      }
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`} id={id}>
      {/* Trigger Input / Button */}
      <div
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`w-full text-xs px-3 py-2 bg-background border border-input rounded-lg flex items-center justify-between cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring text-foreground ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/50'
        }`}
      >
        <span className={selectedOption ? 'font-medium text-foreground' : 'text-muted-foreground'}>
          {selectedOption ? selectedOption.name : placeholder}
        </span>

        <div className="flex items-center space-x-1.5 shrink-0 ml-1 text-muted-foreground">
          {allowClear && value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 rounded hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180 text-primary' : ''}`} />
        </div>
      </div>

      {/* Popover Dropdown List */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-card border border-border rounded-xl shadow-lg overflow-hidden animate-in fade-in duration-150 text-xs">
          {/* Search Input Bar */}
          <div className="p-2 border-b border-border bg-muted/30 relative">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3.5 top-3.5" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={searchPlaceholder}
              className="w-full text-xs pl-8 pr-3 py-1.5 bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {/* Creation Error Alert */}
          {createError && (
            <div className="p-2.5 text-[11px] bg-destructive/10 text-destructive border-b border-destructive/20 flex items-center gap-1.5 font-medium">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{createError}</span>
            </div>
          )}

          {/* Options Scrollable Container */}
          <div className="max-h-56 overflow-y-auto py-1">
            {/* Clear option if allowed */}
            {allowClear && (
              <div
                onClick={() => handleSelect('')}
                className={`px-3 py-2 cursor-pointer flex items-center justify-between transition-colors italic text-muted-foreground ${
                  highlightedIndex === 0 ? 'bg-muted text-foreground' : 'hover:bg-muted/50'
                }`}
              >
                <span>{clearLabel}</span>
                {!value && <Check className="w-3.5 h-3.5 text-primary" />}
              </div>
            )}

            {/* Existing Options */}
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, idx) => {
                const itemIndex = idx + (allowClear ? 1 : 0);
                const isSelected = opt.id === value;
                const isHighlighted = itemIndex === highlightedIndex;

                return (
                  <div
                    key={opt.id}
                    onClick={() => handleSelect(opt.id)}
                    onMouseEnter={() => setHighlightedIndex(itemIndex)}
                    className={`px-3 py-2 cursor-pointer flex items-center justify-between transition-colors ${
                      isHighlighted ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted/50 text-foreground'
                    }`}
                  >
                    <div>
                      <span className="font-semibold">{opt.name}</span>
                      {opt.subtitle && (
                        <span className="text-[10px] text-muted-foreground block font-mono">
                          {opt.subtitle}
                        </span>
                      )}
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                  </div>
                );
              })
            ) : !showCreateOption ? (
              <div className="p-4 text-center text-muted-foreground text-xs">
                No matching options found.
              </div>
            ) : null}

            {/* Inline Create Option */}
            {showCreateOption && (
              <div
                onClick={handleCreate}
                className="px-3 py-2.5 border-t border-border/60 bg-primary/5 hover:bg-primary/10 text-primary cursor-pointer font-bold flex items-center justify-between transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  {isCreating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  <span>Create "{searchQuery.trim()}"</span>
                </span>
                <span className="text-[10px] text-muted-foreground uppercase font-mono font-normal">
                  + Add New
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
