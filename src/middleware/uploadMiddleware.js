const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");
require("dotenv").config();

// ✅ Set up Multer storage
const upload = multer({ storage: multer.memoryStorage() });

const uploadToIPFS = async (req, res, next) => {
    try {
        if (!req.file) {
            return next();
        }

        console.log("🔹 Uploading file to IPFS...");

        // ✅ Ensure FormData is set correctly
        const formData = new FormData();
        formData.append("file", req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype,
        });

        const pinataRes = await axios.post(
            "https://api.pinata.cloud/pinning/pinFileToIPFS",
            formData,
            {
                headers: {
                    ...formData.getHeaders(),
                    pinata_api_key: process.env.PINATA_API_KEY,
                    pinata_secret_api_key: process.env.PINATA_SECRET_KEY,
                }
            }
        );

        if (!pinataRes.data.IpfsHash) {
            throw new Error("IPFS upload failed: No IPFS hash returned.");
        }

        // ✅ Store the IPFS URL in request
        req.file.ipfsUrl = `https://gateway.pinata.cloud/ipfs/${pinataRes.data.IpfsHash}`;
        console.log(`✅ File uploaded to IPFS: ${req.file.ipfsUrl}`);

        next();
    } catch (error) {
        console.error("❌ IPFS Upload Failed:", error.response ? error.response.data : error.message);
        return res.status(500).json({ success: false, message: "Failed to upload image to IPFS" });
    }
};

module.exports = { upload, uploadToIPFS };


// const multer = require("multer");
// const axios = require("axios");
// const FormData = require("form-data");

// const upload = multer({ storage: multer.memoryStorage() });

// const uploadToIPFS = async (req, res, next) => {
//     try {
//         if (!req.file) {
//             return next();
//         }

//         const formData = new FormData();
//         formData.append("file", req.file.buffer, req.file.originalname);

//         const pinataRes = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
//             headers: {
//                 "Content-Type": `multipart/form-data; boundary=${formData._boundary}`,
//                 pinata_api_key: process.env.PINATA_API_KEY,
//                 pinata_secret_api_key: process.env.PINATA_SECRET_KEY,
//             }
//         });

//         req.file.ipfsUrl = `https://gateway.pinata.cloud/ipfs/${pinataRes.data.IpfsHash}`;
//         next();
//     } catch (error) {
//         console.error("❌ IPFS Upload Failed:", error);
//         res.status(500).json({ success: false, message: "Failed to upload image to IPFS" });
//     }
// };

// module.exports = { upload, uploadToIPFS };
