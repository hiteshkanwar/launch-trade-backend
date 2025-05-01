const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "SendGrid",
  auth: {
    user: "apikey", // This is the literal string "apikey"
    pass: process.env.SENDGRID_API_KEY,
  },
});

const sendEmail = async (to, subject, text) => {
    console.log("Sending Email Body:", text);
    console.log("Email Subject:", subject);

    try {
        const info = await transporter.sendMail({
            from: `"Hitesh Kanwar" <hitesh@launchtrade.ai>`,  // use template literal
            to,
            subject,
            text,
        });

        console.log("Message sent: %s", info.messageId);
        return { success: true };
    } catch (error) {
        console.error("Email sending error:", error);
        return { success: false };
    }
};


module.exports = sendEmail;
