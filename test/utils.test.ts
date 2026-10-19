import { getUpcomingFerry } from "../src/utils";

const allOpen = {
  daily: ["0", "1", "1", "1", "1", "1", "0"],
} as any;
const sundayOnly = {
  sunday: ["1", "0", "0", "0", "0", "0", "0"],
} as any;

describe("getUpcomingFerry", () => {
  it("returns [] for null freq", () => {
    expect(
      getUpcomingFerry({
        holidays: [],
        serviceDayMap: {},
        freq: null,
        date: new Date("2026-09-14T00:00:00Z"),
      }),
    ).toEqual([]);
  });

  it("lists the next departures for the matching service day", () => {
    const ret = getUpcomingFerry({
      holidays: [],
      serviceDayMap: allOpen,
      freq: { daily: { "0800": ["a", "b"], "0900": ["a", "b"] } },
      // Monday 08:00 HKT
      date: new Date("2026-09-14T00:00:00Z"),
    });

    expect(ret).toContain("2026-09-14T08:00:00.000+08:00");
    expect(ret).toContain("2026-09-14T09:00:00.000+08:00");
    expect([...ret].sort((a, b) => (a < b ? -1 : 1))).toEqual(ret);
    expect(new Set(ret).size).toBe(ret.length);
  });

  it("uses the holiday timetable on public holidays", () => {
    const ret = getUpcomingFerry({
      holidays: ["20261001"],
      serviceDayMap: {
        holiday: ["1", "0", "0", "0", "0", "0", "0"],
        weekday: ["0", "1", "1", "1", "1", "1", "0"],
      } as any,
      freq: {
        holiday: { "0900": ["a", "b"] },
        weekday: { "0800": ["a", "b"] },
      },
      // 2026-10-01 00:00 HKT
      date: new Date("2026-09-30T16:00:00Z"),
    });

    expect(ret).toContain("2026-10-01T09:00:00.000+08:00");
  });

  it("uses the Sunday timetable on Sundays", () => {
    const ret = getUpcomingFerry({
      holidays: [],
      serviceDayMap: sundayOnly,
      freq: { sunday: { "1000": ["a", "b"] } },
      // Sunday 08:00 HKT
      date: new Date("2026-09-12T00:00:00Z"),
    });

    expect(ret).toContain("2026-09-13T10:00:00.000+08:00");
  });

  it("returns [] when the freq object has no entries", () => {
    const ret = getUpcomingFerry({
      holidays: [],
      serviceDayMap: { none: ["0", "0", "0", "0", "0", "0", "0"] } as any,
      freq: {},
      date: new Date("2026-09-14T00:00:00Z"),
    });

    expect(ret).toEqual([]);
  });
});
