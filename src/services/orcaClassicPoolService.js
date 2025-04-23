const { getOrca, OrcaU64 } = require("@orca-so/sdk");
const { PublicKey } = require("@solana/web3.js");

async function createOrcaClassicPool(connection, tokenMintAddress, tokenAmount, solAmount, wallet) {
  const orca = getOrca(connection);

  // ✅ Get SOL and your custom token
  const SOL = orca.getToken("SOL");
  const customToken = new PublicKey(tokenMintAddress);

  // ❌ You can't dynamically create a pool — must be preconfigured!
  // Try to get the pool using known tokens
  let pool;
  try {
    pool = orca.getPool(customToken, SOL);
  } catch (err) {
    throw new Error("❌ Pool for this token pair does not exist on Orca Classic.");
  }

  const userTokenAccount = await pool.getTokenB().getAssociatedTokenAddress(wallet.publicKey);

  const tx = await pool.addLiquidity(
    OrcaU64.fromNumber(solAmount),
    OrcaU64.fromNumber(tokenAmount),
    userTokenAccount,
    0.01 // 1% slippage
  );

  const signature = await tx.buildAndSend(wallet);
  console.log("✅ Orca liquidity added:", signature);
  return signature;
}

module.exports = {
  createOrcaClassicPool,
};
