import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/user.model";
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

    await dbConnect();
    const user = await User.findOne({ email });

    // Always respond the same way regardless of whether the account exists,
    // so this endpoint can't be used to enumerate registered emails.
    if (user) {
      const { token, tokenHash, expires } = generateResetToken();
      user.resetTokenHash = tokenHash;
      user.resetTokenExpires = expires;
      await user.save();

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
      msg: "Internal Server Error", // real error is already logged server-side above
      success: false,
    });
  }
}
