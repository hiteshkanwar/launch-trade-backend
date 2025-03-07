const fs = require("fs");
const { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL, SystemProgram, Transaction, sendAndConfirmTransaction } = require("@solana/web3.js");
const {
    createMint,
    getOrCreateAssociatedTokenAccount,
    mintTo,
    TOKEN_PROGRAM_ID
} = require("@solana/spl-token");
const Token = require("../models/Token");
const User = require("../models/User");
const { createRaydiumPool, addLiquidity, listOnRaydium } = require("../services/raydiumService");
const { registerTokenMetadata } = require("../services/registerMetadata");

const { uploadMetadataToIPFS } = require("../services/ipfsService");
require("dotenv").config();

const connection = new Connection(process.env.SOLANA_RPC_URL, "confirmed");
const secretKey = Uint8Array.from(JSON.parse(process.env.SOLANA_SECRET_KEY));
const payer = Keypair.fromSecretKey(secretKey);
const COMMISSION_WALLET = new PublicKey(process.env.COMMISION_WALLET);
// const BASE_FEE_SOL = 0.015 * LAMPORTS_PER_SOL; // Base fee for token creation
const BASE_FEE_SOL = 0 * LAMPORTS_PER_SOL; // Base fee for token creation

const RAYDIUM_LISTING_FEE = 0.02 * LAMPORTS_PER_SOL; // Fee for auto-listing on Raydium

exports.createToken = async (req, res) => {
    try {
        const { user_id, name, symbol, supply, description, autoLiquidity, liquiditySOL, liquidityTokens, wallet_address } = req.body;
        const image = req.file ? req.file.filename : null;
        const solLiquidity = parseFloat(liquiditySOL) * LAMPORTS_PER_SOL;
        const tokenLiquidity = parseFloat(liquidityTokens) * 10 ** 9;

        console.log("🔹 Validating User...");
        let user = await User.findOne({ where: { wallet_address } });
        if (!user) {
            user = await User.create({ wallet_address });
        }

        console.log("🔹 Creating new token on Solana...");

        // **Step 1: Collect Fees**
        let totalFee = BASE_FEE_SOL;
        if (autoLiquidity) {
            totalFee += RAYDIUM_LISTING_FEE;
        }

        const transferTransaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: payer.publicKey,
                toPubkey: COMMISSION_WALLET,
                lamports: totalFee,
            })
        );
        await sendAndConfirmTransaction(connection, transferTransaction, [payer]);
        console.log(`✅ Commission of ${totalFee / LAMPORTS_PER_SOL} SOL sent to ${COMMISSION_WALLET.toBase58()}`);

        // **Step 2: Create Token Mint**
        const mint = await createMint(connection, payer, payer.publicKey, payer.publicKey, 9);
        console.log(`✅ Mint Address: ${mint.toBase58()}`);

        // **Step 3: Create Token Account**
        const tokenAccount = await getOrCreateAssociatedTokenAccount(connection, payer, mint, payer.publicKey);
        console.log(`✅ Token Account Address: ${tokenAccount.address.toBase58()}`);

        // **Step 4: Mint Tokens**
        await mintTo(connection, payer, mint, tokenAccount.address, payer.publicKey, supply * 10 ** 9);
        console.log("✅ Tokens Minted!");

        // **Step 5: Upload Metadata to IPFS**
        console.log("🔹 Uploading Metadata to IPFS...");
        const metadataUrl = await uploadMetadataToIPFS({ name, symbol, description, image: req.file?.ipfsUrl });
        console.log(`✅ Metadata Uploaded: ${metadataUrl}`);

       // **Step 6: Register Metadata on Solana**
        console.log('🔹 Registering Metadata on Solana...');
        await registerTokenMetadata(mint.toBase58(), metadataUrl, name, symbol);
        console.log('✅ Metadata successfully registered on Solana!');

        let dexUrl = null;
        // **Step 6: Auto Liquidity & Listing if Enabled**
        if (autoLiquidity) {
            console.log("🔹 Adding Custom Liquidity & Listing on Raydium...");
            await createRaydiumPool(mint);
            await addLiquidity(mint, tokenLiquidity, solLiquidity);
            await listOnRaydium(mint);
            dexUrl = `https://raydium.io/token/${mint.toBase58()}`;
            console.log(`✅ Token Listed on Raydium: ${dexUrl}`);
        }
        console.log(22222, user)
        // **Step 7: Save Token in Database**
        const newToken = await Token.create({
            user_id: user.id,
            name,
            symbol,
            supply,
            description,
            image_url: image ? `/uploads/${image}` : null,
            mint_address: mint.toBase58(),
            commission_paid: true,
            commission_amount: totalFee / LAMPORTS_PER_SOL,
            auto_liquidity: autoLiquidity || false,
            dex_url: dexUrl
        });

        res.status(201).json({
            success: true,
            message: autoLiquidity ? "Token Created & Listed on Raydium" : "Token Created Successfully",
            data: newToken
        });

    } catch (error) {
        console.error("❌ Error creating token:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
