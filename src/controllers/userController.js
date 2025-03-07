const User = require("../models/User");

exports.createUser = async (req, res) => {
    try {
        const { wallet_address } = req.body;
        const newUser = await User.create({ wallet_address });
        res.status(201).json({ success: true, data: newUser });
    } catch (error) {
        console.error("❌ Error creating user:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
