import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';

export interface SearchOption {
  id: string;
  label: string;
  subLabel?: string;
  icon?: string | React.ReactNode;
  badge?: string;
}

export interface SearchableSelectProps {
  value: string;
  options: SearchOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  icon?: string | React.ReactNode;
  variant?: 'compact' | 'default';
  className?: string;
  title?: string;
  ariaLabel?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  options,
  onChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  icon,
  variant = 'default',
  className = '',
  title,
  ariaLabel,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Current selected option
  const selectedOption = useMemo(
    () => options.find((opt) => opt.id === value) || options[0],
    [options, value]
  );

  // Filtered options based on search query
  const filteredOptions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        opt.id.toLowerCase().includes(q) ||
        (opt.subLabel && opt.subLabel.toLowerCase().includes(q))
    );
  }, [options, searchQuery]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen]);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);

      // Reset highlighted index to selected option if present
      const selIdx = filteredOptions.findIndex((opt) => opt.id === value);
      setHighlightedIndex(selIdx >= 0 ? selIdx : 0);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Ensure highlighted index stays in bounds
  useEffect(() => {
    if (highlightedIndex >= filteredOptions.length) {
      setHighlightedIndex(Math.max(0, filteredOptions.length - 1));
    }
  }, [filteredOptions.length, highlightedIndex]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!isOpen || !listRef.current) return;
    const activeEl = listRef.current.querySelector<HTMLElement>(
      `[data-index="${highlightedIndex}"]`
    );
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = useCallback(
    (optionId: string) => {
      onChange(optionId);
      setIsOpen(false);
    },
    [onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredOptions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = filteredOptions[highlightedIndex];
      if (target) {
        handleSelect(target.id);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const currentDisplayLabel = selectedOption ? selectedOption.label : placeholder;
  const currentIcon = icon || selectedOption?.icon;

  return (
    <div
      ref={containerRef}
      className={`haru-searchable-select-wrap variant-${variant} ${isOpen ? 'is-open' : ''} ${className}`}
      onKeyDown={handleKeyDown}
      title={title}
    >
      {/* Trigger Button */}
      <button
        type="button"
        className={`haru-searchable-trigger ${variant === 'compact' ? 'compact-pill' : 'default-box'}`}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || title || placeholder}
      >
        {currentIcon && <span className="haru-searchable-trigger-icon">{currentIcon}</span>}
        <span className="haru-searchable-trigger-label">{currentDisplayLabel}</span>
        <span className="haru-searchable-trigger-caret">▾</span>
      </button>

      {/* Dropdown Card */}
      {isOpen && (
        <div
          className="haru-searchable-dropdown"
          role="listbox"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search Box Header */}
          <div className="haru-searchable-input-row">
            <span className="haru-searchable-search-icon">🔍</span>
            <input
              ref={inputRef}
              type="text"
              className="haru-searchable-input"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setHighlightedIndex(0);
              }}
              placeholder={searchPlaceholder}
              spellCheck={false}
              autoComplete="off"
            />
            {searchQuery && (
              <button
                type="button"
                className="haru-searchable-clear-btn"
                onClick={() => {
                  setSearchQuery('');
                  inputRef.current?.focus();
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Options List */}
          <div ref={listRef} className="haru-searchable-list">
            {filteredOptions.length === 0 ? (
              <div className="haru-searchable-empty">
                <span>No matches found</span>
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.id === value;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <div
                    key={opt.id}
                    data-index={idx}
                    role="option"
                    aria-selected={isSelected}
                    className={`haru-searchable-option ${isSelected ? 'is-selected' : ''} ${
                      isHighlighted ? 'is-highlighted' : ''
                    }`}
                    onClick={() => handleSelect(opt.id)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                  >
                    {opt.icon && (
                      <span className="haru-searchable-option-icon">{opt.icon}</span>
                    )}
                    <div className="haru-searchable-option-text">
                      <span className="haru-searchable-option-label">{opt.label}</span>
                      {opt.subLabel && (
                        <span className="haru-searchable-option-sub">{opt.subLabel}</span>
                      )}
                    </div>
                    {isSelected && (
                      <span className="haru-searchable-option-check">✓</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
