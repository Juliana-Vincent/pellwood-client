import type { NextApiRequest, NextApiResponse } from "next";
import { customersApi } from "@/lib/strapiAdmin";
import { generateResetToken } from "@/lib/auth";
import { createTransporter } from "@/lib/mailer";
import { sendEmail as sendEmailViaResend } from "@/lib/mailer-resend";
import { sendEmail as sendEmailViaSendGrid } from "@/lib/mailer-sendgrid";
import ResetPassword from "@/mail_template/resetPassword";
import { checkAuthRateLimit } from "@/lib/rateLimit";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;

  if (method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${method} Not Allowed`);
  }

  // The response body is constant, but the work behind it is not: for a real
  // account this awaits a Strapi write and an email send before replying, so
  // response time still distinguishes a registered address from an unknown one.
  // Rate limiting is what keeps that from being usable at scale.
  const retryAfter = checkAuthRateLimit(req, "reset-request", 5, 300);
  if (retryAfter) {
    res.setHeader("Retry-After", String(retryAfter));
    return res.status(429).json({ msg: "Too many attempts", error: true });
  }

  try {
    const { email } = req.body;

    const user = email
      ? await customersApi.findFirst({ "filters[email][$eq]": email })
      : null;

    // Always respond the same way regardless of whether the account exists,
    // so this endpoint can't be used to enumerate registered emails.
    if (user) {
      const { token, tokenHash, expires } = generateResetToken();
      await customersApi.update(user.documentId, {
        resetTokenHash: tokenHash,
        resetTokenExpires: expires.toISOString(),
      });

      const mailOptions = {
        from: '"Obnoveni hesla - Pellwood" <info@pellwood.cz>',
        to: email,
        subject: "Obnoveni hesla",
        text: "Obnoveni hesla - Pellwood",
        html: ResetPassword(email, token),
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

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("mail.send error:", err);
    return res.status(500).json({ msg: "Internal Server Error", success: false });
  }
}