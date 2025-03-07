const axios = require("axios");
const FormData = require("form-data");
require("dotenv").config();

async function uploadMetadataToIPFS({ name, symbol, description, image }) {
    try {
        const metadata = { name, symbol, description };
        const formData = new FormData();

        // ✅ Handle image upload (if provided)
        if (image && image.buffer) {
            formData.append("file", image.buffer, image.filename);
        }

        // ✅ Upload metadata JSON
        const jsonBuffer = Buffer.from(JSON.stringify(metadata), "utf-8");
        formData.append("file", jsonBuffer, { filename: "metadata.json" });

        const response = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
            headers: {
                ...formData.getHeaders(),
                pinata_api_key: process.env.PINATA_API_KEY,
                pinata_secret_api_key: process.env.PINATA_SECRET_KEY,
            }
        });

        console.log("✅ Metadata uploaded to IPFS:", response.data);
        return `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`;
    } catch (error) {
        console.error("❌ Error uploading metadata:", error.response?.data || error.message);
        throw new Error("Metadata upload failed");
    }
}

module.exports = { uploadMetadataToIPFS };
