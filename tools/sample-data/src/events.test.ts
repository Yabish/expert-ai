import { describe, expect, it } from 'vitest';
import { loadEventDefinitions, resolveEvents, toHijri } from './events.js';

describe('toHijri (Umm al-Qura via Intl)', () => {
  it('maps known month starts', () => {
    expect(toHijri('2025-03-01')).toEqual({ year: 1446, month: 9, day: 1 });
    expect(toHijri('2026-02-18')).toEqual({ year: 1447, month: 9, day: 1 });
  });
});

describe('resolveEvents', () => {
  const events = resolveEvents(loadEventDefinitions(), '2024-10-01', '2026-09-30');
  const starts = (id: string): string[] => events.filter((e) => e.id === id).map((e) => e.start);

  it('finds both Ramadans in the default window, each 29 or 30 days long', () => {
    const ramadans = events.filter((e) => e.id === 'ramadan');
    expect(ramadans.map((r) => r.start)).toEqual(['2025-03-01', '2026-02-18']);
    for (const r of ramadans) {
      const length = (Date.parse(r.end) - Date.parse(r.start)) / 86_400_000 + 1;
      expect([29, 30]).toContain(length);
    }
  });

  it('starts Eid al-Fitr the day after Ramadan ends', () => {
    const ramadanEnds = events.filter((e) => e.id === 'ramadan').map((e) => e.end);
    const eidStarts = starts('eid-al-fitr');
    expect(eidStarts).toHaveLength(2);
    eidStarts.forEach((start, i) => {
      expect(Date.parse(start) - Date.parse(ramadanEnds[i] ?? '')).toBe(86_400_000);
    });
  });

  it('resolves White Friday to the last Friday of November', () => {
    expect(starts('white-friday')).toEqual(['2024-11-29', '2025-11-28']);
  });

  it('resolves fixed Gregorian events every year in range', () => {
    expect(starts('national-day')).toEqual(['2025-09-23', '2026-09-23']);
    expect(starts('founding-day')).toEqual(['2025-02-22', '2026-02-22']);
  });

  it('includes events that overlap the window edges and sorts by start', () => {
    const sorted = [...events].sort((a, b) => a.start.localeCompare(b.start));
    expect(events).toEqual(sorted);
    expect(events.every((e) => e.end >= '2024-10-01' && e.start <= '2026-09-30')).toBe(true);
  });
});
