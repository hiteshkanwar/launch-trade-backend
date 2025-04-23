require('dotenv').config();
const { Op } = require("sequelize"); // Add at the top if not already
const {
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
    sendAndConfirmTransaction,
    Transaction,
    LAMPORTS_PER_SOL
} = require("@solana/web3.js");
const {
    Metaplex,
    keypairIdentity
} = require("@metaplex-foundation/js");
const {
    createCreateMetadataAccountV3Instruction
} = require("@metaplex-foundation/mpl-token-metadata");
const {
    createMint,
    getOrCreateAssociatedTokenAccount,
    mintTo
} = require("@solana/spl-token");
const axios = require("axios");
const FormData = require("form-data");
const BN = require("bn.js");


const Token = require("../models/Token");
const User = require("../models/User");
// const {
//     createSerumMarket,
//     createRaydiumPool,
//     addLiquidity
// } = require("../services/raydiumService");
// const { fetchRaydiumPoolInfo } = require("../utils/fetchRaydiumPoolInfo");
const { isBotRequest } = require("../utils/antiBotProtections");
const verifyPayment = require("../utils/verifyPayment");
//  const { createOrcaClassicPool } = require("../services/orcaClassicPoolService");
// const { createWhirlpoolAndAddLiquidity } = require("../services/orcaWhirlpoolService");
// const { createSplashPoolWrapper } = require("../services/orcaSplashService");
// const { addLiquidityToSplashPool } = require("../services/orcaAddLiquidityService");
// const { openFullRangeLiquidity } = require("../services/openFullRangeLiquidity");
const { createMeteoraPool } = require("../services/meteoraService");


const METAPLEX_METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

const connection = new Connection(process.env.SOLANA_RPC_URL, "confirmed");
const adminSecretKey = Uint8Array.from(JSON.parse(process.env.SOLANA_SECRET_KEY));
const adminKeypair = Keypair.fromSecretKey(adminSecretKey);
const COMMISSION_WALLET = new PublicKey(process.env.COMMISSION_WALLET);
const ADMIN_WALLET = new PublicKey(process.env.ADMIN_WALLET);
const IS_DEV = process.env.NODE_ENV !== "production";
const MIN_SOL = IS_DEV ? 0.0001 : 0.1;
const MIN_TOKENS = IS_DEV ? 10 : 100;

const metaplex = Metaplex.make(connection).use(keypairIdentity(adminKeypair));


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

exports.getTokensByWallet = async (req, res) => {
    try {
      const wallet = req.params.wallet;
  
      const user = await User.findOne({ where: { wallet_address: wallet } });
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found." });
      }
  
      const tokens = await Token.findAll({
        where: { user_id: user.id },
        order: [["createdAt", "DESC"]],
      });
  
      if (tokens.length === 0) {
        return res.status(200).json({ success: true, tokens: [], message: "No tokens found for this wallet." });
      }
  
      res.status(200).json({ success: true, tokens });
    } catch (error) {
      console.error("❌ Error fetching tokens:", error);
      res.status(500).json({ success: false, message: "Failed to fetch tokens." });
    }
  };
  

// Enhanced Token Creation Controller - Supports Standard & Advanced Plans
exports.createToken = async (req, res) => {
    try {
        const {
            autoLiquidity,
            planType,
            user_wallet,
            liquiditySOL,
            liquidityTokens,
            name,
            symbol,
            supply,
            description,
            txSignature,
            image,
            mintable
        } = req.body;

        const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
        let txId = null;
        let poolAddress = null;

        console.log("📥 liquidityTokens (raw):", liquidityTokens);
        console.log("📥 liquiditySOL (raw):", liquiditySOL);

         // let liquiditySig = null;
         const tokenFloat = parseFloat(liquidityTokens);
         const solFloat = parseFloat(liquiditySOL);
 
         console.log("🔎 Parsed liquidityTokens (float):", tokenFloat);
         console.log("🔎 Parsed liquiditySOL (float):", solFloat);
 
 
         const initialPrice = solFloat / tokenFloat;
         console.log("📈 initialPrice:", initialPrice);

        if (await isBotRequest(user_wallet, ip)) {
            return res.status(429).json({ success: false, message: "⛔ Too many requests. Please slow down." });
        }

        const validPlans = ["basic", "standard", "advanced"];
        if (!validPlans.includes(planType)) {
            return res.status(400).json({ success: false, message: "Invalid plan type." });
        }

        if (planType === "standard" && (!liquiditySOL || !liquidityTokens)) {
            return res.status(400).json({ success: false, message: "Standard plan requires SOL and token liquidity." });
        }

        if (supply < MIN_TOKENS) {
            return res.status(400).json({ success: false, message: `Supply must be at least ${MIN_TOKENS}.` });
        }

        const existing = await Token.findOne({ where: { symbol } });
        if (existing) {
            return res.status(400).json({ success: false, message: `Token "${symbol}" already exists.` });
        }

        const userPublicKey = new PublicKey(user_wallet);
        const [user] = await User.findOrCreate({ where: { wallet_address: user_wallet } });

        // 💰 Fee Calculation
        let expectedCommission = 0;
        let expectedAdmin = 0;
        // if (IS_DEV) {
        //     expectedCommission = 0.00035;
        //     expectedAdmin = 0.00015;
        // } else {
        //     const planPricing = {
        //         basic: [0.049, 0.021],
        //         standard: [0.35, 0.15],
        //         advanced: [1.75, 0.75],
        //     };
        //     [expectedCommission, expectedAdmin] = planPricing[planType];
        // }
       
            const planPricing = {
                basic: [0.049, 0.021],
                standard: [0.049, 0.21],
                // standard: [0.35, 0.15],
                advanced: [1.05, 0.45],
            };
        
            [expectedCommission, expectedAdmin] = planPricing[planType];
    

        // ⛔ Payment Verification (Uncomment if needed)
        const isPaymentValid = await verifyPayment(
            connection,
            txSignature,
            user_wallet,
            COMMISSION_WALLET,
            ADMIN_WALLET,
            Math.round(expectedCommission * LAMPORTS_PER_SOL),
            Math.round(expectedAdmin * LAMPORTS_PER_SOL)
          );
          
          if (!isPaymentValid) {
            return res.status(400).json({ success: false, message: "Invalid payment." });
          }
          

        const metadataUri = await uploadToPinata({
            name, symbol, description, image: image || STATIC_IMAGE_URL,
            attributes: [{ trait_type: "Category", value: "Meme Coin" }]
        }, image);

        const freezeAuthority = mintable ? adminKeypair.publicKey : null;
        const mint = await createMint(connection, adminKeypair, adminKeypair.publicKey, freezeAuthority, 9);

        // mint to user account
        const userTokenAccount = await getOrCreateAssociatedTokenAccount(connection, adminKeypair, mint, userPublicKey);
        await mintTo(connection, adminKeypair, mint, userTokenAccount.address, adminKeypair.publicKey, supply * 10 ** 9);

        // // mint to admin
        // const adminTokenAccount = await getOrCreateAssociatedTokenAccount(connection, adminKeypair, mint, adminKeypair.publicKey);
        // console.log("📍 Admin ATA:", adminTokenAccount.address.toBase58());
        // const liquidityAmount = BigInt(tokenFloat * 10 ** 9);
        // await mintTo(connection, adminKeypair, mint, adminTokenAccount.address, adminKeypair.publicKey, liquidityAmount);
  
        // const balance = await connection.getTokenAccountBalance(adminTokenAccount.address);
        // console.log("💰 Admin Token Balance:", balance.value.uiAmountString);

        const metadataPDA = PublicKey.findProgramAddressSync(
            [
              Buffer.from("metadata"),
              METAPLEX_METADATA_PROGRAM_ID.toBuffer(),
              mint.toBuffer()
            ],
            METAPLEX_METADATA_PROGRAM_ID
          )[0];
          
          const metadataTx = new Transaction().add(
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
                    uri: metadataUri, // Must be from Pinata or Arweave!
                    sellerFeeBasisPoints: 0,
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
          
          await sendAndConfirmTransaction(connection, metadataTx, [adminKeypair]);          
        

        const baseMint = mint.toBase58();
        console.log("baseMint",baseMint)
        const quoteMint = process.env.SOL_TOKEN_MINT;
        let tokenAmount = 0;
        let solAmount = 0;
       

        if (initialPrice < 0.0000001) {
            return res.status(400).json({ success: false, message: "Price too low. Adjust SOL/token ratio." });
        }
          
        // ✅ Standard Plan - Immediate Liquidity
        if (autoLiquidity && planType != 'basic')
        {
                        // 🧠 Shared Logic for Standard & Advanced: Mint to correct ATA
            const baseMintPk = new PublicKey(baseMint);
            const quoteMintPk = new PublicKey(process.env.SOL_TOKEN_MINT);

            const [mintA, mintB] = [baseMintPk, quoteMintPk].sort((a, b) =>
            a.toBase58().localeCompare(b.toBase58())
            );

            const isTokenA = baseMintPk.equals(mintA);
            const ataA = await getOrCreateAssociatedTokenAccount(connection, adminKeypair, mintA, adminKeypair.publicKey);
            const ataB = await getOrCreateAssociatedTokenAccount(connection, adminKeypair, mintB, adminKeypair.publicKey);

            const mintToATA = isTokenA ? ataA.address : ataB.address;
            const liquidityAmount = BigInt(tokenFloat * 10 ** 9); // Token amount for liquidity

            console.log(`🎯 Minting liquidity tokens to ATA of ${isTokenA ? "Token A" : "Token B"}: ${mintToATA.toBase58()}`);

            await mintTo(
            connection,
            adminKeypair,
            baseMintPk,
            mintToATA,
            adminKeypair,
            liquidityAmount
            );

        }

        if (autoLiquidity && planType === "standard") {
            tokenAmount = parseFloat(liquidityTokens) * 10 ** 9;
            solAmount = parseFloat(liquiditySOL) * LAMPORTS_PER_SOL;
            // meteora pool
            const { txId: createdTxId, poolAddress: createdPoolAddress } = await createMeteoraPool({
                tokenMintA: baseMint,
                tokenMintB: process.env.SOL_TOKEN_MINT,
                amountA: new BN(Math.floor(tokenFloat * 1e9)), // tokens with 9 decimals
                amountB: new BN(Math.floor(solFloat * LAMPORTS_PER_SOL)) // SOL in lamports
              });
            txId = createdTxId;
            poolAddress = createdPoolAddress;
                                    
              
            
        }

        // ⏳ Advanced Plan - Delayed Liquidity
        if (autoLiquidity && planType === "advanced") {
           
            tokenAmount = parseFloat(liquidityTokens) * 10 ** 9;
            solAmount = parseFloat(liquiditySOL) * LAMPORTS_PER_SOL;
            
            await Token.create({
              user_id: user.id,
              name, symbol, supply, description, mintable,
              image_url: metadataUri,
              mint_address: baseMint,
              commission_paid: true, commission_amount: expectedCommission,
              admin_paid: true, admin_amount: expectedAdmin,
              total_fee_paid_by_user: expectedCommission + expectedAdmin,
              payment_signature: txSignature,
              auto_liquidity: true,
              dex_url: `https://birdeye.so/token/${baseMint}?chain=solana`,
              jupiter_url: `https://jup.ag/swap?inputMint=${baseMint}&outputMint=${quoteMint}`,
              meteora_url: null,
              initial_liquidity_token: tokenAmount,
              initial_liquidity_sol: solAmount,
              liquidity_added: false,
              cooldown_applied: true,
              cooldown_timestamp: new Date()
            });
            

            const cooldownTime = 5 * 60 * 1000; // 5 minutes

            setTimeout(async () => {
              try {
                const { txId, poolAddress } = await createMeteoraPool({
                  tokenMintA: baseMint,
                  tokenMintB: process.env.SOL_TOKEN_MINT,
                  amountA: new BN(Math.floor(tokenFloat * 1e9)),
                  amountB: new BN(Math.floor(solFloat * LAMPORTS_PER_SOL))
                });
            
                await Token.update({
                  liquidity_added: true,
                  liquidity_added_at: new Date(),
                  meteora_url: `https://app.meteora.ag/pools/${poolAddress}`
                }, { where: { mint_address: baseMint } });
            
                console.log("✅ Advanced Plan: Liquidity added after delay");
              } catch (err) {
                console.error("❌ Advanced Plan Liquidity Failed:", err.message);
              }
            }, cooldownTime);
            
            return res.status(200).json({
                success: true,
                message: "Token created with delayed liquidity (advanced plan).",
                mintAddress: baseMint,
            });
        }

        if (planType !== "advanced") {

            await Token.create({
                user_id: user.id,
                name, symbol, supply, description, mintable,
                image_url: metadataUri,
                mint_address: baseMint,
                commission_paid: true, commission_amount: expectedCommission,
                admin_paid: true, admin_amount: expectedAdmin,
                total_fee_paid_by_user: expectedCommission + expectedAdmin,
                payment_signature: txSignature,
                auto_liquidity: true,
                dex_url: `https://birdeye.so/token/${baseMint}?chain=solana`,
                jupiter_url: `https://jup.ag/swap?inputMint=${baseMint}&outputMint=${quoteMint}`,
                meteora_url: poolAddress ? `https://app.meteora.ag/pools/${poolAddress}` : null,
                initial_liquidity_token: tokenAmount,
                initial_liquidity_sol: solAmount,
                liquidity_added: true
            });
        } 

        return res.status(200).json({
            success: true,
            message: "Token created and listed.",
            mintAddress: baseMint,
            jupiterUrl: `https://jup.ag/swap?inputMint=${baseMint}&outputMint=${quoteMint}`,
            birdeyeUrl: `https://birdeye.so/token/${baseMint}?chain=solana`,
            meteoraUrl: poolAddress ? `https://app.meteora.ag/pools/${poolAddress}` : null
        });

    } catch (error) {
        console.error("❌ Error:", error);
        res.status(500).json({ success: false, message: "Token creation failed." });
    }
};

