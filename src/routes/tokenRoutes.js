const express = require("express");
const { upload, uploadToIPFS } = require("../middleware/uploadMiddleware");
const { createToken } = require("../controllers/tokenController");

console.log("Upload Middleware:", upload); // Debugging

const router = express.Router();

router.post("/create", upload.single("image"), uploadToIPFS, createToken);

module.exports = router;
