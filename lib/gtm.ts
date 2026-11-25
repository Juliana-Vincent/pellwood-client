export const GTM_ID: string | null = (() => {
  const id = (process.env.NEXT_PUBLIC_GTM_ID || "").trim();
  return /^GTM-[A-Z0-9]{4,12}$/.test(id) ? id : null;
})();

export interface ConsentChoice {
  analytics: boolean;
  targeting: boolean;
}

/** Banner categories -> Consent Mode v2 signals. */
export const consentSignals = ({ analytics, targeting }: ConsentChoice) => ({
  analytics_storage: analytics ? "granted" : "denied",
  ad_storage: targeting ? "granted" : "denied",
  ad_user_data: targeting ? "granted" : "denied",
  ad_personalization: targeting ? "granted" : "denied",
});

export const gtmHeadScript = (id: string) => `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
(function () {
  var c = { analytics: false, targeting: false };
  try {
    var m = document.cookie.match(/(?:^|; )cc_cookie=([^;]*)/);
    var cats = m ? JSON.parse(decodeURIComponent(m[1])).categories || [] : [];
    c.analytics = cats.indexOf('analytics') > -1;
    c.targeting = cats.indexOf('targeting') > -1;
  } catch (e) {}
  gtag('consent', 'default', {
    analytics_storage: c.analytics ? 'granted' : 'denied',
    ad_storage: c.targeting ? 'granted' : 'denied',
    ad_user_data: c.targeting ? 'granted' : 'denied',
    ad_personalization: c.targeting ? 'granted' : 'denied',
    wait_for_update: 500
  });
})();
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${id}');
`;
