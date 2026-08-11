import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
import Order from "@/models/order.model";
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

  try {
    const data = req.body;

    // Atomically claim the "notified" flag so a page refresh (thank-you re-runs its
    // data fetch on every load) or a duplicate call can't send the confirmation email
    // twice - only the request that actually flips false -> true proceeds to send.
    await dbConnect();
    const claimed = await Order.findOneAndUpdate(
      { idOrder: data.idOrder, notified: { $ne: true } },
      { notified: true }
    );
    if (!claimed) {
      return res.status(200).json({ success: true, alreadyNotified: true });
    }

    const mailOptions = {
      from: '"Objednávka dokončena - Pellwood" <info@hardart.cz>',
      to: `${data.email}, info@pellwood.com`,
      subject: `Objednávka č.: ${data.idOrder}`,
      text: "Objednávka dokončena - Pellwood",
      html: data.currency === "Kč" ? InfoOrder(data) : InfoOrderEN(data),
    };

    // Try Resend first (if API key is set)
    if (process.env.RESEND_API_KEY) {
      console.log("Using Resend for email delivery");
      await sendEmailViaResend(mailOptions);
    }
    // Try SendGrid second
    else if (process.env.SENDGRID_API_KEY) {
      console.log("Using SendGrid for email delivery");
      await sendEmailViaSendGrid(mailOptions);
    }
    // Fallback to nodemailer
    else {
      console.log("Using Nodemailer for email delivery");
      const transporter = await createTransporter();
      await transporter.sendMail(mailOptions);
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("mail.send error:", err);
    return res.status(500).json({
      msg: err instanceof Error ? err.message : "Internal Server Error",
      success: false,
    });
  }
}
