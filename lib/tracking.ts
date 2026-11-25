import type { GtagPurchaseEvent } from "@/functions/gtag";
import { GTM_ID, consentSignals } from "@/lib/gtm";

/*
 * Analytics and ad scripts, loaded only after the visitor consents.
 *
 * These used to be <Script type="text/plain" data-category="..."> tags that
 * vanilla-cookieconsent was meant to switch on by scanning the page. The scan runs
 * when the consent banner starts, which is before next/script has inserted
 * afterInteractive/lazyOnload tags - so the scripts were never found and never ran,
 * even after "Povolit vše" (Dan's report T1). Loading them from the consent
 * callbacks removes the race.
 *
 * Each integration is switched on by its own env variable. Without the variable
 * nothing is loaded, rather than a script with an empty ID.
 */
const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const SKLIK_RETARGETING_ID = process.env.NEXT_PUBLIC_SKLIK_RETARGETING_ID;
const SKLIK_CONVERSION_ID = process.env.NEXT_PUBLIC_SKLIK_CONVERSION_ID;

export interface Consent {
  analytics: boolean;
  targeting: boolean;
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    rc?: {
      retargetingHit?: (conf: Record<string, unknown>) => void;
      conversionHit?: (conf: Record<string, unknown>) => void;
    };
  }
}

let consent: Consent = { analytics: false, targeting: false };
let gaLoaded = false;
let seznamLoaded = false;
let seznamReady = false;
let pendingPurchase: GtagPurchaseEvent | null = null;
let purchaseSentToGa = false;
let purchaseSentToSklik = false;
let purchaseSentToGtm: string | null = null;

/** GTM (lib/gtm.ts) loads on its own; it only needs to hear about the banner. */
function updateGtmConsent(next: Consent) {
  if (!GTM_ID) return;
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments);
    };
  }
  window.gtag("consent", "update", consentSignals(next));
  window.dataLayer.push({
    event: "cookie_consent_update",
    consent_analytics: next.analytics,
    consent_targeting: next.targeting,
  });
}

/**
 * The order for GTM's tags (GA4 / Google Ads ecommerce format). Sent whatever
 * the consent: each tag in GTM checks the consent state itself.
 */
function pushPurchaseToGtm(p: GtagPurchaseEvent) {
  if (!GTM_ID || purchaseSentToGtm === p.transaction_id) return;
  window.dataLayer = window.dataLayer || [];
  // Clears the previous ecommerce object, as Google recommends.
  window.dataLayer.push({ ecommerce: null });
  window.dataLayer.push({ event: "purchase", ecommerce: p });
  purchaseSentToGtm = p.transaction_id;
}

function injectScript(id: string, src: string, onLoad?: () => void) {
  if (document.getElementById(id)) return;
  const el = document.createElement("script");
  el.id = id;
  el.async = true;
  el.src = src;
  if (onLoad) el.addEventListener("load", onLoad);
  document.head.appendChild(el);
}

function loadGa() {
  if (gaLoaded || !GA_ID) return;
  gaLoaded = true;
  window.dataLayer = window.dataLayer || [];
  // gtag must push the `arguments` object itself, not an array copy - GA ignores
  // plain arrays.
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag("js", new Date());
  // GA4's enhanced measurement records client-side route changes itself
  // ("page changes based on browser history events"), so no manual page_view here.
  window.gtag("config", GA_ID);
  injectScript("ga-gtag", `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`);
}

function loadSeznam() {
  if (seznamLoaded || (!SKLIK_RETARGETING_ID && !SKLIK_CONVERSION_ID)) return;
  seznamLoaded = true;
  injectScript("seznam-rc", "https://c.seznam.cz/js/rc.js", () => {
    seznamReady = true;
    if (SKLIK_RETARGETING_ID && window.rc?.retargetingHit) {
      window.rc.retargetingHit({ rtgId: Number(SKLIK_RETARGETING_ID), consent: 1 });
    }
    flushPurchase();
  });
}

function flushPurchase() {
  if (!pendingPurchase) return;
  const p = pendingPurchase;

  if (!purchaseSentToGa && consent.analytics && gaLoaded && window.gtag) {
    window.gtag("event", "purchase", p);
    purchaseSentToGa = true;
  }
  if (
    !purchaseSentToSklik &&
    SKLIK_CONVERSION_ID &&
    consent.targeting &&
    seznamReady &&
    window.rc?.conversionHit
  ) {
    window.rc.conversionHit({
      id: Number(SKLIK_CONVERSION_ID),
      value: p.value,
      orderId: p.transaction_id,
      consent: 1,
    });
    purchaseSentToSklik = true;
  }
}

/** Called by the consent banner on every page load and on every change. */
export function applyConsent(next: Consent) {
  const revoked =
    (consent.analytics && !next.analytics) || (consent.targeting && !next.targeting);
  consent = next;
  updateGtmConsent(next);
  // A script that is already running can't be unloaded; reload so the page comes
  // back without it.
  if (revoked && (gaLoaded || seznamLoaded)) {
    window.location.reload();
    return;
  }
  if (consent.analytics) loadGa();
  if (consent.targeting) loadSeznam();
  flushPurchase();
}

/** Called by the thank-you page. Sent as soon as consent and scripts allow. */
export function trackPurchase(event: GtagPurchaseEvent) {
  if (pendingPurchase?.transaction_id !== event.transaction_id) {
    pendingPurchase = event;
    purchaseSentToGa = false;
    purchaseSentToSklik = false;
  }
  pushPurchaseToGtm(event);
  flushPurchase();
}
