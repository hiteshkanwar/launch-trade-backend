// controllers/contactController.js
const sendEmail = require('../utils/email');  // Import the email utility

exports.handleContactForm = async (req, res) => {
    try {
        const { email, phone, description } = req.body;
        // Validate input (optional, you can use a validation library)
        if (!email || !phone || !description) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        // Send email notification to the admin (you can customize the subject and body)
        await sendEmail(
            process.env.ADMIN_SENDGRID_EMAIL,  // Admin's email address
            `New Contact Form Submission: ${email}`,
            `New message from ${email}\nPhone: ${phone}\nDescription: ${description}`
        );

        // Optionally, save the message to the database (if you have the model set up)
        // await Contact.create({ email, phone, description });

        return res.status(200).json({ success: true, message: 'Message sent successfully!' });
    } catch (error) {
        console.error("Error processing contact form:", error);
        return res.status(500).json({ success: false, message: 'Failed to send message.' });
    }
};
