import { Resend, CreateEmailOptions } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;

export interface MailOptions {
  from: string;
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

export async function sendEmail(mailOptions: MailOptions) {
  try {
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not set");
    }

    if (!mailOptions.html && !mailOptions.text) {
      throw new Error("Either html or text must be provided to send an email via Resend");
    }

    const resend = new Resend(RESEND_API_KEY);

    // Extract email from "Name <email@domain.com>" format
    const extractEmail = (emailString: string): string => {
      const match = emailString.match(/<(.+)>/);
      return match ? match[1] : emailString;
    };

    // Parse from field
    
    // Parse to field (can be multiple addresses separated by commas)
    const toEmails = mailOptions.to
      .split(",")
      .map(email => email.trim())
      .map(email => extractEmail(email));

    // Constructing as CreateEmailOptions manually bypasses the discriminated union TS complaint
    const payload = {
      from: mailOptions.from,
      to: toEmails,
      subject: mailOptions.subject,
    } as CreateEmailOptions;

    if (mailOptions.html) payload.html = mailOptions.html;
    if (mailOptions.text) payload.text = mailOptions.text;

    const { data, error } = await resend.emails.send(payload);

    if (error) {
      throw new Error(error.message);
    }

    return { messageId: data?.id };
  } catch (error: any) {
    console.error("Resend error:", error.message || error);
    throw error;
  }
}
