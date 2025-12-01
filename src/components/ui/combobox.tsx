"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ComboboxOption {
  value: number | string;
  label: string;
}

type ComboboxOptions = string[] | ComboboxOption[];

interface ComboboxProps {
  options: ComboboxOptions;
  value: string | number;
  onValueChangeAction: (value: string | number) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  disabled?: boolean;
  error?: null | string;
}

export function Combobox({
  options,
  value,
  onValueChangeAction,
  placeholder = "Select option...",
  searchPlaceholder = "Search...",
  emptyText = "No option found.",
  className,
  disabled = false,
  error = null,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");

  // Helper function to get option display text
  const getOptionText = (option: string | ComboboxOption): string => {
    return typeof option === "string" ? option : option.label;
  };

  // Helper function to get option value
  const getOptionValue = (option: string | ComboboxOption): number | string => {
    return typeof option === "string" ? Number(option) : option.value;
  };

  // Filter options based on search term
  const filteredOptions = options?.filter((option) =>
    getOptionText(option)?.toLowerCase()?.includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between",
              !value && "text-muted-foreground",
              className,
              error && "border-red-500"
            )}
            disabled={disabled}
          >
            {value
              ? (() => {
                  const selectedOption = options.find(
                    (option) => String(getOptionValue(option)) === String(value)
                  );
                  return selectedOption ? getOptionText(selectedOption) : value;
                })()
              : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <div className="p-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <div className="max-h-60 overflow-auto">
            {filteredOptions?.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">
                {emptyText}
              </div>
            ) : (
              <div className="p-1">
                {filteredOptions?.map((option, index) => (
                  <div
                    key={typeof option === "string" ? option : option.value}
                    className={cn(
                      "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                      String(value) === String(getOptionValue(option)) &&
                        "bg-accent"
                    )}
                    onClick={() => {
                      onValueChangeAction(getOptionValue(option));
                      setOpen(false);
                      setSearchTerm("");
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        String(value) === String(getOptionValue(option))
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    {getOptionText(option)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
      {error && <small className="text-red-500">{error[0]}</small>}
    </>
  );
}
