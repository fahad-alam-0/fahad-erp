import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { globalSearchService, GlobalSearchResultItem } from '@/services/search/globalSearchService';
import { useAuthStore } from '@/store/useAuthStore';
import { Search, X, Loader2, User, Package, ShoppingBag, Wrench, ArrowRight } from 'lucide-react';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user, role } = useAuthStore();
  const userRole = (role as 'OWNER' | 'TECHNICIAN' | 'STAFF') || 'STAFF';

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<GlobalSearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setDebouncedQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Debounce search query (250ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 250);
    return () => clearTimeout(handler);
  }, [query]);

  // Perform search
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const execSearch = async () => {
      try {
        setIsLoading(true);
        const data = await globalSearchService.search(debouncedQuery, userRole, user?.id);
        setResults(data);
        setSelectedIndex(0);
      } catch (err) {
        console.error('Global search error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    execSearch();
  }, [debouncedQuery, userRole, user?.id]);

  // Keyboard Navigation (ArrowUp, ArrowDown, Enter, Escape)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0));
      } else if (e.key === 'Enter') {
        if (results.length > 0 && results[selectedIndex]) {
          e.preventDefault();
          handleSelectResult(results[selectedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  if (!isOpen) return null;

  const handleSelectResult = (item: GlobalSearchResultItem) => {
    navigate(item.link);
    onClose();
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'CUSTOMER':
        return <User className="w-4 h-4 text-blue-500 shrink-0" />;
      case 'PRODUCT':
        return <Package className="w-4 h-4 text-purple-500 shrink-0" />;
      case 'SALE':
        return <ShoppingBag className="w-4 h-4 text-emerald-500 shrink-0" />;
      case 'REPAIR':
        return <Wrench className="w-4 h-4 text-amber-500 shrink-0" />;
      default:
        return <Search className="w-4 h-4 text-primary shrink-0" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Input Bar */}
        <div className="p-3.5 border-b border-border flex items-center gap-3 bg-muted/20">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search customers, products, sales, repair tickets..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm font-medium focus:outline-none placeholder:text-muted-foreground text-foreground"
          />
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
          ) : query ? (
            <button onClick={() => setQuery('')} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          ) : null}
        </div>

        {/* Results List */}
        <div className="p-2 overflow-y-auto flex-1 divide-y divide-border/50">
          {query.trim().length < 2 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Type at least 2 characters to search across ERP customers, catalog products, POS sales, and repair jobs.
            </div>
          ) : isLoading ? (
            <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
              <span>Searching database...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No matching records found for "{query}".
            </div>
          ) : (
            results.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={`${item.type}-${item.id}`}
                  onClick={() => handleSelectResult(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`p-3 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected ? 'bg-primary/10 border-l-2 border-primary' : 'hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center space-x-3 truncate">
                    <div className="p-2 rounded-lg bg-muted/60">
                      {getItemIcon(item.type)}
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-bold text-foreground truncate">{item.title}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{item.subtitle}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    {item.badge && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-muted text-muted-foreground">
                        {item.badge}
                      </span>
                    )}
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="p-2.5 bg-muted/30 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground px-4">
          <div className="flex items-center gap-3">
            <span><kbd className="font-mono bg-background px-1 rounded border border-border">↑</kbd> <kbd className="font-mono bg-background px-1 rounded border border-border">↓</kbd> Navigate</span>
            <span><kbd className="font-mono bg-background px-1 rounded border border-border">↵</kbd> Select</span>
            <span><kbd className="font-mono bg-background px-1 rounded border border-border">ESC</kbd> Close</span>
          </div>
          <span className="font-mono text-[10px]">Fahad ERP</span>
        </div>
      </div>
    </div>
  );
};
