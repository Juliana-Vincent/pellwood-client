import { useEffect } from "react";
import { useRouter } from "next/router";
import * as CookieConsent from "vanilla-cookieconsent";
import localize from "@/data/localize";

const contactUs = "info@pellwood.com"

// The wide centered banner covers the checkout page's submit button and terms
// link (they sit at the same bottom-center spot the banner occupies) - confirmed
// by screenshot, not just theory. Every other page has nothing there, so only
// checkout falls back to the compact corner card.
const isCheckoutPath = (pathname: string) => pathname === "/basket/checkout";

export default function CookieConsent_() {
  const router = useRouter();
  const { lang } = localize(router.locale);
  const onCheckout = isCheckoutPath(router.pathname);

  useEffect(() => {
    // run() only executes once per page load (it no-ops on subsequent calls via an
    // internal _ccRun guard) - reset() clears that guard without erasing the user's
    // already-stored consent cookie, so a locale switch (or a client-side navigation
    // into/out of checkout, which needs a different layout - see onCheckout) can
    // still re-render the banner instead of silently doing nothing.
    CookieConsent.reset();

    CookieConsent.run({
      autoShow: true,
      guiOptions: {
        consentModal: onCheckout
          ? { layout: 'box', position: 'bottom left' }
          : { layout: 'cloud', position: 'bottom center' },
      },

      categories: {
        necessary: { readOnly: true, enabled: true },
        analytics: { enabled: false },
        targeting: { enabled: false },
      },

      language: {
        default: lang,
        translations: {
          cz: {
            consentModal: {
              title: 'Aby web správně fungoval používáme cookies',
              description: 'Cookies používáme ke zlepšení prohlížení webu a poskytování dalších funkcí. Souhlas udělíte kliknutím na tlačítko "Povolit vše" nebo ho můžete odmítnout <button type="button" data-cc="accept-necessary" class="cc-link">zde</button>.',
              acceptAllBtn: 'Povolit vše',
              showPreferencesBtn: 'Nastavit preference',
            },
            preferencesModal: {
              title: 'Nastavení cookies',
              savePreferencesBtn: 'Souhlasím s vybranými cookies',
              acceptAllBtn: 'Souhlasím se všemi cookies',
              closeIconLabel: 'Zavřít',
              sections: [
                { description: 'Upravte si cookies dle vlastních preferencí.' },
                {
                  title: 'Technické cookies',
                  description: 'Tyto cookies jsou nezbytné pro správné a bezpečné fungování webu. Technické cookies nelze vypnout.',
                  linkedCategory: 'necessary',
                },
                {
                  title: 'Analytické cookies',
                  description: 'Analytické cookies umožňují měření výkonu webu. Jejich pomocí určujeme třeba počet a zdroje návštěv. Získaná data jsou samozřejmě anonymní.',
                  linkedCategory: 'analytics',
                },
                {
                  title: 'Reklamní cookies',
                  description: 'Tyto soubory cookies shromažďují informace o tom, jak webové stránky používáte, které stránky jste navštívili a na které odkazy jste klikli. Souhlas s těmito cookies lze kdykoliv odvolat.',
                  linkedCategory: 'targeting',
                },
                {
                  title: 'Další informace',
                  description: `V případě dalších dotazů ohledně podmínek a nastavení, neváhejte a <a class="cc-link" href="mailto:${contactUs}">kontaktujte nás</a>.`,
                },
              ],
            },
          },
          en: {
            consentModal: {
              title: 'We use cookies to make our site work',
              description: 'We use cookies to improve your browsing experience and provide additional features. You can grant consent by clicking "Accept All" or you can reject them <button type="button" data-cc="accept-necessary" class="cc-link">here</button>.',
              acceptAllBtn: 'Accept All',
              showPreferencesBtn: 'Manage Preferences',
            },
            preferencesModal: {
              title: 'Cookie Preferences',
              savePreferencesBtn: 'Save Preferences',
              acceptAllBtn: 'Accept All Cookies',
              closeIconLabel: 'Close',
              sections: [
                { description: 'Customize your cookie preferences.' },
                {
                  title: 'Strictly Necessary Cookies',
                  description: 'These cookies are essential for the proper functioning of the website. They cannot be disabled.',
                  linkedCategory: 'necessary',
                },
                {
                  title: 'Analytics Cookies',
                  description: 'Analytics cookies allow us to measure the performance of our website. They help us determine the number of visits and sources of traffic. The data collected is anonymous.',
                  linkedCategory: 'analytics',
                },
                {
                  title: 'Advertisement Cookies',
                  description: 'These cookies collect information about how you use our website, which pages you visited, and which links you clicked on. Consent to these cookies can be withdrawn at any time.',
                  linkedCategory: 'targeting',
                },
                {
                  title: 'More Information',
                  description: `For any queries regarding our cookie policy and your choices, please <a class="cc-link" href="mailto:${contactUs}">contact us</a>.`,
                },
              ],
            },
          },
          de: {
            consentModal: {
              title: 'Wir verwenden Cookies, damit unsere Website funktioniert',
              description: 'Wir verwenden Cookies, um Ihr Surferlebnis zu verbessern und zusätzliche Funktionen bereitzustellen. Sie können Ihre Zustimmung erteilen, indem Sie auf "Alle akzeptieren" klicken, oder sie <button type="button" data-cc="accept-necessary" class="cc-link">hier</button> ablehnen.',
              acceptAllBtn: 'Alle akzeptieren',
              showPreferencesBtn: 'Einstellungen verwalten',
            },
            preferencesModal: {
              title: 'Cookie-Einstellungen',
              savePreferencesBtn: 'Einstellungen speichern',
              acceptAllBtn: 'Alle Cookies akzeptieren',
              closeIconLabel: 'Schließen',
              sections: [
                { description: 'Passen Sie Ihre Cookie-Einstellungen an.' },
                {
                  title: 'Unbedingt erforderliche Cookies',
                  description: 'Diese Cookies sind für das ordnungsgemäße Funktionieren der Website unerlässlich. Sie können nicht deaktiviert werden.',
                  linkedCategory: 'necessary',
                },
                {
                  title: 'Analyse-Cookies',
                  description: 'Analyse-Cookies ermöglichen es uns, die Leistung unserer Website zu messen. Sie helfen uns, die Anzahl der Besuche und Verkehrsquellen zu ermitteln. Die gesammelten Daten sind anonym.',
                  linkedCategory: 'analytics',
                },
                {
                  title: 'Werbe-Cookies',
                  description: 'Diese Cookies sammeln Informationen darüber, wie Sie unsere Website nutzen, welche Seiten Sie besucht und auf welche Links Sie geklickt haben. Die Zustimmung zu diesen Cookies kann jederzeit widerrufen werden.',
                  linkedCategory: 'targeting',
                },
                {
                  title: 'Weitere Informationen',
                  description: `Bei Fragen zu unserer Cookie-Richtlinie und Ihren Auswahlmöglichkeiten kontaktieren Sie uns bitte unter <a class="cc-link" href="mailto:${contactUs}">${contactUs}</a>.`,
                },
              ],
            },
          },
        },
      },
    });
  }, [lang, onCheckout]);

  return null;
}
