import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  DEFAULT_FILTERS,
  EVENT_TYPE_LABELS,
  FORMAT_LABELS,
  activeFilterCount,
  type EventFormat,
  type EventType,
  type Filters,
  type SortKey,
} from "@/lib/events";

const TYPES = Object.keys(EVENT_TYPE_LABELS) as EventType[];
const FORMATS = Object.keys(FORMAT_LABELS) as EventFormat[];

const DATE_RANGES: { label: string; value: string; days: number | null }[] = [
  { label: "Any time", value: "any", days: null },
  { label: "Next 7 days", value: "7", days: 7 },
  { label: "Next 30 days", value: "30", days: 30 },
  { label: "Next 90 days", value: "90", days: 90 },
];

export function EventFilters({
  filters,
  onChange,
  resultCount,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
  resultCount: number;
}) {
  const active = activeFilterCount(filters);

  const toggle = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

  return (
    <section
      aria-label="Filter and sort events"
      className="rounded-3xl border border-border bg-card/70 p-4 shadow-warm"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 text-sm font-semibold">
          <SlidersHorizontal className="size-4 text-primary" />
          Narrow it down
        </span>
        {active > 0 && (
          <Badge variant="default" className="rounded-full">
            {active} active
          </Badge>
        )}
        <span className="text-xs text-muted-foreground">
          {resultCount} {resultCount === 1 ? "event" : "events"}
        </span>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Select
            value={filters.sort}
            onValueChange={(value) => onChange({ ...filters, sort: value as SortKey })}
          >
            <SelectTrigger className="w-[190px] bg-background" aria-label="Sort events">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">Sort: best for you</SelectItem>
              <SelectItem value="date">Sort: soonest first</SelectItem>
              <SelectItem value="proximity">Sort: closest to you</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.withinDays == null ? "any" : String(filters.withinDays)}
            onValueChange={(value) =>
              onChange({
                ...filters,
                withinDays: DATE_RANGES.find((range) => range.value === value)?.days ?? null,
              })
            }
          >
            <SelectTrigger className="w-[150px] bg-background" aria-label="Date range">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGES.map((range) => (
                <SelectItem key={range.value} value={range.value}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.cost}
            onValueChange={(value) =>
              onChange({ ...filters, cost: value as Filters["cost"] })
            }
          >
            <SelectTrigger className="w-[130px] bg-background" aria-label="Cost">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Free or paid</SelectItem>
              <SelectItem value="free">Free only</SelectItem>
              <SelectItem value="paid">Paid only</SelectItem>
            </SelectContent>
          </Select>

          {active > 0 && (
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => onChange(DEFAULT_FILTERS)}>
              <X className="size-3.5" />
              Clear all
            </Button>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {TYPES.map((type) => {
          const on = filters.types.includes(type);
          return (
            <button
              key={type}
              type="button"
              aria-pressed={on}
              onClick={() => onChange({ ...filters, types: toggle(filters.types, type) })}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                on
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-secondary",
              )}
            >
              {EVENT_TYPE_LABELS[type]}
            </button>
          );
        })}
        <span aria-hidden="true" className="mx-1 hidden w-px bg-border sm:block" />
        {FORMATS.map((format) => {
          const on = filters.formats.includes(format);
          return (
            <button
              key={format}
              type="button"
              aria-pressed={on}
              onClick={() => onChange({ ...filters, formats: toggle(filters.formats, format) })}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                on
                  ? "border-plum bg-plum text-plum-foreground"
                  : "border-border bg-background hover:bg-secondary",
              )}
            >
              {FORMAT_LABELS[format]}
            </button>
          );
        })}
      </div>
    </section>
  );
}
