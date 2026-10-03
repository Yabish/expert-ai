// Resolves event definitions (data/events.json) to Gregorian date ranges.
// Hijri events use the Umm al-Qura calendar from Intl, so moving dates
// such as Ramadan are derived, never hard-coded (CLAUDE.md rule 14).
import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { addDays, eachDay, weekday } from './dates.js';

const base = { id: z.string().min(1), nameEn: z.string().min(1), nameAr: z.string().min(1) };
const month = z.number().int().min(1).max(12);
const duration = z.number().int().min(1).max(60);

export const EventDefinitionSchema = z.discriminatedUnion('kind', [
  z.object({ ...base, kind: z.literal('hijri-month'), month }),
  z.object({
    ...base,
    kind: z.literal('hijri-date'),
    month,
    day: z.number().int().min(1).max(30),
    durationDays: duration,
  }),
  z.object({
    ...base,
    kind: z.literal('gregorian-date'),
    month,
    day: z.number().int().min(1).max(31),
    durationDays: duration,
  }),
  z.object({
    ...base,
    kind: z.literal('last-weekday-of-month'),
    month,
    weekday: z.number().int().min(0).max(6),
    durationDays: duration,
  }),
]);
export type EventDefinition = z.infer<typeof EventDefinitionSchema>;

const EventFileSchema = z.object({
  version: z.literal(1),
  events: z.array(EventDefinitionSchema).min(1),
});

export interface EventOccurrence {
  id: string;
  nameEn: string;
  nameAr: string;
  /** Inclusive ISO dates. */
  start: string;
  end: string;
}

export function loadEventDefinitions(
  path = new URL('../data/events.json', import.meta.url),
): EventDefinition[] {
  return EventFileSchema.parse(JSON.parse(readFileSync(path, 'utf8'))).events;
}

const hijriFormat = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  timeZone: 'UTC',
});

export interface HijriDate {
  year: number;
  month: number;
  day: number;
}

export function toHijri(iso: string): HijriDate {
  const parts = hijriFormat.formatToParts(new Date(`${iso}T00:00:00Z`));
  const read = (type: 'year' | 'month' | 'day'): number =>
    Number(parts.find((part) => part.type === type)?.value);
  return { year: read('year'), month: read('month'), day: read('day') };
}

/** Occurrences that overlap [from, to], resolved for every year in range. */
export function resolveEvents(
  definitions: readonly EventDefinition[],
  from: string,
  to: string,
): EventOccurrence[] {
  // Scan a margin around the window so events that start just before it,
  // or overlap its edges, are still found.
  const days = eachDay(addDays(from, -60), addDays(to, 60));
  const occurrences: EventOccurrence[] = [];

  for (const definition of definitions) {
    const { id, nameEn, nameAr } = definition;
    const push = (start: string, durationDays: number): void => {
      occurrences.push({ id, nameEn, nameAr, start, end: addDays(start, durationDays - 1) });
    };

    switch (definition.kind) {
      case 'hijri-month': {
        let start: string | undefined;
        for (const day of days) {
          const inMonth = toHijri(day).month === definition.month;
          if (inMonth && start === undefined) start = day;
          if (!inMonth && start !== undefined) {
            occurrences.push({ id, nameEn, nameAr, start, end: addDays(day, -1) });
            start = undefined;
          }
        }
        break;
      }
      case 'hijri-date':
        for (const day of days) {
          const hijri = toHijri(day);
          if (hijri.month === definition.month && hijri.day === definition.day) {
            push(day, definition.durationDays);
          }
        }
        break;
      case 'gregorian-date':
        for (const day of days) {
          if (
            Number(day.slice(5, 7)) === definition.month &&
            Number(day.slice(8, 10)) === definition.day
          ) {
            push(day, definition.durationDays);
          }
        }
        break;
      case 'last-weekday-of-month':
        for (const day of days) {
          const sameMonth = Number(day.slice(5, 7)) === definition.month;
          const nextWeekLeavesMonth = Number(addDays(day, 7).slice(5, 7)) !== definition.month;
          if (sameMonth && nextWeekLeavesMonth && weekday(day) === definition.weekday) {
            push(day, definition.durationDays);
          }
        }
        break;
    }
  }

  return occurrences
    .filter((event) => event.end >= from && event.start <= to)
    .sort((a, b) =>
      a.start === b.start ? a.id.localeCompare(b.id) : a.start.localeCompare(b.start),
    );
}
