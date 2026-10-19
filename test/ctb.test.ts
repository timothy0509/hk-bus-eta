import fetchCtb from "../src/ctb";

const eta = (overrides = {}) => ({
  eta: "2026-09-14T08:00:00+08:00",
  rmk_tc: "tc",
  rmk_en: "en",
  dest_tc: "目的地",
  dest_en: "Dest",
  ...overrides,
});

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("ctb", () => {
  it("keeps dirs contained in bound and picks the nearest seq", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          data: [
            eta({ dir: "O", seq: 2 }),
            eta({ dir: "I", seq: 2 }),
            eta({ dir: "O", seq: 9 }),
          ],
        }),
    }) as unknown as typeof fetch;

    const etas = await fetchCtb({
      stopId: "C1",
      route: "10",
      bound: "O",
      seq: 1,
    });

    expect(etas).toHaveLength(1);
    expect(etas[0]).toMatchObject({ co: "ctb", eta: "2026-09-14T08:00:00+08:00" });
  });

  it("matches both directions for a two-way bound", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          data: [eta({ dir: "I", seq: 1 })],
        }),
    }) as unknown as typeof fetch;

    const etas = await fetchCtb({
      stopId: "C1",
      route: "10",
      bound: "OI",
      seq: 0,
    });

    expect(etas).toHaveLength(1);
  });

  it("returns [] when the request fails", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("down")) as unknown as typeof fetch;

    const etas = await fetchCtb({
      stopId: "C1",
      route: "10",
      bound: "O",
      seq: 0,
    });

    expect(etas).toEqual([]);
  });
});
