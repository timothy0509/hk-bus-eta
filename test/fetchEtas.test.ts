import { fetchEtas, fetchEtaDb, fetchRouteUpdatedAt } from "../src";

const routeBase = (overrides = {}) => ({
  route: "1",
  co: ["kmb", "ctb"],
  orig: { en: "A", zh: "A" },
  dest: { en: "B", zh: "B" },
  fares: null,
  faresHoliday: null,
  freq: null,
  jt: null,
  seq: 0,
  serviceType: "1",
  stops: { kmb: ["S1"], ctb: ["C1"] },
  bound: { kmb: "O", ctb: "O" },
  gtfsId: "",
  nlbId: "",
  ...overrides,
});

const kmbPayload = (data: unknown[]) => ({
  json: () => Promise.resolve({ data }),
});

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("fetchEtas", () => {
  it("merges company results, drops empty etas when live ones exist, and sorts", async () => {
    global.fetch = jest.fn((url: string) => {
      if (String(url).includes("etabus")) {
        return Promise.resolve(
          kmbPayload([
            {
              dir: "O",
              seq: 1,
              service_type: "1",
              eta: "2026-09-14T09:00:00+08:00",
              rmk_tc: "",
              rmk_en: "",
              dest_tc: "B",
              dest_en: "B",
            },
          ]),
        );
      }
      return Promise.resolve({
        json: () =>
          Promise.resolve({
            data: [
              {
                dir: "O",
                seq: 1,
                eta: "2026-09-14T08:00:00+08:00",
                rmk_tc: "",
                rmk_en: "",
                dest_tc: "B",
                dest_en: "B",
              },
              {
                dir: "O",
                seq: 1,
                eta: "",
                rmk_tc: "尾班",
                rmk_en: "Last",
                dest_tc: "B",
                dest_en: "B",
              },
            ],
          }),
      });
    }) as unknown as typeof fetch;

    const etas = await fetchEtas({ ...routeBase(), seq: 0, language: "en" } as any);

    expect(etas.map((e) => e.eta)).toEqual([
      "2026-09-14T08:00:00+08:00",
      "2026-09-14T09:00:00+08:00",
    ]);
  });

  it("keeps empty-eta remarks when nothing has a live time", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          data: [
            {
              dir: "O",
              seq: 1,
              eta: "",
              rmk_tc: "尾班",
              rmk_en: "Last",
              dest_tc: "B",
              dest_en: "B",
            },
          ],
        }),
    }) as unknown as typeof fetch;

    const etas = await fetchEtas({
      ...routeBase({ co: ["ctb"] }),
      seq: 0,
      language: "en",
    } as any);

    expect(etas).toHaveLength(1);
    expect(etas[0].eta).toBe("");
  });

  it("tolerates one company failing", async () => {
    global.fetch = jest.fn((url: string) => {
      if (String(url).includes("etabus")) {
        return Promise.reject(new Error("down"));
      }
      return Promise.resolve({
        json: () =>
          Promise.resolve({
            data: [
              {
                dir: "O",
                seq: 1,
                eta: "2026-09-14T08:00:00+08:00",
                rmk_tc: "",
                rmk_en: "",
                dest_tc: "B",
                dest_en: "B",
              },
            ],
          }),
      });
    }) as unknown as typeof fetch;

    const etas = await fetchEtas({ ...routeBase(), seq: 0, language: "en" } as any);

    expect(etas).toHaveLength(1);
    expect(etas[0].co).toBe("ctb");
  });

  it("returns [] for unknown companies without calling fetch", async () => {
    global.fetch = jest.fn() as unknown as typeof fetch;

    const etas = await fetchEtas({
      ...routeBase({ co: ["unknown" as never] }),
      seq: 0,
      language: "en",
    } as any);

    expect(etas).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns [] when a required stopList is missing instead of throwing", async () => {
    const etas = await fetchEtas({
      ...routeBase({ co: ["mtr"], stops: { mtr: ["M1"] }, bound: { mtr: "OUTBOUND" } }),
      seq: 0,
      language: "en",
    } as any);

    expect(etas).toEqual([]);
  });
});

describe("fetchEtaDb / fetchRouteUpdatedAt", () => {
  it("falls back to the mirror host when the primary DB fetch fails", async () => {
    const db = { holidays: [], routeList: {}, stopList: {}, stopMap: {} };
    global.fetch = jest
      .fn()
      .mockRejectedValueOnce(new Error("down"))
      .mockResolvedValueOnce({ json: () => Promise.resolve(db) }) as unknown as typeof fetch;

    await expect(fetchEtaDb()).resolves.toEqual(db);
    expect((global.fetch as jest.Mock).mock.calls[1][0]).toContain("hkbus.github.io");
  });

  it("parses the route timestamp and returns 0 when missing", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("1728873600"),
    }) as unknown as typeof fetch;

    await expect(
      fetchRouteUpdatedAt({ route: "1", serviceType: "1", orig: { en: "A" }, dest: { en: "B" } } as any),
    ).resolves.toBe(1728873600 * 1000);

    global.fetch = jest.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;

    await expect(
      fetchRouteUpdatedAt({ route: "1", serviceType: "1", orig: { en: "A" }, dest: { en: "B" } } as any),
    ).resolves.toBe(0);
  });
});
