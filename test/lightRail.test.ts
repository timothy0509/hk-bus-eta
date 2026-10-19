import fetchLightRail from "../src/lightRail";

const base = { route: "505", dest: { zh: "三聖", en: "Sam Shing" }, stopId: "LR123" };

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("lightRail", () => {
  it("reports end of service when every platform is closed", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          platform_list: [{ platform_id: "1", end_service_status: 1 }],
        }),
    }) as unknown as typeof fetch;

    const etas = await fetchLightRail(base);

    expect(etas).toEqual([
      {
        eta: "",
        remark: {
          zh: "此站今日服務已經終止",
          en: "This stop's service for today has ended",
        },
        dest: { zh: "", en: "" },
        co: "lightRail",
      },
    ]);
  });

  it("matches the route, formats the wait, and shows the platform", async () => {
    jest.useFakeTimers({ doNotFake: ["nextTick", "setImmediate"] });
    jest.setSystemTime(new Date("2026-09-14T00:00:00Z"));
    global.fetch = jest.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          platform_list: [
            {
              platform_id: "2",
              end_service_status: 0,
              route_list: [
                {
                  route_no: "505",
                  additionalInfo1: "",
                  dest_ch: "三聖",
                  dest_en: "Sam Shing",
                  stop: 0,
                  time_en: "3",
                  train_length: 2,
                  routeRemarkEng2: "",
                  routeRemarkChi2: "",
                },
              ],
            },
          ],
        }),
    }) as unknown as typeof fetch;

    const etas = await fetchLightRail(base);

    expect(etas).toHaveLength(1);
    expect(etas[0].eta).toMatch(/\+08:00$/);
    expect(etas[0].remark.zh).toContain("2號月台");
    expect(etas[0].remark.en).toContain("Platform 2");
    jest.useRealTimers();
  });

  it("treats Arriving as no wait and appends route remarks", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          platform_list: [
            {
              platform_id: "1",
              end_service_status: 0,
              route_list: [
                {
                  route_no: "610",
                  additionalInfo1: "505",
                  dest_ch: "三聖",
                  dest_en: "Sam Shing",
                  stop: 0,
                  time_en: "Arriving",
                  train_length: 1,
                  routeRemarkEng2: "Via",
                  routeRemarkChi2: "經由",
                },
              ],
            },
          ],
        }),
    }) as unknown as typeof fetch;

    const etas = await fetchLightRail(base);

    expect(etas).toHaveLength(1);
    expect(etas[0].remark.zh).toContain("經由");
    expect(etas[0].remark.en).toContain("Via");
  });

  it("drops trains for other routes or that already passed the stop", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          platform_list: [
            {
              platform_id: "1",
              end_service_status: 0,
              route_list: [
                {
                  route_no: "999",
                  additionalInfo1: "",
                  dest_ch: "三聖",
                  dest_en: "Sam Shing",
                  stop: 0,
                  time_en: "2",
                  train_length: 1,
                },
                {
                  route_no: "505",
                  additionalInfo1: "",
                  dest_ch: "三聖",
                  dest_en: "Sam Shing",
                  stop: 1,
                  time_en: "2",
                  train_length: 1,
                },
              ],
            },
          ],
        }),
    }) as unknown as typeof fetch;

    const etas = await fetchLightRail(base);

    expect(etas).toEqual([]);
  });

  it("returns [] when the request fails", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("down")) as unknown as typeof fetch;

    const etas = await fetchLightRail(base);

    expect(etas).toEqual([]);
  });
});
