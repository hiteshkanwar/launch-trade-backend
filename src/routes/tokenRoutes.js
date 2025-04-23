const express = require("express");
const { upload, uploadToIPFS } = require("../middleware/uploadMiddleware");
const { createToken, getTokensByWallet } = require("../controllers/tokenController");

console.log("Upload Middleware:", upload); // Debugging

const router = express.Router();

// create token route
router.post("/create", upload.single("image"), uploadToIPFS, createToken);

// ✅ Add this: Get all tokens by user wallet
router.get("/user/:wallet", getTokensByWallet);


module.exports = router;
