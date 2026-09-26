import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/db";
import { createTransporter } from "@/lib/mailer";
import { sendEmail as sendEmailViaResend } from "@/lib/mailer-resend";
import { sendEmail as sendEmailViaSendGrid } from "@/lib/mailer-sendgrid";
import InfoOrder from "@/mail_template/infoOrder";
import InfoOrderEN from "@/mail_template/infoOrderEN";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;

  if (method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${method} Not Allowed`);
  }
  const asObject = (value: unknown): any =>
    value && typeof value === "object" && !Array.isArray(value) ? value : undefined;

  try {
    const { idOrder } = req.body;
    if (!idOrder) {
      return res.status(400).json({ msg: "Missing idOrder", success: false });
    }

    const orderNumber = Number(idOrder);
    if (!Number.isInteger(orderNumber)) {
      return res.status(400).json({ msg: "Invalid idOrder", success: false });
    }

    const { count } = await prisma.order.updateMany({
      where: { idOrder: orderNumber, notified: false },
      data: { notified: true },
    });
    if (count === 0) {
      return res.status(200).json({ success: true, alreadyNotified: true });
    }

    const order = await prisma.order.findUnique({ where: { idOrder: orderNumber } });
    if (!order) {
      return res.status(404).json({ msg: "Order not found", success: false });
    }

    const data = {
      ...order,
      sum: String(order.sum),
      idOrder: String(order.idOrder),
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
    return res.status(500).json({
      msg: "Internal Server Error",
      success: false,
    });
  }
}