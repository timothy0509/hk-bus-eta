import { fetchEstJourneyTime } from "../src/journeyTime";
import type { RouteListEntry, StopList } from "../src/type";

const makeRoute = (stops: string[], co = "kmb") =>
  ({ stops: { [co]: stops } }) as unknown as RouteListEntry;

const makeStopList = (stops: string[]) =>
  Object.fromEntries(
    stops.map((s) => [s, { location: { lat: 22.3, lng: 114.1 } }]),
  ) as unknown as StopList;

const timesMock = (files: Record<string, unknown>, tdas: unknown = null) => {
  global.fetch = jest.fn((url: string, init?: RequestInit) => {
    if (String(url).includes("tdas-api")) {
      if (tdas === null) return Promise.reject(new Error("tdas down"));
      return Promise.resolve({ json: () => Promise.resolve(tdas) });
    }
    const path = Object.keys(files).find((k) => String(url).endsWith(k));
    if (path === undefined) {
      return Promise.resolve({ json: () => Promise.reject(new Error("404")) });
    }
    return Promise.resolve({ json: () => Promise.resolve(files[path]) });
  }) as unknown as typeof fetch;
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe("fetchEstJourneyTime validation", () => {
  it.each([
    ["startSeq negative", { startSeq: -1, endSeq: 1 }],
    ["endSeq past the last stop", { startSeq: 0, endSeq: 5 }],
    ["startSeq not before endSeq", { startSeq: 1, endSeq: 1 }],
  ])("rejects when %s", async (_, seqs) => {
    const stops = ["VA01", "VA02"];
    await expect(
      fetchEstJourneyTime({
        route: makeRoute(stops),
        stopList: makeStopList(stops),
        ...seqs,
      }),
    ).rejects.toThrow();
  });

  it("rejects non-vehicle transports", async () => {
    const stops = ["VB01", "VB02"];
    await expect(
      fetchEstJourneyTime({
        route: makeRoute(stops, "mtr"),
        stopList: makeStopList(stops),
        startSeq: 0,
        endSeq: 1,
      }),
    ).rejects.toThrow("Support vehicle transport only");
  });
});

describe("fetchEstJourneyTime TDAS fallback", () => {
  it("caps the TDAS speed at 70 km/h and adds the 10% margin", async () => {
    const stops = ["VC01", "VC02"];
    timesMock({}, { distM: 7000, jSpeed: "80公里/小時" });

    const jt = await fetchEstJourneyTime({
      route: makeRoute(stops),
      stopList: makeStopList(stops),
      startSeq: 0,
      endSeq: 1,
    });

    expect(jt).toBeCloseTo(6.6);
  });

  it("falls back to the TDAS eta text when speed is unparseable", async () => {
    const stops = ["VD01", "VD02"];
    timesMock({}, { eta: "01:30", jSpeed: "unknown" });

    const jt = await fetchEstJourneyTime({
      route: makeRoute(stops),
      stopList: makeStopList(stops),
      startSeq: 0,
      endSeq: 1,
    });

    expect(jt).toBeCloseTo(99);
  });

  it("assumes 4 minutes with margin when every source fails", async () => {
    const stops = ["VE01", "VE02"];
    timesMock({});

    const jt = await fetchEstJourneyTime({
      route: makeRoute(stops),
      stopList: makeStopList(stops),
      startSeq: 0,
      endSeq: 1,
    });

    expect(jt).toBeCloseTo(4.4);
  });
});
