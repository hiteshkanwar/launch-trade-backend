const {
  WhirlpoolContext,
  ORCA_WHIRLPOOL_PROGRAM_ID,
  buildWhirlpoolClient,
  PriceMath,
  TickUtil,
  increaseLiquidityQuoteByInputToken,
  increaseLiquidityQuoteByTokenAmounts,
} = require("@orca-so/whirlpools-sdk");
const BN = require("bn.js");
const { Percentage } = require("@orca-so/common-sdk");
const { PublicKey, Connection } = require("@solana/web3.js");
const { AnchorProvider, Wallet } = require("@coral-xyz/anchor");
const { Decimal } = require("decimal.js");

/**
 * Add liquidity to an existing Splash Pool
 */
async function addLiquidityToSplashPool({
  rpcUrl,
  payer,
  whirlpoolAddress,
  tokenMintA,
  tokenMintB,
  tokenAmount,
  solAmount
}) {
  try {
    console.log("🔄 Adding liquidity using openPosition...");
    console.log("token amount as paramter",tokenAmount)
    console.log("sol amount as paramter",solAmount)
    console.log(333, typeof increaseLiquidityQuoteByTokenAmounts); // should log: function


    const connection = new Connection(rpcUrl, "confirmed");
    const wallet = new Wallet(payer);
    const provider = new AnchorProvider(connection, wallet, {});
    const ctx = WhirlpoolContext.withProvider(provider, ORCA_WHIRLPOOL_PROGRAM_ID);
    const client = buildWhirlpoolClient(ctx);

    const whirlpoolPubkey = new PublicKey(whirlpoolAddress);
    const pool = await client.getPool(whirlpoolPubkey);
    const poolData = pool.getData();

    const tokenAInfo = pool.getTokenAInfo();
    const tokenBInfo = pool.getTokenBInfo();

    const tokenADecimals = tokenAInfo.decimals;
    const tokenBDecimals = tokenBInfo.decimals;

    const tickLower = TickUtil.getInitializableTickIndex(
      PriceMath.priceToTickIndex(new Decimal(98), tokenADecimals, tokenBDecimals),
      poolData.tickSpacing
    );
    const tickUpper = TickUtil.getInitializableTickIndex(
      PriceMath.priceToTickIndex(new Decimal(150), tokenADecimals, tokenBDecimals),
      poolData.tickSpacing
    );

    const slippageTolerance = Percentage.fromFraction(1, 100); // 1%

    console.log("✅ Pool Info:");
    console.log("Available pool methods:", Object.keys(pool));

    console.log("tokenA mint:", tokenAInfo.mint.toBase58(), "decimals:", tokenADecimals);
    console.log("tokenB mint:", tokenBInfo.mint.toBase58(), "decimals:", tokenBDecimals);
    console.log("tickLower:", tickLower.toString());
    console.log("tickUpper:", tickUpper.toString());
    console.log("slippageTolerance:", slippageTolerance.toString());

    // Convert input to Decimal
    const inputTokenAmount = new Decimal(tokenAmount);
    const inputSolAmount = new Decimal(solAmount);

    const wsolMint = "So11111111111111111111111111111111111111112";

    let quoteTokenMint;
    let quoteAmount;

    // Decide if WSOL is tokenA or tokenB in the actual pool
    // const isTokenA_WSOL = tokenAInfo.mint.toBase58() === wsolMint;
    // const isTokenB_WSOL = tokenBInfo.mint.toBase58() === wsolMint;

    // if (isTokenA_WSOL) {
    //   // WSOL is tokenA, use custom token for quote
    //   quoteTokenMint = tokenBInfo.mint;
    //   quoteAmount = new Decimal(tokenAmount).mul(10 ** tokenBInfo.decimals);
    //   console.log("Quote with custom token:", quoteTokenMint.toBase58(), quoteAmount.toString());
    // } else {
    //   // WSOL is tokenB, use custom token for quote
    //   quoteTokenMint = tokenAInfo.mint;
    //   quoteAmount = new Decimal(tokenAmount).mul(10 ** tokenAInfo.decimals);
    //   console.log("Quote with custom token:", quoteTokenMint.toBase58(), quoteAmount.toString());
    // }




    // console.log("🧮 Using quote token:", quoteTokenMint.toBase58());
    // console.log("Quote amount:", quoteAmount.toString());

    // //Get quote
    // let quote = increaseLiquidityQuoteByInputToken(
    //   quoteTokenMint,
    //   quoteAmount,
    //   tickLower,
    //   tickUpper,
    //   slippageTolerance,
    //   pool
    // );

    // console.log("💧 Quote details:", quote);

    const isWSOLTokenA = tokenAInfo.mint.toBase58() === "So11111111111111111111111111111111111111112";

    // Always use the non-WSOL token for quoting
   // Use tokenA for quote always since that's what Orca prefers for accurate estimation
    const quoteTokenInfo = tokenAInfo; // tokenA of the pool
    const rawAmount = isWSOLTokenA
      ? new Decimal(solAmount).mul(new Decimal(10).pow(tokenADecimals))
      : new Decimal(tokenAmount).mul(new Decimal(10).pow(tokenADecimals));

    console.log("🧮 Quoting with tokenA:", quoteTokenInfo.mint.toBase58());
    console.log("Quote amount (raw):", rawAmount.toString());

    const quote = increaseLiquidityQuoteByInputToken(
      quoteTokenInfo.mint,
      rawAmount,
      tickLower,
      tickUpper,
      slippageTolerance,
      pool
    );

    
    console.log("💧 Quote details:", {
      liquidityAmount: quote.liquidityAmount.toString(),
      tokenMaxA: quote.tokenMaxA.toString(),
      tokenMaxB: quote.tokenMaxB.toString()
    });

    
    console.log("💧 Quote details:", quote);



    const { positionMint, tx } = await pool.openPosition(tickLower, tickUpper, quote);
    const txId = await tx.buildAndExecute();

    console.log("✅ Liquidity added!");
    console.log("🔗 Transaction ID:", txId);
    console.log("🪙 Position Mint:", positionMint.toBase58());

    return {
      txId,
      positionMint: positionMint.toBase58(),
    };
  } catch (err) {
    console.error("❌ Add liquidity failed:", err.message);
    throw err;
  }
}

module.exports = {
  addLiquidityToSplashPool,
};

// const {
//   WhirlpoolContext,
//   ORCA_WHIRLPOOL_PROGRAM_ID,
//   buildWhirlpoolClient,
//   PriceMath,
//   TickUtil,
//   PDAUtil,
//   increaseLiquidityQuoteByInputToken,
// } = require("@orca-so/whirlpools-sdk");
// const { Percentage } = require('@orca-so/common-sdk');

// const { PublicKey, Connection } = require("@solana/web3.js");
// const { AnchorProvider, Wallet } = require("@coral-xyz/anchor");
// const { Decimal } = require("decimal.js");

// /**
//  * Add liquidity to an existing Splash Pool
//  * @param {Object} params
//  * @param {string} params.rpcUrl - Solana RPC endpoint
//  * @param {Keypair} params.payer - Solana wallet keypair
//  * @param {string} params.whirlpoolAddress - Whirlpool pool address
//  * @param {string} params.tokenMintA - Token A mint address
//  * @param {string} params.tokenMintB - Token B mint address
//  * @param {number} params.tokenAmount - Amount of token A to provide
//  * @param {number} params.solAmount - Amount of token B (usually SOL)
//  * @returns {Promise<{txId: string, positionMint: string}>}
//  */
// async function addLiquidityToSplashPool({
//   rpcUrl,
//   payer,
//   whirlpoolAddress,
//   tokenMintA,
//   tokenMintB,
//   tokenAmount = 100.0,
//   solAmount = 0.001
// }) {
//   try {
//     console.log("🔄 Adding liquidity using openPosition...");

//     const connection = new Connection(rpcUrl, "confirmed");
//     const wallet = new Wallet(payer);
//     const provider = new AnchorProvider(connection, wallet, {});
//     const ctx = WhirlpoolContext.withProvider(provider, ORCA_WHIRLPOOL_PROGRAM_ID);
//     const client = buildWhirlpoolClient(ctx);

//     const whirlpoolPubkey = new PublicKey(whirlpoolAddress);
//     const pool = await client.getPool(whirlpoolPubkey);
//     const poolData = pool.getData();

//     const tokenAInfo = pool.getTokenAInfo();
//     const tokenBInfo = pool.getTokenBInfo();

//     console.log("tokenAInfo", tokenAInfo.mint);

//     const tokenADecimal = tokenAInfo.decimals;
//     const tokenBDecimal = tokenBInfo.decimals;
//     // const tickSpacing = poolData.tickSpacing;

//     // Define price range around initial tick
//     // const centerPrice = new Decimal(1); // Fair midpoint
//     // const baseTick = PriceMath.priceToTickIndex(centerPrice, decimalsA, decimalsB);
//     // const tickLower = TickUtil.getInitializableTickIndex(baseTick - tickSpacing, tickSpacing);
//     // const tickUpper = TickUtil.getInitializableTickIndex(baseTick + tickSpacing, tickSpacing);

//     // console.log("tokenMintA", tokenAInfo.mint.toBase58());
//     // console.log("tokenMintB", tokenBInfo.mint.toBase58());
//     // console.log("lowerTick", tickLower);
//     // console.log("upperTick", tickUpper);
//     // console.log("Percentage.fromFraction(1, 100)",Percentage.fromFraction(1, 100))

//     const tickLower = TickUtil.getInitializableTickIndex(
//       PriceMath.priceToTickIndex(new Decimal(98), tokenADecimal, tokenBDecimal),
//       poolData.tickSpacing
//     );
//     const tickUpper = TickUtil.getInitializableTickIndex(
//       PriceMath.priceToTickIndex(new Decimal(150), tokenADecimal, tokenBDecimal),
//       poolData.tickSpacing
//     );
//     const slippageTolerance = Percentage.fromFraction(1, 100); // 1% slippage

//     console.log("slippageTolerance",slippageTolerance)
//     console.log("tickLower:", tickLower.toString());
//     console.log("tickUpper:", tickUpper.toString());
//     console.log("tokenA decimals:", tokenAInfo.decimals);
//     console.log("Expected tokenMintA:", tokenMintA);
//     console.log("tokenA mint in pool:", tokenAInfo.mint.toBase58());
//     console.log("tokenB mint in pool:", tokenBInfo.mint.toBase58());

//    const poolTokenMint = tokenMintA == tokenAInfo.mint.toBase58() ? tokenAInfo.mint.toBase58() : tokenBInfo.mint.toBase58()
//    console.log("Actual tokenA mint in pool:", poolTokenMint);

//     let quote;
//     try {
//       quote = increaseLiquidityQuoteByInputToken(
//         poolTokenMint,
//         new Decimal(50),
//         tickLower,
//         tickUpper,
//         slippageTolerance, //Percentage.fromFraction(1, 100),
//         pool
//       );
//     } catch (quoteError) {
//       console.error("❌ Quote generation failed:", quoteError.message);
//       throw quoteError;
//     }
    
//     console.log("liquidity", quote);

//     const { positionMint, tx } = await pool.openPosition(tickLower, tickUpper, quote);
//     const txId = await tx.buildAndExecute();

//     console.log("✅ Liquidity added!");
//     console.log("🔗 Transaction ID:", txId);
//     console.log("🪙 Position Mint:", positionMint.toBase58());

//     return {
//       txId,
//       positionMint: positionMint.toBase58()
//     };

//   } catch (err) {
//     console.error("❌ Add liquidity failed:", err.message);
//     throw err;
//   }
// }

// module.exports = {
//   addLiquidityToSplashPool
// };
