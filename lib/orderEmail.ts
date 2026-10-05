import { ordersApi } from "@/lib/strapiAdmin";
import { createTransporter } from "@/lib/mailer";
import { sendEmail as sendEmailViaResend } from "@/lib/mailer-resend";
import { sendEmail as sendEmailViaSendGrid } from "@/lib/mailer-sendgrid";
import InfoOrder from "@/mail_template/infoOrder";
import InfoOrderEN from "@/mail_template/infoOrderEN";

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
    sum: order.sum === null || order.sum === undefined ? "" : String(order.sum),
    basket: Array.isArray(order.basket) ? order.basket : [],
    anotherAdress: asObject(order.anotherAdress),
    companyData: asObject(order.companyData),
  };

  const mailOptions = {
    from: '"Objednávka dokončena - Pellwood" <info@pellwood.com>',
    to: `${data.email}, info@pellwood.com`,
    subject: `Objednávka č.: ${data.idOrder}`,
    text: "Objednávka dokončena - Pellwood",
    html: data.currency === "Kč" ? InfoOrder(data) : InfoOrderEN(data),
  };

  if (process.env.RESEND_API_KEY) {
    await sendEmailViaResend(mailOptions);
  } else if (process.env.SENDGRID_API_KEY) {
    await sendEmailViaSendGrid(mailOptions);
  } else {
    const transporter = await createTransporter();
    await transporter.sendMail(mailOptions);
  }
}
