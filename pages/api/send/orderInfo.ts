import type { NextApiRequest, NextApiResponse } from "next";
import { ordersApi } from "@/lib/strapiAdmin";
import { createTransporter } from "@/lib/mailer";
import { sendEmail as sendEmailViaResend } from "@/lib/mailer-resend";
import { sendEmail as sendEmailViaSendGrid } from "@/lib/mailer-sendgrid";
import InfoOrder from "@/mail_template/infoOrder";
import InfoOrderEN from "@/mail_template/infoOrderEN";

const asObject = (value: unknown): any =>
  value && typeof value === "object" && !Array.isArray(value) ? value : undefined;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;

  if (method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${method} Not Allowed`);
  }

  try {
    const { idOrder } = req.body;
    if (!idOrder) {
      return res.status(400).json({ msg: "Missing idOrder", success: false });
    }

    const orderNumber = Number(idOrder);
    if (!Number.isInteger(orderNumber)) {
      return res.status(400).json({ msg: "Invalid idOrder", success: false });
    }

    const order = await ordersApi.findFirst({
      "filters[idOrder][$eq]": orderNumber,
    });

    if (!order) {
      return res.status(404).json({ msg: "Order not found", success: false });
    }

    // Guard against the thank-you page re-running on every refresh. NOTE: unlike the
    // Mongo version this is read-then-write rather than an atomic claim - Strapi's
    // REST API has no conditional update - so two simultaneous loads could both get
    // through and send twice. Duplicate confirmations are annoying; silently sending
    // none would be worse, so the order is deliberately read, claimed, then sent.
    if (order.notified) {
      return res.status(200).json({ success: true, alreadyNotified: true });
    }
    await ordersApi.update(order.documentId, { notified: true });

    // The order from Strapi is the ONLY source for the email content below - never
    // the request body, which is caller-controlled and would otherwise let anyone
    // email arbitrary content to an arbitrary recipient by POSTing a guessed idOrder.
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
      console.log("Using Resend for email delivery");
      await sendEmailViaResend(mailOptions);
    } else if (process.env.SENDGRID_API_KEY) {
      console.log("Using SendGrid for email delivery");
      await sendEmailViaSendGrid(mailOptions);
    } else {
      console.log("Using Nodemailer for email delivery");
      const transporter = await createTransporter();
      await transporter.sendMail(mailOptions);
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("mail.send error:", err);
    return res.status(500).json({ msg: "Internal Server Error", success: false });
  }
}