import React, { useRef } from 'react';
import { Search, X } from 'lucide-react';
import { isMasterAdminPin } from '../config/adminConfig';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  placeholder?: string;
  onSecretAdminTrigger?: () => void;
  onOpenVoiceModal?: () => void;
  onOpenParchiModal?: () => void;
  onOpenDigitalParchiModal?: () => void;
  className?: string;
}

const DEFAULT_PLACEHOLDER = 'यहाँ सामान लिखें या कीबोर्ड के माइक से बोलें...';

export const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  onSearchChange,
  placeholder,
  onSecretAdminTrigger,
  className = '',
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={`w-full relative ${className}`}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (isMasterAdminPin(searchQuery)) {
            onSearchChange('');
            searchInputRef.current?.blur();
            onSecretAdminTrigger?.();
            return;
          }
        }}
        className="relative flex items-center"
      >
        {/* Left Search Icon */}
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Search className="w-4 h-4 text-stone-400" />
        </div>

        {/* Clean Input Box */}
        <input
          id="search-input"
          ref={searchInputRef}
          type="search"
          value={searchQuery}
          onChange={(e) => {
            const val = e.target.value;
            if (isMasterAdminPin(val)) {
              onSearchChange('');
              searchInputRef.current?.blur();
              onSecretAdminTrigger?.();
              return;
            }
            onSearchChange(val);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (isMasterAdminPin(searchQuery)) {
                e.preventDefault();
                onSearchChange('');
                searchInputRef.current?.blur();
                onSecretAdminTrigger?.();
                return;
              }
            }
          }}
          placeholder={placeholder || DEFAULT_PLACEHOLDER}
          className="w-full pl-10 pr-10 py-2.5 bg-stone-50/90 hover:bg-white focus:bg-white text-stone-900 placeholder:text-stone-400 text-xs sm:text-sm rounded-2xl border border-stone-200 focus:ring-2 focus:ring-[#0c831f]/20 focus:border-[#0c831f] transition-all shadow-2xs font-medium focus:outline-hidden"
        />

        {/* Clear Button */}
        {searchQuery ? (
          <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center">
            <button
              type="button"
              onClick={() => {
                onSearchChange('');
                searchInputRef.current?.focus();
              }}
              className="p-1 text-stone-400 hover:text-stone-600 cursor-pointer"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : null}
      </form>
    </div>
  );
};
