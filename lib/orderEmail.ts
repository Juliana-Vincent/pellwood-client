import { ordersApi } from "@/lib/strapiAdmin";
import { createTransporter } from "@/lib/mailer";
import { sendEmail as sendEmailViaResend } from "@/lib/mailer-resend";
import { sendEmail as sendEmailViaSendGrid } from "@/lib/mailer-sendgrid";
import InfoOrder from "@/mail_template/infoOrder";
import InfoOrderEN from "@/mail_template/infoOrderEN";
import OrderProcessing from "@/mail_template/orderProcessing";
import { escapeHtmlDeep } from "@/helpers/escapeHtml";
import { paymentStatusOf } from "@/helpers/paymentStatus";

const asObject = (value: unknown): any =>
  value && typeof value === "object" && !Array.isArray(value) ? value : undefined;

// Previously this lived behind an unauthenticated POST /api/send/orderInfo, which
// let anyone who guessed an order number both mail the real customer and burn the
// one-shot `notified` flag so the genuine confirmation never arrived. It is now a
// server-only function with no HTTP surface, called from the two places that know a
// payment is actually settled: the Comgate-verified webhook, and the thank-you page
// for cash-on-delivery.
export async function sendOrderConfirmation(orderNumber: number): Promise<void> {
  const order = await ordersApi.findFirst({
    "filters[idOrder][$eq]": orderNumber,
  });

  if (!order) {
    console.error(`sendOrderConfirmation: unknown order idOrder=${orderNumber}`);
    return;
  }

  // Read-then-write rather than an atomic claim - Strapi's REST API has no
  // conditional update - so two simultaneous callers could both get through and
  // send twice. Duplicate confirmations are annoying; silently sending none would
  // be worse, so the order is deliberately read, claimed, then sent.
  if (order.notified) return;
  await ordersApi.update(order.documentId, { notified: true });

  // The order from Strapi is the ONLY source for the email content - never a
  // request body.
  const data = {
    ...order,
    idOrder: String(order.idOrder),
    // The templates read `status`; orders placed before the rename still carry it
    // under the old key.
    status: paymentStatusOf(order),
    sum: order.sum === null || order.sum === undefined ? "" : String(order.sum),
    basket: Array.isArray(order.basket) ? order.basket : [],
    anotherAdress: asObject(order.anotherAdress),
    companyData: asObject(order.companyData),
  };

  // The templates interpolate these values straight into HTML. The name, address,
  // note and company fields are whatever the customer typed, so every string is
  // escaped before it gets there. The address in `to` stays raw - it is an
  // address, not markup, and validationEmail has already rejected < and >.
  const safe = escapeHtmlDeep(data);
  const isCzech = data.currency === "Kč";

  const mailOptions = {
    // English orders had an English body under a Czech sender name and subject.
    from: isCzech
      ? '"Objednávka dokončena - Pellwood" <info@pellwood.com>'
      : '"Order confirmed - Pellwood" <info@pellwood.com>',
    to: `${data.email}, info@pellwood.com`,
    subject: isCzech ? `Objednávka č.: ${data.idOrder}` : `Order no.: ${data.idOrder}`,
    text: isCzech ? "Objednávka dokončena - Pellwood" : "Order confirmed - Pellwood",
    html: isCzech ? InfoOrder(safe) : InfoOrderEN(safe),
  };

  await deliver(mailOptions);
}

type MailOptions = { from: string; to: string; subject: string; text: string; html: string };

async function deliver(mailOptions: MailOptions): Promise<void> {
  if (process.env.RESEND_API_KEY) {
    await sendEmailViaResend(mailOptions);
  } else if (process.env.SENDGRID_API_KEY) {
    await sendEmailViaSendGrid(mailOptions);
  } else {
    const transporter = await createTransporter();
    await transporter.sendMail(mailOptions);
  }
}

export type ProcessingEmailResult = "sent" | "not-found" | "not-processing" | "already-sent" | "no-email";

/**
 * "Vaši objednávku vyřizujeme" - once per order, when the admin switches it to
 * "Vyřizuje se". Strapi only says which order changed; the order is re-read here
 * so the state, the address and the content all come from Strapi itself.
 */
export async function sendOrderProcessing(documentId: string): Promise<ProcessingEmailResult> {
  const order = await ordersApi.findOne(documentId);
  if (!order) return "not-found";
  if (order.state !== "processing") return "not-processing";
  if (order.processingNotified === true) return "already-sent";
  if (!order.email) return "no-email";

  // Claimed before sending, for the same reason as sendOrderConfirmation: a
  // double click in the admin must not mail the customer twice.
  await ordersApi.update(order.documentId, { processingNotified: true });

  const isCzech = order.currency === "Kč";
  const safe = escapeHtmlDeep({
    idOrder: String(order.idOrder),
    name: order.name || "",
    currency: order.currency || "",
    sum: order.sum === null || order.sum === undefined ? "" : String(order.sum),
    deliveryMethod: order.deliveryMethod || "",
    basket: Array.isArray(order.basket) ? order.basket : [],
  });

  try {
    await deliver({
      from: '"Pellwood" <info@pellwood.com>',
      to: order.email,
      subject: isCzech
        ? `Objednávka č. ${order.idOrder} se vyřizuje`
        : `Order no. ${order.idOrder} is being processed`,
      text: isCzech
        ? `Vaši objednávku č. ${order.idOrder} právě vyřizujeme.`
        : `Your order no. ${order.idOrder} is now being processed.`,
      html: OrderProcessing(safe, isCzech ? "cz" : "en"),
    });
  } catch (err) {
    // Give the claim back, so switching the state again retries the e-mail.
    await ordersApi.update(order.documentId, { processingNotified: false }).catch(() => undefined);
    throw err;
  }
  return "sent";
}
