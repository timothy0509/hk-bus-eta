import fetchMtr from "../src/mtr";

const stopList = {
  KOW: { location: { lat: 22.3, lng: 114.1 }, name: { en: "Kowloon", zh: "九龍" } },
} as any;

afterEach(() => {
  jest.restoreAllMocks();
});

describe("mtr", () => {
  it("reads the UP trains for an outbound bound and resolves dest names", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          status: 1,
          data: {
            "TML-KOW": {
              UP: [{ time: "2026-09-14 08:01:00", plat: "2", dest: "KOW" }],
              DOWN: [],
            },
          },
        }),
    }) as unknown as typeof fetch;

    const etas = await fetchMtr({
      stopId: "KOW",
      route: "TML",
      bound: "OUT" as any,
      stopList,
    });

    expect(etas).toEqual([
      {
        eta: "2026-09-14T08:01:00+08:00",
        remark: { zh: "2號月台", en: "Platform 2" },
        dest: { zh: "九龍", en: "Kowloon" },
        co: "mtr",
      },
    ]);
  });

  it("reads the DOWN trains for an inbound bound", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          status: 1,
          data: {
            "TML-KOW": {
              UP: [],
              DOWN: [{ time: "2026-09-14 08:02:00", plat: "1", dest: "KOW" }],
            },
          },
        }),
    }) as unknown as typeof fetch;

    const etas = await fetchMtr({
      stopId: "KOW",
      route: "TML",
      bound: "IN" as any,
      stopList,
    });

    expect(etas[0].eta).toBe("2026-09-14T08:02:00+08:00");
  });

  it("returns the status message with the info link stripped", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          status: 0,
          message: "Delay Please click here for more information.",
        }),
    }) as unknown as typeof fetch;

    const etas = await fetchMtr({
      stopId: "KOW",
      route: "TML",
      bound: "OUT" as any,
      stopList,
    });

    expect(etas).toEqual([
      {
        eta: "",
        remark: { zh: "Delay", en: "Delay" },
        dest: { zh: "", en: "" },
        co: "mtr",
      },
    ]);
  });

  it("returns [] on status 0 without a message", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ status: 0 }),
    }) as unknown as typeof fetch;

    const etas = await fetchMtr({
      stopId: "KOW",
      route: "TML",
      bound: "OUT" as any,
      stopList,
    });

    expect(etas).toEqual([]);
  });

  it("falls back to the mirror host when the primary fetch fails", async () => {
    const payload = {
      status: 1,
      data: {
        "TML-KOW": {
          UP: [{ time: "2026-09-14 08:01:00", plat: "2", dest: "KOW" }],
          DOWN: [],
        },
      },
    };
    global.fetch = jest
      .fn()
      .mockRejectedValueOnce(new Error("dns"))
      .mockResolvedValueOnce({ json: () => Promise.resolve(payload) }) as unknown as typeof fetch;

    const etas = await fetchMtr({
      stopId: "KOW",
      route: "TML",
      bound: "OUT" as any,
      stopList,
    });

    expect(etas).toHaveLength(1);
    expect((global.fetch as jest.Mock).mock.calls[1][0]).toContain("mtr.hkbus.app");
  });
});
