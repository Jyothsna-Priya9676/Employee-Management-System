
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({ to, subject, html, text }) {
    if (!process.env.RESEND_API_KEY) {
        throw new Error("RESEND_API_KEY is missing");
    }

    const result = await resend.emails.send({
        from: "Smart HRMS <onboarding@resend.dev>",
        to: [to],
        subject,
        html,
        text,
    });

    if (result.error) {
        throw new Error(result.error.message);
    }

    return result.data;
}
