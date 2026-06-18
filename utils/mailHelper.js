const axios = require("axios");

const sendMail = async ({ to, subject, html }) => {
  const apiKey = String(process.env.BREVO_API_KEY || process.env.BREVO_SMTP_KEY || "").trim();
  const fromEmail = String(process.env.BREVO_EMAIL || "").trim();

  if (!apiKey) throw new Error("Brevo API key missing");
  if (!fromEmail) throw new Error("Brevo sender email missing");

  try {
    const res = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          name: "BR30 Market Scanner",
          email: fromEmail,
        },

        replyTo: {
          name: "BR30 Support Team",
          email: "support.br30trader@gmail.com",
        },

        to: [{ email: to }],

        subject,
        htmlContent: html,
      },
      {
        headers: {
          accept: "application/json",
          "api-key": apiKey,
          "content-type": "application/json",
        },
      }
    );

    return res.data;
  } catch (err) {
    console.log("BREVO ERROR =>", err.response?.data || err.message);
    throw new Error(err.response?.data?.message || "Mail send failed");
  }
};

module.exports = sendMail;
