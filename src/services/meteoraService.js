const { Connection, PublicKey, Keypair } = require("@solana/web3.js");
const { AnchorProvider, Wallet } = require("@project-serum/anchor");
const { getOrCreateAssociatedTokenAccount, mintTo } = require("@solana/spl-token");
const BN = require("bn.js");

const AmmImplModule = require('@meteora-ag/dynamic-amm-sdk');
const AmmImpl = AmmImplModule.AmmImpl;
const { PROGRAM_ID } = AmmImplModule;
const { derivePoolAddressWithConfig } = require('@meteora-ag/dynamic-amm-sdk/dist/cjs/src/amm/utils');

async function createMeteoraPool({ tokenMintA, tokenMintB, amountA, amountB }) {
  const connection = new Connection(process.env.SOLANA_RPC_URL);
  const adminKeypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(process.env.SOLANA_SECRET_KEY))
  );

  const wallet = new Wallet(adminKeypair);
  const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });

  const programId = new PublicKey(PROGRAM_ID);
  const feeConfigKey = new PublicKey("FiENCCbPi3rFh5pW2AJ59HC53yM32eLaCjMKxRqanKFJ");

  const memecoinMint = new PublicKey(tokenMintA);
  const tokenBMint = new PublicKey(tokenMintB);
  const tokenAAmount = new BN(amountA);
  const tokenBAmount = new BN(amountB);

  // Derive pool address for reference
  const poolAddress = derivePoolAddressWithConfig(memecoinMint, tokenBMint, feeConfigKey, programId);
  console.log("🌊 Pool address will be:", poolAddress.toBase58());

  // Mint liquidity tokens to admin ATA
  // recently commented
  const [mintA, mintB] = [memecoinMint, tokenBMint].sort((a, b) =>
    a.toBase58().localeCompare(b.toBase58())
  );
  // const mintA = new PublicKey(memecoinMint); // Your token (should be base)
  // const mintB = new PublicKey(tokenBMint);   // SOL or USDC (quote)

  const baseMint = mintA;
  const quoteMint = mintB;

  const isTokenA = memecoinMint.equals(baseMint);

  const ataA = await getOrCreateAssociatedTokenAccount(
    connection,
    adminKeypair,            // payer
    baseMint,
    adminKeypair.publicKey   // owner
  );

  const ataB = await getOrCreateAssociatedTokenAccount(
    connection,
    adminKeypair,
    quoteMint,
    adminKeypair.publicKey
  );

  const mintToATA = isTokenA ? ataA.address : ataB.address;
  const mintAmount = isTokenA ? tokenAAmount : tokenBAmount;

  console.log(`Minting liquidity tokens to ATA of ${isTokenA ? "Token A" : "Token B"}: ${mintToATA.toBase58()}`);

  await mintTo(
    connection,
    adminKeypair,           // payer
    memecoinMint,
    mintToATA,              // recipient ATA
    adminKeypair,           // mint authority
    isTokenA ? amountA : new BN(0) // only mint tokens, not SOL (handled with LAMPORTS already)
  );

  // Create pool
  const transactions = await AmmImpl.createPermissionlessConstantProductMemecoinPoolWithConfig(
    connection,
    adminKeypair.publicKey,     // payer
    memecoinMint,
    tokenBMint,
    tokenAAmount,
    tokenBAmount,
    feeConfigKey,
    { isMinted: true }
  );

  for (const tx of transactions) {
    const txId = await provider.sendAndConfirm(tx, [adminKeypair]);
    console.log("TX sent:", txId);
  }

  return {
    txId: "confirmed",
    poolAddress: poolAddress.toBase58(),
    tradeUrl: `https://meteora.ag/token/${memecoinMint.toBase58()}`
  };
}

module.exports = {
  createMeteoraPool,
};
