const {
  setRpc,
  setPayerFromBytes,
  setWhirlpoolsConfig,
  openFullRangePosition
} = require("@orca-so/whirlpools");

const {
  getOrCreateAssociatedTokenAccount,
  createWrappedNativeAccount,
  TOKEN_PROGRAM_ID
} = require("@solana/spl-token");

const {
  Connection,
  PublicKey,
  Keypair
} = require("@solana/web3.js");

const { address } = require("@solana/kit");

const connection = new Connection(process.env.SOLANA_RPC_URL);
const adminSecretKey = Uint8Array.from(JSON.parse(process.env.SOLANA_SECRET_KEY));
const adminKeypair = Keypair.fromSecretKey(adminSecretKey);
const WSOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");

/**
 * Wraps native SOL and returns the WSOL token account address
 */
async function ensureWrappedSOLAccount(connection, payer, amountLamports) {
  const wrappedAccount = await createWrappedNativeAccount(
    connection,
    payer,
    payer.publicKey,
    amountLamports,
    TOKEN_PROGRAM_ID
  );
  return wrappedAccount.address;
}

/**
 * Opens a full-range liquidity position on an Orca Splash Pool
 */
async function openFullRangeLiquidity(poolAddress, tokenAmount, payerKeypair, baseMint) {
  try {
    console.log("🔄 Opening Full-Range Position...");
    console.log("📌 Pool Address:", poolAddress);
    console.log("💰 Token Amount:", tokenAmount);

    await setRpc(process.env.SOLANA_RPC_URL);
    await setWhirlpoolsConfig("solanaDevnet");
    await setPayerFromBytes(payerKeypair.secretKey);

    const quoteMint = new PublicKey(process.env.SOL_TOKEN_MINT);
    const baseMintPk = new PublicKey(baseMint);
    const [mintA, mintB] = [baseMintPk, quoteMint].sort((a, b) =>
      a.toBase58().localeCompare(b.toBase58())
    );

    const isTokenA = baseMintPk.equals(mintA);
    const input = isTokenA
      ? { tokenA: BigInt(tokenAmount) }
      : { tokenB: BigInt(tokenAmount) };

    const ataA = await getOrCreateAssociatedTokenAccount(connection, payerKeypair, mintA, payerKeypair.publicKey);
    const ataB = await getOrCreateAssociatedTokenAccount(connection, payerKeypair, mintB, payerKeypair.publicKey);

    console.log("🔐 ATAs ensured:", {
      tokenA: ataA.address.toBase58(),
      tokenB: ataB.address.toBase58()
    });

    const balanceA = await connection.getTokenAccountBalance(ataA.address);
    const balanceB = await connection.getTokenAccountBalance(ataB.address);

    console.log(`🔍 Balance of Token A (${mintA.toBase58()}):`, balanceA.value);
    console.log(`🔍 Balance of Token B (${mintB.toBase58()}):`, balanceB.value);

    // Estimate required quote for WSOL provision
    const preview = await openFullRangePosition(address(poolAddress), input, 100);
    const { quote } = preview;

    console.log("🔎 Quote object:", quote);
    console.log("🔎 Quote.tokenMaxB (required for other token):", quote.tokenMaxB.toString());

    const requiredWSOL = Number(quote.tokenMaxB);
    const availableWSOL = Number(balanceB.value.amount);

    if (availableWSOL < requiredWSOL) {
      const topUpAmount = requiredWSOL - availableWSOL + 10000; // Add 10K buffer
      console.log(`⚠️ Topping up WSOL by ${topUpAmount} lamports...`);
      await ensureWrappedSOLAccount(connection, payerKeypair, topUpAmount);
      console.log("✅ WSOL top-up complete.");
    }

    // Final open position after top-up
    const { positionMint, quote: finalQuote, callback } = await openFullRangePosition(
      address(poolAddress),
      input,
      100
    );

    const txId = await callback();

    return {
      txId,
      positionMint,
      quoteMaxB: finalQuote.tokenMaxB.toString()
    };
  } catch (err) {
    console.error("❌ openFullRangeLiquidity Error:", err);
    throw err;
  }
}

module.exports = { openFullRangeLiquidity };
