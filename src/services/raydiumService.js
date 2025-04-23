require("dotenv").config();
const anchor = require("@project-serum/anchor");
const {
  Connection,
  PublicKey,
  Keypair,
  SystemProgram,
  sendAndConfirmTransaction,
  Transaction,
} = require("@solana/web3.js");
const {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} = require("@solana/spl-token");
const { DexInstructions, Market } = require("@project-serum/serum");
const fs = require("fs");
const path = require("path");

// ✅ CONFIG
const RAYDIUM_AMM_PROGRAM_ID = new PublicKey(process.env.RAYDIUM_AMM_PROGRAM_ID);
const DEX_PROGRAM_ID = new PublicKey("3v9kjrBLN7Awr9BGC2qmFnWLM1EgMAdNm2rXLQFUcQ2d");
const connection = new Connection(process.env.SOLANA_RPC_URL, "confirmed");

const secret = Uint8Array.from(JSON.parse(process.env.SOLANA_SECRET_KEY));
const wallet = Keypair.fromSecretKey(secret);
console.log("🧪 Loaded RAYDIUM_AMM_PROGRAM_ID:", process.env.RAYDIUM_AMM_PROGRAM_ID);

// ✅ Anchor setup
const RAYDIUM_IDL = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "./raydium_amm_idl.json"), "utf8")
);

const provider = new anchor.AnchorProvider(
  connection,
  new anchor.Wallet(wallet),
  { commitment: "confirmed" }
);
anchor.setProvider(provider);
const program = new anchor.Program(RAYDIUM_IDL, RAYDIUM_AMM_PROGRAM_ID, provider);

// ========== 🧠 Create Serum Market Manually ==========
const createSerumMarket = async ({
  baseMint,
  quoteMint,
  baseVault,
  quoteVault,
  baseLotSize = 1000000,
  quoteLotSize = 100,
}) => {
  console.log("🧠 Creating Serum Market manually...");

  const market = Keypair.generate();
  const requestQueue = Keypair.generate();
  const eventQueue = Keypair.generate();
  const bids = Keypair.generate();
  const asks = Keypair.generate();

  const [vaultSigner, vaultSignerNonce] = await PublicKey.findProgramAddress(
    [market.publicKey.toBuffer()],
    DEX_PROGRAM_ID
  );

  const createMarketAccs = [
    SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: market.publicKey,
      lamports: await connection.getMinimumBalanceForRentExemption(376),
      space: 376,
      programId: DEX_PROGRAM_ID,
    }),
    SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: requestQueue.publicKey,
      lamports: await connection.getMinimumBalanceForRentExemption(5120),
      space: 5120,
      programId: DEX_PROGRAM_ID,
    }),
    SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: eventQueue.publicKey,
      lamports: await connection.getMinimumBalanceForRentExemption(5120),
      space: 5120,
      programId: DEX_PROGRAM_ID,
    }),
    SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: bids.publicKey,
      lamports: await connection.getMinimumBalanceForRentExemption(65536),
      space: 65536,
      programId: DEX_PROGRAM_ID,
    }),
    SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: asks.publicKey,
      lamports: await connection.getMinimumBalanceForRentExemption(65536),
      space: 65536,
      programId: DEX_PROGRAM_ID,
    }),
    SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: baseVault.publicKey,
      lamports: await connection.getMinimumBalanceForRentExemption(165),
      space: 165,
      programId: TOKEN_PROGRAM_ID,
    }),
    SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: quoteVault.publicKey,
      lamports: await connection.getMinimumBalanceForRentExemption(165),
      space: 165,
      programId: TOKEN_PROGRAM_ID,
    }),
  ];

  const initMarketIx = DexInstructions.initializeMarket({
    market: market.publicKey,
    requestQueue: requestQueue.publicKey,
    eventQueue: eventQueue.publicKey,
    bids: bids.publicKey,
    asks: asks.publicKey,
    baseVault: baseVault.publicKey,
    quoteVault: quoteVault.publicKey,
    baseMint: new PublicKey(baseMint),
    quoteMint: new PublicKey(quoteMint),
    baseLotSize: new anchor.BN(baseLotSize),
    quoteLotSize: new anchor.BN(quoteLotSize),
    feeRateBps: 0,
    vaultSignerNonce: new anchor.BN(vaultSignerNonce),
    quoteDustThreshold: new anchor.BN(100),
    programId: DEX_PROGRAM_ID,
  });

  initMarketIx.keys.push(
    { pubkey: vaultSigner, isSigner: false, isWritable: false },
    { pubkey: anchor.web3.SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false }
  );

  await sendAndConfirmTransaction(connection, new Transaction().add(...createMarketAccs.slice(0, 2)), [wallet, market, requestQueue]);
  await sendAndConfirmTransaction(connection, new Transaction().add(...createMarketAccs.slice(2, 5)), [wallet, eventQueue, bids, asks]);
  await sendAndConfirmTransaction(connection, new Transaction().add(...createMarketAccs.slice(5)), [wallet, baseVault, quoteVault]);
  await sendAndConfirmTransaction(connection, new Transaction().add(initMarketIx), [wallet]);

  console.log("✅ Serum Market Created:", market.publicKey.toBase58());

  return {
    marketId: market.publicKey.toBase58(),
  };
};



// ========== 🔧 Create Raydium Pool ==========
// const createRaydiumPool = async (
//   baseMint,
//   quoteMint,
//   serumMarket,
//   lpMint,
//   baseVault,
//   quoteVault,
//   poolState,
//   openOrders,
//   targetOrders
// ) => {
//   console.log("🚀 Initializing Raydium pool with Anchor...");

//   try {
//     const nonce = 255; // Replace with correct nonce if needed
//     const openTime = new anchor.BN(Math.floor(Date.now() / 1000));

//     const tx = await program.rpc.initialize(nonce, openTime, {
//       accounts: {
//         tokenProgram: TOKEN_PROGRAM_ID,
//         systemProgram: SystemProgram.programId,
//         rent: anchor.web3.SYSVAR_RENT_PUBKEY,

//         amm: new PublicKey(poolState),
//         ammAuthority: wallet.publicKey,
//         ammOpenOrders: new PublicKey(openOrders),
//         lpMintAddress: new PublicKey(lpMint),
//         coinMintAddress: new PublicKey(baseMint),
//         pcMintAddress: new PublicKey(quoteMint),
//         poolCoinTokenAccount: new PublicKey(baseVault),
//         poolPcTokenAccount: new PublicKey(quoteVault),
//         poolWithdrawQueue: Keypair.generate().publicKey, // or reuse if already created
//         poolTargetOrdersAccount: new PublicKey(targetOrders),
//         userLpTokenAccount: await getAssociatedTokenAddress(new PublicKey(lpMint), wallet.publicKey),
//         poolTempLpTokenAccount: Keypair.generate().publicKey,
//         serumProgram: DEX_PROGRAM_ID, // double check this
//         serumMarket: new PublicKey(serumMarket),
//         userWallet: wallet.publicKey,
//       },
//     });

//     console.log("✅ Pool created with tx:", tx);
//     return tx;
//   } catch (err) {
//     console.error("❌ Failed to create Raydium pool:", err.message);
//     throw err;
//   }
// };


const createRaydiumPool = async ({
  baseMint,
  quoteMint,
  lpMint,
  serumMarket,
  wallet,
  connection,
  program,
  poolState,
  openOrders,
  withdrawQueue,
  targetOrders,
  tempLpTokenAccount,
}) => {
  console.log("🚀 Initializing Raydium pool...");

  const userLpTokenAccount = await getAssociatedTokenAddress(lpMint, wallet.publicKey);
  const baseVault = await getAssociatedTokenAddress(baseMint, wallet.publicKey);
  const quoteVault = await getAssociatedTokenAddress(quoteMint, wallet.publicKey);

  const [ammAuthority] = await PublicKey.findProgramAddress(
    [poolState.publicKey.toBuffer()],
    program.programId
  );

  const nonce = 255;
  const openTime = new anchor.BN(Math.floor(Date.now() / 1000));

  const tx = await program.rpc.initialize(nonce, openTime, {
    accounts: {
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      amm: poolState.publicKey,
      ammAuthority,
      ammOpenOrders: openOrders.publicKey,
      lpMintAddress: lpMint,
      coinMintAddress: baseMint,
      pcMintAddress: quoteMint,
      poolCoinTokenAccount: baseVault,
      poolPcTokenAccount: quoteVault,
      poolWithdrawQueue: withdrawQueue.publicKey,
      poolTargetOrdersAccount: targetOrders.publicKey,
      userLpTokenAccount,
      poolTempLpTokenAccount: tempLpTokenAccount.publicKey,
      serumProgram: DEX_PROGRAM_ID,
      serumMarket,
      userWallet: wallet.publicKey,
    },
    signers: [poolState, openOrders, withdrawQueue, targetOrders, tempLpTokenAccount],
  });

  return {
    tx,
    accounts: {
      poolState: poolState.publicKey,
    },
  };
};



// ========== 💧 Add Liquidity ==========
const addLiquidity = async (
  baseMint,
  quoteMint,
  amountA,
  amountB,
  serumMarket,
  poolState,
  lpMint,
  baseVault,
  quoteVault
) => {
  console.log("🚀 Adding liquidity using Raydium AMM...");

  try {
    const userBaseATA = await getAssociatedTokenAddress(new PublicKey(baseMint), wallet.publicKey);
    const userQuoteATA = await getAssociatedTokenAddress(new PublicKey(quoteMint), wallet.publicKey);
    const userLPTarget = await getAssociatedTokenAddress(new PublicKey(lpMint), wallet.publicKey);

    const tx = await program.methods
      .addLiquidity(
        new anchor.BN(amountA),
        new anchor.BN(amountB),
        new anchor.BN(1)
      )
      .accounts({
        poolState: new PublicKey(poolState),
        lpMint: new PublicKey(lpMint),
        baseVault: new PublicKey(baseVault),
        quoteVault: new PublicKey(quoteVault),
        userBaseAta: userBaseATA,
        userQuoteAta: userQuoteATA,
        userLpAta: userLPTarget,
        user: wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Liquidity added. Tx:", tx);
    return tx;
  } catch (err) {
    console.error("❌ Failed to add liquidity:", err);
    throw err;
  }
};

module.exports = {
  createSerumMarket,
  createRaydiumPool,
  addLiquidity,
};
