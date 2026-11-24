/**
 * "We're processing your order" - sent once, when the shop owner switches the
 * order to "Vyřizuje se" in the admin. Every string in `order` must already be
 * HTML-escaped (escapeHtmlDeep); this template interpolates them as they are.
 */
export interface ProcessingEmailData {
  idOrder: string;
  name?: string;
  currency?: string;
  sum?: string;
  deliveryMethod?: string;
  basket: Array<{ nameProduct?: string; variantName?: string; countVariant?: number | string }>;
}

const TEXT = {
  cz: {
    title: "Vaši objednávku vyřizujeme",
    greeting: () => "Dobrý den,",
    intro: (id: string) => `vaši objednávku č.&nbsp;<strong>${id}</strong> právě vyřizujeme.`,
    shipping: "Jakmile zásilku předáme dopravci, pošle vám informace o&nbsp;doručení.",
    pickup: "Až bude objednávka připravená k&nbsp;vyzvednutí, dáme vám vědět.",
    items: "Objednané zboží",
    pieces: "ks",
    total: "Celkem",
    help: "Máte dotaz? Napište nám na",
    thanks: "Děkujeme za nákup!",
  },
  en: {
    title: "We're processing your order",
    greeting: (name: string) => (name ? `Hello ${name},` : "Hello,"),
    intro: (id: string) => `your order no.&nbsp;<strong>${id}</strong> is now being processed.`,
    shipping: "Once we hand the parcel to the carrier, they will send you the delivery details.",
    pickup: "We'll let you know as soon as your order is ready for pickup.",
    items: "Your items",
    pieces: "pcs",
    total: "Total",
    help: "Any questions? Write to us at",
    thanks: "Thank you for your order!",
  },
};

/** "Osobní odběr", "On pickup", "Vyzvednutí na prodejně"... */
const isPickup = (deliveryMethod?: string) => /odb[eě]r|pickup|vyzved/i.test(deliveryMethod || "");

const font = "font-family:arial, 'helvetica neue', helvetica, sans-serif";
const p = `margin:0 0 14px;${font};font-size:14px;line-height:21px;color:#333333`;

const OrderProcessing = (order: ProcessingEmailData, lang: "cz" | "en"): string => {
  const t = TEXT[lang];
  const items = order.basket
    .map(
      (item) => `
        <tr>
          <td style="padding:6px 0;${font};font-size:14px;color:#333333;border-bottom:1px solid #EFEFEF">
            ${item.nameProduct || ""}${item.variantName && item.variantName !== item.nameProduct ? ` - ${item.variantName}` : ""}
          </td>
          <td align="right" style="padding:6px 0;${font};font-size:14px;color:#333333;border-bottom:1px solid #EFEFEF;white-space:nowrap">
            ${Number(item.countVariant) || 0}&nbsp;${t.pieces}
          </td>
        </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="${lang === "cz" ? "cs" : "en"}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>${t.title}</title>
</head>
<body style="margin:0;padding:0;background-color:#F6F6F6">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F6F6F6;border-collapse:collapse">
    <tr>
      <td align="center" style="padding:20px 10px">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#FFFFFF;border-collapse:collapse">
          <tr>
            <td align="center" style="padding:30px 20px 10px">
              <img src="https://pellwood.com/assets/logo-email.png" alt="PELLWOOD" width="189" style="display:block;border:0">
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:20px 40px 10px">
              <h1 style="margin:0;${font};font-size:28px;line-height:34px;font-weight:normal;color:#333333">${t.title}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px 0">
              <p style="${p}">${t.greeting(order.name || "")}</p>
              <p style="${p}">${t.intro(order.idOrder)}</p>
              <p style="${p}">${isPickup(order.deliveryMethod) ? t.pickup : t.shipping}</p>
            </td>
          </tr>
          ${
            order.basket.length
              ? `<tr>
            <td style="padding:10px 40px 0">
              <p style="${p};margin-bottom:6px"><strong>${t.items}</strong></p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
                ${items}
                ${
                  order.sum
                    ? `<tr>
                  <td style="padding:10px 0 0;${font};font-size:14px;color:#333333"><strong>${t.total}</strong></td>
                  <td align="right" style="padding:10px 0 0;${font};font-size:14px;color:#333333;white-space:nowrap"><strong>${order.sum}&nbsp;${order.currency || ""}</strong></td>
                </tr>`
                    : ""
                }
              </table>
            </td>
          </tr>`
              : ""
          }
          <tr>
            <td style="padding:30px 40px 40px">
              <p style="${p}">${t.thanks}</p>
              <p style="${p};margin:0">${t.help} <a href="mailto:info@pellwood.com" style="color:#305EE4;text-decoration:none">info@pellwood.com</a>.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
};

export default OrderProcessing;
