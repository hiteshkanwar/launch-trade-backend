const {
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
    sendAndConfirmTransaction,
    Transaction
} = require("@solana/web3.js");

const {
    Metaplex,
    keypairIdentity
} = require("@metaplex-foundation/js");
const axios = require("axios");
const FormData = require("form-data");

const {
    createCreateMetadataAccountV3Instruction
} = require("@metaplex-foundation/mpl-token-metadata");

const {
    createMint,
    getOrCreateAssociatedTokenAccount,
    mintTo
} = require("@solana/spl-token");

const Token = require("../models/Token");
const User = require("../models/User");

require("dotenv").config();

const METAPLEX_METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

const connection = new Connection(process.env.SOLANA_RPC_URL, "confirmed");
const adminSecretKey = Uint8Array.from(JSON.parse(process.env.SOLANA_SECRET_KEY));
const adminKeypair = Keypair.fromSecretKey(adminSecretKey);

// ✅ Initialize Metaplex without BundlrStorage
const metaplex = Metaplex.make(connection)
    .use(keypairIdentity(adminKeypair));

const STATIC_IMAGE_URL = "https://arweave.net/abcdef1234567890"; // Replace with your actual hosted image

const uploadToPinata = async (metadata, base64Image) => {
    try {
        console.log("🔹 Using Pinata API Key:", process.env.PINATA_API_KEY);
        console.log("🔹 Using Pinata Secret Key:", process.env.PINATA_SECRET_KEY ? "Loaded ✅" : "❌ MISSING");

        const formData = new FormData();
        let imageIpfsUrl = metadata.image; // Default to existing URL if no image is provided

        // **Step 1: Upload Image (if provided)**
        if (base64Image) {
            console.log("🟡 Converting Base64 Image to Buffer...");
            const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, ""); // Remove metadata
            const imageBuffer = Buffer.from(base64Data, "base64");

            formData.append("file", imageBuffer, {
                filename: "image.jpg",
                contentType: "image/jpeg",
            });

            const imageResponse = await axios.post(
                "https://api.pinata.cloud/pinning/pinFileToIPFS",
                formData,
                {
                    maxContentLength: Infinity,
                    headers: {
                        "Content-Type": `multipart/form-data; boundary=${formData._boundary}`,
                        "pinata_api_key": process.env.PINATA_API_KEY,
                        "pinata_secret_api_key": process.env.PINATA_SECRET_KEY,
                    },
                }
            );

            imageIpfsUrl = `https://gateway.pinata.cloud/ipfs/${imageResponse.data.IpfsHash}`;
            console.log("✅ Image Uploaded Successfully:", imageIpfsUrl);
        }

        // **Step 2: Upload Metadata JSON**
        metadata.image = imageIpfsUrl; // Replace the image field with the uploaded IPFS URL
        const metadataBuffer = Buffer.from(JSON.stringify(metadata));

        const metadataForm = new FormData();
        metadataForm.append("file", metadataBuffer, {
            filename: "metadata.json",
            contentType: "application/json",
        });

        const metadataResponse = await axios.post(
            "https://api.pinata.cloud/pinning/pinFileToIPFS",
            metadataForm,
            {
                maxContentLength: Infinity,
                headers: {
                    "Content-Type": `multipart/form-data; boundary=${metadataForm._boundary}`,
                    "pinata_api_key": process.env.PINATA_API_KEY,
                    "pinata_secret_api_key": process.env.PINATA_SECRET_KEY,
                },
            }
        );

        const metadataIpfsUrl = `https://gateway.pinata.cloud/ipfs/${metadataResponse.data.IpfsHash}`;
        console.log("✅ Metadata Uploaded Successfully:", metadataIpfsUrl);

        return metadataIpfsUrl;
    } catch (error) {
        console.error("❌ Pinata Upload Failed:", error.response?.data || error.message);
        throw new Error("Metadata upload failed!");
    }
};



exports.createToken = async (req, res) => {
    try {
        const { user_wallet, name, symbol, supply, description, txSignature, image } = req.body;

        if (!user_wallet) {
            return res.status(400).json({ success: false, message: "User wallet address is required" });
        }

        console.log(" User Wallet Address:", user_wallet);
        const userPublicKey = new PublicKey(user_wallet);

        console.log("🔹 Verifying Transaction Signature:", txSignature);
        const transactionStatus = await connection.getTransaction(txSignature, { commitment: "confirmed" });

        if (!transactionStatus || !transactionStatus.meta || transactionStatus.meta.err) {
            return res.status(400).json({ success: false, message: "Payment verification failed!" });
        }

        console.log(" Payment Verified. Proceeding with token creation...");

        //  Declare metadataUri outside to ensure it is always accessible
        let metadataUri = "";

        try {
            const metadata = {
                name,
                symbol,
                description,
                image: image || STATIC_IMAGE_URL,
                attributes: [{ trait_type: "Category", value: "Meme Coin" }]
            };

            console.log("🟡 Metadata JSON Before Upload:", JSON.stringify(metadata, null, 2));

            metadataUri = await uploadToPinata(metadata, image); // Pass the base64 image
            console.log(" Metadata Uploaded Successfully:", metadataUri);

        } catch (error) {
            console.error("❌ Metadata Upload Failed:", error);
            return res.status(500).json({ success: false, message: "Metadata upload failed!" });
        }

        //  Now metadataUri will always exist before this line
        console.log(" Metadata Uploaded:", metadataUri);

        // **Step 2: Create Token Mint**
        const mint = await createMint(connection, adminKeypair, adminKeypair.publicKey, null, 9);

        // **Step 3: Create Associated Token Account for User**
        console.log("🔹 Creating User Token Account...");
        const userTokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            adminKeypair,
            mint,
            userPublicKey
        );

        // **Step 4: Mint Tokens to User**
        console.log("🔹 Minting Tokens...");
        await mintTo(
            connection,
            adminKeypair,
            mint,
            userTokenAccount.address,
            adminKeypair.publicKey,
            supply * 10 ** 9
        );

        // **Step 5: Attach Metadata to Token**
        const metadataPDA = PublicKey.findProgramAddressSync(
            [
                Buffer.from("metadata"),
                METAPLEX_METADATA_PROGRAM_ID.toBuffer(),
                mint.toBuffer(),
            ],
            METAPLEX_METADATA_PROGRAM_ID
        )[0];

        console.log("🔹 Attaching Metadata to Token...");
        const metadataTransaction = new Transaction().add(
            createCreateMetadataAccountV3Instruction(
                {
                    metadata: metadataPDA,
                    mint: mint,
                    mintAuthority: adminKeypair.publicKey,
                    payer: adminKeypair.publicKey,
                    updateAuthority: adminKeypair.publicKey,
                },
                {
                    createMetadataAccountArgsV3: {
                        data: {
                            name,
                            symbol,
                            uri: metadataUri, //  Now metadataUri exists
                            sellerFeeBasisPoints: 0, // No royalties
                            creators: null,
                            uses: null,
                            collection: null,
                        },
                        isMutable: true,
                        collectionDetails: null,
                    },
                }
            )
        );

        await sendAndConfirmTransaction(connection, metadataTransaction, [adminKeypair]);

        console.log(" Token Metadata Attached Successfully");

        // **Step 6: Save User & Token Data in Database**
        try {
            // Find or create the user in the database
            let [user, created] = await User.findOrCreate({
                where: { wallet_address: user_wallet },
                defaults: {}
            });

            console.log(`🔹 User ${created ? "created" : "found"} in database.`);

            // Save token details in the database
            const newToken = await Token.create({
                user_id: user.id,
                name,
                symbol,
                supply,
                description,
                image_url: metadataUri,
                mint_address: mint.toBase58(),
                commission_paid: false,
                commission_amount: 0,
                auto_liquidity: false,
                dex_url: ""
            });

            console.log(" Token Saved to Database:", newToken.id);

        } catch (dbError) {
            console.error(" Database Save Failed:", dbError);
            return res.status(500).json({ success: false, message: "Failed to save token to database!" });
        }

        res.status(200).json({
            success: true,
            mintAddress: mint.toBase58(),
            metadataUrl: metadataUri,
            tokenAccount: userTokenAccount.address.toBase58(),
        });

    } catch (error) {
        console.error("❌ Error creating token:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

