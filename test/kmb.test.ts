import fetchKmb from "../src/kmb";

const eta = (overrides = {}) => ({
  eta: "2026-09-14T08:00:00+08:00",
  rmk_tc: "tc",
  rmk_en: "en",
  dest_tc: "目的地",
  dest_en: "Dest",
  ...overrides,
});

const mockFetch = (data: unknown[]) => {
  global.fetch = jest.fn().mockResolvedValue({
    json: () => Promise.resolve({ data }),
  }) as unknown as typeof fetch;
};

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("kmb", () => {
  it("filters by bound, picks the nearest seq group, and maps fields", async () => {
    mockFetch([
      eta({ dir: "O", seq: 2, service_type: "1" }),
      eta({ dir: "I", seq: 2, service_type: "1" }),
      eta({ dir: "O", seq: 5, service_type: "1" }),
    ]);

    const etas = await fetchKmb({
      stopId: "S1",
      route: "1",
      seq: 1,
      serviceType: "1",
      stops: ["S0", "S1", "S2"],
      co: ["kmb"],
      bound: "O",
    });

    expect(etas).toHaveLength(1);
    expect(etas[0]).toEqual({
      eta: "2026-09-14T08:00:00+08:00",
      remark: { zh: "tc", en: "en" },
      dest: { zh: "目的地", en: "Dest" },
      co: "kmb",
    });
  });

  it("skips the exact seq check when multiple companies serve the stop", async () => {
    mockFetch([eta({ dir: "O", seq: 9, service_type: "2" })]);

    const etas = await fetchKmb({
      stopId: "S0",
      route: "1",
      seq: 0,
      serviceType: "1",
      stops: ["S0", "S1"],
      co: ["kmb", "ctb"],
      bound: "O",
    });

    expect(etas).toHaveLength(1);
  });

  it("enforces exact seq for single-company matching service types", async () => {
    mockFetch([eta({ dir: "O", seq: 9, service_type: "1" })]);

    const etas = await fetchKmb({
      stopId: "S1",
      route: "1",
      seq: 0,
      serviceType: "1",
      stops: ["S1"],
      co: ["kmb"],
      bound: "O",
    });

    expect(etas).toHaveLength(0);
  });

  it("restricts circular routes boarded at the first stop to that stop", async () => {
    mockFetch([
      eta({ dir: "O", seq: 1, service_type: "1" }),
      eta({ dir: "O", seq: 3, service_type: "1" }),
    ]);

    const etas = await fetchKmb({
      stopId: "S",
      route: "1",
      seq: 0,
      serviceType: "1",
      stops: ["S", "T", "S"],
      co: ["kmb", "ctb"],
      bound: "O",
    });

    expect(etas).toHaveLength(1);
  });

  it("returns [] when the request fails", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("down")) as unknown as typeof fetch;

    const etas = await fetchKmb({
      stopId: "S1",
      route: "1",
      seq: 0,
      serviceType: "1",
      stops: ["S1"],
      co: ["kmb"],
      bound: "O",
    });

    expect(etas).toEqual([]);
  });
});
