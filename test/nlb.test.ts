import fetchNlb from "../src/nlb";

afterEach(() => {
  jest.restoreAllMocks();
});

const arrival = (overrides = {}) => ({
  estimatedArrivalTime: "2026-09-14 08:00:00",
  departed: "0",
  noGPS: "0",
  routeVariantName: "Variant",
  ...overrides,
});

describe("nlb", () => {
  it("formats arrival times and marks live buses without a schedule remark", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({ estimatedArrivals: [arrival({ departed: "1", noGPS: "0" })] }),
    }) as unknown as typeof fetch;

    const etas = await fetchNlb({ stopId: "S1", nlbId: "1", language: "en" });

    expect(etas).toEqual([
      {
        eta: "2026-09-14T08:00:00.000+08:00",
        remark: { zh: "", en: "" },
        dest: { zh: "", en: "Variant" },
        co: "nlb",
      },
    ]);
  });

  it("marks scheduled departures and localises the variant name", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({ estimatedArrivals: [arrival({ departed: "0" })] }),
    }) as unknown as typeof fetch;

    const etas = await fetchNlb({ stopId: "S1", nlbId: "1", language: "zh" });

    expect(etas[0].remark).toEqual({ zh: "預定班次", en: "Scheduled" });
    expect(etas[0].dest).toEqual({ zh: "Variant", en: "" });
  });

  it("drops arrivals without a time", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          estimatedArrivals: [arrival({ estimatedArrivalTime: "" })],
        }),
    }) as unknown as typeof fetch;

    const etas = await fetchNlb({ stopId: "S1", nlbId: "1", language: "en" });

    expect(etas).toEqual([]);
  });

  it("surfaces the API message in the requested language when empty", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({ estimatedArrivals: [], message: "No service" }),
    }) as unknown as typeof fetch;

    const en = await fetchNlb({ stopId: "S1", nlbId: "1", language: "en" });
    expect(en).toEqual([
      {
        eta: "",
        remark: { zh: "", en: "No service" },
        dest: { zh: "", en: "" },
        co: "nlb",
      },
    ]);

    global.fetch = jest.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({ estimatedArrivals: [], message: "沒有服務" }),
    }) as unknown as typeof fetch;

    const zh = await fetchNlb({ stopId: "S1", nlbId: "1", language: "zh" });
    expect(zh[0].remark).toEqual({ zh: "沒有服務", en: "" });
  });
});
