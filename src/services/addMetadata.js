const { Connection, PublicKey, Keypair } = require("@solana/web3.js");
const { Metaplex, keypairIdentity } = require("@metaplex-foundation/js");

require("dotenv").config();

// Initialize Solana Connection
const connection = new Connection(process.env.SOLANA_RPC_URL, "confirmed");

// Load Wallet from `.env`
const secretKeyArray = JSON.parse(process.env.SOLANA_SECRET_KEY);
const payer = Keypair.fromSecretKey(new Uint8Array(secretKeyArray));

// Initialize Metaplex Instance
const metaplex = Metaplex.make(connection).use(keypairIdentity(payer));

console.log("Signer Public Key:", payer.publicKey.toBase58());

async function registerTokenMetadata(mintAddress, metadataUri, name, symbol) {
  try {
    console.log("🔹 Registering Metadata on Solana...");

    const mint = new PublicKey(mintAddress);

    // Create Metadata Account
    const { signature } = await metaplex.nfts().create({
      name: name,
      symbol: symbol,
      uri: metadataUri, // Use IPFS URL from Pinata
      sellerFeeBasisPoints: 0, // No royalties
      mintAddress: mint,
      updateAuthority: payer, // Ensure the payer is the update authority
    });

    console.log(`Metadata successfully registered on Solana!`);
    console.log(`🔗 View Transaction: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
  } catch (error) {
    console.error("Error registering metadata:", error);
    throw new Error("Metadata registration failed");
  }
}

module.exports = { registerTokenMetadata };
