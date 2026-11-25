import { describe, it, expect, vi, beforeEach } from "vitest";
import vm from "node:vm";
import { consentSignals, gtmHeadScript } from "@/lib/gtm";

/** Runs the <head> snippet the way a browser would, with a given cookie. */
const runHead = (cookie: string) => {
  const inserted: any[] = [];
  const firstScript = { parentNode: { insertBefore: (el: any) => inserted.push(el) } };
  const window: any = {
    document: {
      cookie,
      getElementsByTagName: () => [firstScript],
      createElement: () => ({}),
    },
  };
  window.window = window;
  vm.runInNewContext(gtmHeadScript("GTM-5BHS6ZKV"), window);
  return { dataLayer: window.dataLayer as any[], inserted };
};

const consentDefault = (dataLayer: any[]) =>
  Array.from(dataLayer.find((e) => e[0] === "consent" && e[1] === "default"))[2] as any;

describe("Google Tag Manager", () => {
  it("loads the container with everything denied for a first visit", () => {
    const { dataLayer, inserted } = runHead("");
    expect(inserted[0].src).toBe("https://www.googletagmanager.com/gtm.js?id=GTM-5BHS6ZKV");
    expect(consentDefault(dataLayer)).toMatchObject({
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    // Consent defaults must come before GTM starts.
    const consentAt = dataLayer.findIndex((e) => e[0] === "consent");
    const startAt = dataLayer.findIndex((e) => e.event === "gtm.js");
    expect(consentAt).toBeLessThan(startAt);
  });

  it("remembers a returning visitor's banner choice", () => {
    const cookie = `other=1; cc_cookie=${encodeURIComponent(
      JSON.stringify({ categories: ["necessary", "analytics"], revision: 0 }),
    )}`;
    expect(consentDefault(runHead(cookie).dataLayer)).toMatchObject({
      analytics_storage: "granted",
      ad_storage: "denied",
    });
  });

  it("survives a broken cookie", () => {
    expect(consentDefault(runHead("cc_cookie=%7Bbroken").dataLayer).analytics_storage).toBe("denied");
  });

  it("maps the banner's categories to Consent Mode", () => {
    expect(consentSignals({ analytics: false, targeting: true })).toEqual({
      analytics_storage: "denied",
      ad_storage: "granted",
      ad_user_data: "granted",
      ad_personalization: "granted",
    });
  });
});

describe("GTM from the cookie banner and the thank-you page", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_GTM_ID", "GTM-5BHS6ZKV");
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "");
    (globalThis as any).window = globalThis;
    (globalThis as any).dataLayer = [];
    delete (globalThis as any).gtag;
  });

  it("sends the consent update and the purchase once", async () => {
    const { applyConsent, trackPurchase } = await import("@/lib/tracking");
    applyConsent({ analytics: true, targeting: false });
    const purchase = {
      transaction_id: "1234567",
      affiliation: "Pellwood",
      value: 712,
      currency: "CZK",
      tax: 123.57,
      shipping: 150,
      items: [],
    };
    trackPurchase(purchase);
    trackPurchase(purchase);

    const dl = (globalThis as any).dataLayer as any[];
    const update = dl.find((e) => e[0] === "consent" && e[1] === "update");
    expect(update[2].analytics_storage).toBe("granted");
    expect(dl.some((e) => e.event === "cookie_consent_update" && e.consent_analytics === true)).toBe(true);
    expect(dl.filter((e) => e.event === "purchase")).toHaveLength(1);
    expect(dl.find((e) => e.event === "purchase").ecommerce.transaction_id).toBe("1234567");
  });

  it("does nothing without a container ID", async () => {
    vi.stubEnv("NEXT_PUBLIC_GTM_ID", "");
    const { applyConsent } = await import("@/lib/tracking");
    applyConsent({ analytics: true, targeting: true });
    expect((globalThis as any).dataLayer).toHaveLength(0);
  });
});
