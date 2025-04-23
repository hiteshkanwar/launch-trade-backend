const { WhirlpoolContext, buildWhirlpoolClient, ORCA_WHIRLPOOLS_CONFIG, PriceMath, TickUtil, PDAUtil } = require("@orca-so/whirlpools-sdk");
const { DecimalUtil, MathUtil } = require("@orca-so/common-sdk");
const { PublicKey } = require("@solana/web3.js");
const { getAssociatedTokenAddress } = require("@solana/spl-token");
const { AnchorProvider } = require("@coral-xyz/anchor");

const WSOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");

async function createWhirlpoolAndAddLiquidity({ connection, payer, tokenMint, tokenAmount, solAmount }) {
  try {
    console.log("🔃 Starting Whirlpool + Liquidity...");

    const provider = new AnchorProvider(connection, {
      publicKey: payer.publicKey,
      signTransaction: payer.signTransaction,
      signAllTransactions: payer.signAllTransactions,
    }, {});

    const ctx = WhirlpoolContext.withProvider(provider, ORCA_WHIRLPOOLS_CONFIG);
    const client = buildWhirlpoolClient(ctx);

    const tickSpacing = 64;
    const inputMint = new PublicKey(tokenMint);
    const wsolMint = WSOL_MINT;

    let tokenMintA, tokenMintB, aToB;
    if (inputMint.toBase58() < wsolMint.toBase58()) {
      tokenMintA = inputMint;
      tokenMintB = wsolMint;
      aToB = true;
    } else {
      tokenMintA = wsolMint;
      tokenMintB = inputMint;
      aToB = false;
    }

    // 🧠 Use aligned center tick (fixes invariant error!)
    const centerTick = TickUtil.getInitializableTickIndex(128, tickSpacing); // not 0!
    const tickLowerIndex = TickUtil.getInitializableTickIndex(centerTick - tickSpacing * 5, tickSpacing);
    const tickUpperIndex = TickUtil.getInitializableTickIndex(centerTick + tickSpacing * 5, tickSpacing);
    const sqrtPriceX64 = PriceMath.tickIndexToSqrtPriceX64(centerTick);
    
    console.log("🧪 sqrtPriceX64:", sqrtPriceX64.toString());
    console.log("📌 Center Tick:", centerTick);
    console.log("📉 Lower Tick:", tickLowerIndex);
    console.log("📈 Upper Tick:", tickUpperIndex);
    
    const poolTx = await client.createPool({
      whirlpoolsConfig: ORCA_WHIRLPOOLS_CONFIG,
      tokenMintA,
      tokenMintB,
      tickSpacing,
      initialSqrtPrice: sqrtPriceX64
    });
    

    const createSig = await poolTx.buildAndExecute();
    console.log("✅ Whirlpool created! Tx:", createSig);

    const { publicKey: whirlpoolAddress } = PDAUtil.getWhirlpool(
      ORCA_WHIRLPOOLS_CONFIG,
      tokenMintA,
      tokenMintB,
      tickSpacing
    );

    const pool = await client.getPool(whirlpoolAddress);
    console.log("✅ Whirlpool fetched:", whirlpoolAddress.toBase58());

    const tokenAccountA = await getAssociatedTokenAddress(pool.getTokenAInfo().mint, payer.publicKey);
    const tokenAccountB = await getAssociatedTokenAddress(pool.getTokenBInfo().mint, payer.publicKey);

    const position = await pool.openPosition({
      tickLowerIndex,
      tickUpperIndex,
      liquidityInput: {
        tokenA: tokenAmount,
        tokenB: solAmount,
      },
      tokenOwnerAccountA: tokenAccountA,
      tokenOwnerAccountB: tokenAccountB,
    });

    const liquiditySig = await position.buildAndExecute();
    console.log("✅ Liquidity added! Tx:", liquiditySig);

    return liquiditySig;

  } catch (err) {
    console.error("❌ Whirlpool Creation Error:", err.message);
    throw err;
  }
}

module.exports = {
  createWhirlpoolAndAddLiquidity
};
