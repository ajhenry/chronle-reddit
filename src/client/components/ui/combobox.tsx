import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from 'src/lib/utils';

export type ComboboxOption = {
  value: string;
  label: string;
};

export type ComboboxProps = {
  options: ComboboxOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  maxHeight?: number;
  filterFunction?: (option: ComboboxOption, query: string) => boolean;
};

const defaultFilterFunction = (option: ComboboxOption, query: string): boolean => {
  return option.label.toLowerCase().includes(query.toLowerCase());
};

export const Combobox: React.FC<ComboboxProps> = ({
  options,
  value = '',
  onValueChange,
  placeholder = 'Search...',
  disabled = false,
  className,
  maxHeight = 200,
  filterFunction = defaultFilterFunction,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const comboboxRef = useRef<HTMLDivElement>(null);

  // Filter options based on query
  const filteredOptions = options.filter((option) =>
    filterFunction(option, query)
  );

  // Reset focused index when filtered options change
  useEffect(() => {
    setFocusedIndex(-1);
  }, [filteredOptions.length, query]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (comboboxRef.current && !comboboxRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Reset query to current value when closing
        const selectedOption = options.find(opt => opt.value === value);
        setQuery(selectedOption?.label || '');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value, options]);

  // Update query when value changes externally
  useEffect(() => {
    const selectedOption = options.find(opt => opt.value === value);
    setQuery(selectedOption?.label || '');
  }, [value, options]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const selectOption = useCallback((option: ComboboxOption) => {
    onValueChange?.(option.value);
    setQuery(option.label);
    setIsOpen(false);
    setFocusedIndex(-1);
  }, [onValueChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
        return;
      }
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => 
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
          selectOption(filteredOptions[focusedIndex]);
        } else if (filteredOptions.length === 1) {
          // If there's only one option, select it
          selectOption(filteredOptions[0]);
        }
        break;
      
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        // Reset query to current value
        const selectedOption = options.find(opt => opt.value === value);
        setQuery(selectedOption?.label || '');
        inputRef.current?.blur();
        break;
      
      case 'Tab':
        // Allow tab to close the dropdown and move to next element
        setIsOpen(false);
        const currentSelectedOption = options.find(opt => opt.value === value);
        setQuery(currentSelectedOption?.label || '');
        break;
    }
  };

  // Scroll focused option into view
  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && listRef.current) {
      const focusedElement = listRef.current.children[focusedIndex] as HTMLElement;
      if (focusedElement) {
        focusedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [focusedIndex, isOpen]);

  return (
    <div ref={comboboxRef} className={cn('relative', className)}>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        className={cn(
          'flex h-12 w-full rounded-none border-2 border-input bg-background px-4 py-3 text-sm font-medium ring-offset-background',
          'placeholder:text-muted-foreground',
          'focus-visible:outline-4 focus-visible:outline-ring focus-visible:outline-offset-2 focus-visible:shadow-md',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'transition-all duration-200 hover:shadow-md hover:transform hover:-translate-x-0.5 hover:-translate-y-0.5',
          isOpen && 'shadow-md transform -translate-x-0.5 -translate-y-0.5'
        )}
        autoComplete="off"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-autocomplete="list"
      />
      
      {isOpen && filteredOptions.length > 0 && (
        <div
          ref={listRef}
          className={cn(
            'absolute top-full left-0 right-0 z-50 mt-1',
            'bg-background border-2 border-border rounded-none shadow-lg',
            'overflow-y-auto'
          )}
          style={{ maxHeight }}
          role="listbox"
        >
          {filteredOptions.map((option, index) => (
            <div
              key={option.value}
              className={cn(
                'w-full px-4 py-3 text-left text-foreground cursor-pointer',
                'transition-colors duration-150 border-b border-border last:border-b-0',
                index === focusedIndex 
                  ? 'bg-accent text-accent-foreground' 
                  : 'hover:bg-accent hover:text-accent-foreground'
              )}
              onClick={() => selectOption(option)}
              role="option"
              aria-selected={index === focusedIndex}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
      
      {isOpen && filteredOptions.length === 0 && query.trim() && (
        <div
          className={cn(
            'absolute top-full left-0 right-0 z-50 mt-1',
            'bg-background border-2 border-border rounded-none shadow-lg',
            'px-4 py-3 text-sm text-muted-foreground'
          )}
        >
          No options found
        </div>
      )}
    </div>
  );
};