const { Connection, PublicKey, Keypair } = require("@solana/web3.js");
const { Metaplex, keypairIdentity } = require("@metaplex-foundation/js");
const { awsStorage, bundlrStorage } = require("@metaplex-foundation/js"); // REMOVE bundlrStorage IF NOT USING

require("dotenv").config();

// ✅ Initialize Solana Connection
const connection = new Connection(process.env.SOLANA_RPC_URL, "confirmed");

// ✅ Load Wallet from `.env`
const secretKeyArray = JSON.parse(process.env.SOLANA_SECRET_KEY);
const payer = Keypair.fromSecretKey(new Uint8Array(secretKeyArray));

// ✅ Initialize Metaplex (Without Bundlr)
const metaplex = Metaplex.make(connection).use(keypairIdentity(payer));

console.log("✅ Signer Public Key:", payer.publicKey.toBase58());

async function registerTokenMetadata(mintAddress, metadataUri, name, symbol) {
    try {
        console.log("🔹 Registering Metadata on Solana...");

        const mint = new PublicKey(mintAddress);

        // ✅ Create Metadata Account
        const { response } = await metaplex.nfts().create({
            name,
            symbol,
            uri: "https://yuvasoft.mypinata.cloud/ipfs/QmQYHzkMdAx3oGZMeLLSpGAxD5gPr68qCHkNgjJN6WyY3a", // ✅ Use IPFS URL from Pinata
            sellerFeeBasisPoints: 0, // No royalties
            mintAddress: mint,
            updateAuthority: payer,
            isMutable: true,  // ✅ Ensure metadata can be updated
        });

        if (!response.signature) {
            throw new Error("Transaction signature missing!");
        }

        console.log(`✅ Metadata successfully registered on Solana!`);
        console.log(`🔗 View Transaction: https://explorer.solana.com/tx/${response.signature}?cluster=devnet`);

    } catch (error) {
        console.error("❌ Error registering metadata:", error);
        throw new Error("Metadata registration failed");
    }
}

module.exports = { registerTokenMetadata };