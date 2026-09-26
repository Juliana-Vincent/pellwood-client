import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/db";
import { generateResetToken } from "@/lib/auth";
import { createTransporter } from "@/lib/mailer";
import { sendEmail as sendEmailViaResend } from "@/lib/mailer-resend";
import { sendEmail as sendEmailViaSendGrid } from "@/lib/mailer-sendgrid";
import ResetPassword from "@/mail_template/resetPassword";

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
    const { email } = req.body;

    const user = email ? await prisma.user.findUnique({ where: { email } }) : null;

    // Always respond the same way regardless of whether the account exists,
    // so this endpoint can't be used to enumerate registered emails.
    if (user) {
      const { token, tokenHash, expires } = generateResetToken();
      await prisma.user.update({
        where: { id: user.id },
        data: { resetTokenHash: tokenHash, resetTokenExpires: expires },
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
    return res.status(500).json({
      msg: "Internal Server Error",
      success: false,
    });
  }
}