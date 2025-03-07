const { Connection, PublicKey, Keypair } = require("@solana/web3.js");
const { Metaplex, keypairIdentity } = require("@metaplex-foundation/js");

require("dotenv").config();

const connection = new Connection(process.env.SOLANA_RPC_URL, "confirmed");
const secretKeyArray = JSON.parse(process.env.SOLANA_SECRET_KEY);
const payer = Keypair.fromSecretKey(new Uint8Array(secretKeyArray));

const metaplex = Metaplex.make(connection).use(keypairIdentity(payer));

console.log("✅ Signer Public Key:", payer.publicKey.toBase58());

async function updateTokenMetadata(mintAddress, newMetadataUri, newName, newSymbol) {
    try {
        console.log("🔹 Updating Metadata on Solana...");

        const mint = new PublicKey(mintAddress);
        
        const nft = await metaplex.nfts().findByMint({ mintAddress: mint });

        if (!nft) {
            throw new Error("NFT not found! Ensure the mint address is correct.");
        }

        const updatedMetadata = {
            name: newName || nft.name,
            symbol: newSymbol || nft.symbol,
            uri: newMetadataUri || nft.uri,
            sellerFeeBasisPoints: nft.sellerFeeBasisPoints, // Preserve existing royalties
            creators: nft.creators || [{ address: payer.publicKey, verified: true, share: 100 }], // Ensure creators exist
        };

        const txResult = await metaplex.nfts().update({
            nftOrSft: nft,
            data: updatedMetadata,
            updateAuthority: payer,
        });

        console.log(`✅ Metadata successfully updated!`);
        console.log(`🔗 View Transaction: https://explorer.solana.com/tx/${txResult.response.signature}?cluster=devnet`);
    } catch (error) {
        console.error("❌ Error updating metadata:", error);
        throw new Error("Metadata update failed");
    }
}

module.exports = { updateTokenMetadata };
