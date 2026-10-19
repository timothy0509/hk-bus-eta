import fetchGmb from "../src/gmb";

afterEach(() => {
  jest.restoreAllMocks();
});

describe("gmb", () => {
  it("maps enabled etas for the matching direction and stop", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          data: [
            {
              route_seq: 1,
              stop_seq: 2,
              enabled: true,
              eta: [
                {
                  timestamp: "2026-09-14T08:00:00+08:00",
                  remarks_tc: "r1",
                  remarks_en: "r2",
                },
              ],
            },
            { route_seq: 2, stop_seq: 2, enabled: true, eta: [{ timestamp: "x" }] },
            { route_seq: 1, stop_seq: 3, enabled: true, eta: [{ timestamp: "y" }] },
          ],
        }),
    }) as unknown as typeof fetch;

    const etas = await fetchGmb({ gtfsId: "G1", stopId: "S1", bound: "O", seq: 1 });

    expect(etas).toEqual([
      {
        eta: "2026-09-14T08:00:00+08:00",
        remark: { zh: "r1", en: "r2" },
        dest: { zh: "", en: "" },
        co: "gmb",
      },
    ]);
  });

  it("returns the suspension description when the route is disabled", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          data: [
            {
              route_seq: 2,
              stop_seq: 1,
              enabled: false,
              description_tc: "暫停",
              description_en: "Suspended",
            },
          ],
        }),
    }) as unknown as typeof fetch;

    const etas = await fetchGmb({ gtfsId: "G1", stopId: "S1", bound: "I", seq: 0 });

    expect(etas).toEqual([
      {
        eta: "",
        remark: { zh: "暫停", en: "Suspended" },
        dest: { zh: "", en: "" },
        co: "gmb",
      },
    ]);
  });
});
