import fetchSunferry from "../src/sunferry";
import fetchHkkf from "../src/hkkf";
import fetchFortuneferry from "../src/fortuneferry";

const serviceDayMap = {
  daily: ["1", "1", "1", "1", "1", "1", "1"],
} as any;

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe("sunferry", () => {
  it("returns [] for intermediate stops", async () => {
    const etas = await fetchSunferry({
      route: "1",
      seq: 2,
      freq: null,
      holidays: [],
      serviceDayMap,
    });
    expect(etas).toEqual([]);
  });

  it("lists not-yet-departed sailings at the origin with a schedule remark", async () => {
    jest.useFakeTimers({ doNotFake: ["nextTick", "setImmediate"] });
    jest.setSystemTime(new Date("2026-09-14T00:00:00Z"));
    global.fetch = jest.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          generated_timestamp: "2026-09-14T08:00:00+08:00",
          data: [
            {
              routecode: "1",
              route_en: "Central - Cheung Chau",
              route_tc: "中環 - 長洲",
              route_sc: "",
              depart_time: "09:00",
              eta: null,
              rmk_en: "",
              rmk_tc: "",
              date_timestamp: "",
            },
          ],
        }),
    }) as unknown as typeof fetch;

    const etas = await fetchSunferry({
      route: "1",
      seq: 0,
      freq: null,
      holidays: [],
      serviceDayMap,
    });

    expect(etas).toHaveLength(1);
    expect(etas[0].dest).toEqual({ zh: "長洲", en: "Cheung Chau" });
    expect(etas[0].remark.en).toContain("Scheduled");
  });

  it("lists arrival times at the destination stop", async () => {
    jest.useFakeTimers({ doNotFake: ["nextTick", "setImmediate"] });
    jest.setSystemTime(new Date("2026-09-14T00:00:00Z"));
    global.fetch = jest.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          generated_timestamp: "2026-09-14T08:00:00+08:00",
          data: [
            {
              routecode: "1",
              route_en: "Central - Cheung Chau",
              route_tc: "中環 - 長洲",
              route_sc: "",
              depart_time: "08:00",
              eta: "08:50",
              rmk_en: "",
              rmk_tc: "",
              date_timestamp: "",
            },
          ],
        }),
    }) as unknown as typeof fetch;

    const etas = await fetchSunferry({
      route: "1",
      seq: 1,
      freq: null,
      holidays: [],
      serviceDayMap,
    });

    expect(etas).toHaveLength(1);
    expect(etas[0].eta).toContain("2026-09-14");
  });

  it("falls back to [] when the API fails and there is no timetable", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("down")) as unknown as typeof fetch;

    const etas = await fetchSunferry({
      route: "1",
      seq: 0,
      freq: null,
      holidays: [],
      serviceDayMap,
    });

    expect(etas).toEqual([]);
  });
});

describe("hkkf", () => {
  it("lists timetable sailings at the origin", async () => {
    jest.useFakeTimers({ doNotFake: ["nextTick", "setImmediate"] });
    // 07:30 HKT, 30 minutes before the 08:00 sailing
    jest.setSystemTime(new Date("2026-09-13T23:30:00Z"));
    const etas = await fetchHkkf({
      route: "HK",
      bound: "O" as any,
      freq: { daily: { "0800": ["a", "b"] } } as any,
      seq: 0,
      holidays: [],
      serviceDayMap,
    });

    expect(etas.length).toBeGreaterThan(0);
    expect(etas[0]).toMatchObject({ co: "hkkf" });
    expect(etas[0].remark).toEqual({ zh: "預定班次", en: "Scheduled" });
  });

  it("lists live ETAs at the destination stop", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({ data: [{ ETA: "2026-09-14T08:00:00+08:00" }] }),
    }) as unknown as typeof fetch;

    const etas = await fetchHkkf({
      route: "xx1",
      bound: "I" as any,
      freq: null,
      seq: 1,
      holidays: [],
      serviceDayMap,
    });

    expect(etas).toEqual([
      {
        eta: "2026-09-14T08:00:00+08:00",
        remark: { zh: "", en: "" },
        dest: { zh: "", en: "" },
        co: "hkkf",
      },
    ]);
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toContain("inbound");
  });

  it("returns [] for stops past the destination", async () => {
    const etas = await fetchHkkf({
      route: "HK",
      bound: "O" as any,
      freq: null,
      seq: 2,
      holidays: [],
      serviceDayMap,
    });
    expect(etas).toEqual([]);
  });
});

describe("fortuneferry", () => {
  it("lists timetable sailings at the origin", async () => {
    jest.useFakeTimers({ doNotFake: ["nextTick", "setImmediate"] });
    // 07:30 HKT, 30 minutes before the 08:00 sailing
    jest.setSystemTime(new Date("2026-09-13T23:30:00Z"));
    const etas = await fetchFortuneferry({
      stops: { fortuneferry: ["A", "B"] },
      seq: 0,
      stopList: {} as any,
      freq: { daily: { "0800": ["a", "b"] } } as any,
      holidays: [],
      serviceDayMap,
    });

    expect(etas.length).toBeGreaterThan(0);
    expect(etas[0].co).toBe("fortuneferry");
  });

  it("returns [] past the origin stop", async () => {
    const etas = await fetchFortuneferry({
      stops: { fortuneferry: ["A", "B"] },
      seq: 1,
      stopList: {} as any,
      freq: null,
      holidays: [],
      serviceDayMap,
    });
    expect(etas).toEqual([]);
  });
});
