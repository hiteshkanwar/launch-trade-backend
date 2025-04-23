// 📦 fetchRaydiumPoolInfo.js
const anchor = require("@project-serum/anchor");
const { PublicKey } = require("@solana/web3.js");
const RAYDIUM_IDL = require("../services/raydium_amm_idl.json");
require("dotenv").config();

const RAYDIUM_AMM_PROGRAM_ID = new PublicKey(process.env.RAYDIUM_AMM_PROGRAM_ID);

const connection = new anchor.web3.Connection(process.env.SOLANA_RPC_URL, "confirmed");
const wallet = anchor.web3.Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(process.env.SOLANA_SECRET_KEY))
);
const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(wallet), {
  commitment: "confirmed",
});
anchor.setProvider(provider);

const program = new anchor.Program(RAYDIUM_IDL, RAYDIUM_AMM_PROGRAM_ID, provider);

// 🔍 Helper to fetch pool info after createRaydiumPool()
const fetchRaydiumPoolInfo = async (baseMint, quoteMint) => {
  console.log("🔍 Fetching Raydium pool info...");

  const baseMintPk = new PublicKey(baseMint);
  const quoteMintPk = new PublicKey(quoteMint);

  // PDA derivation logic (must match Raydium's contract logic)
  // NOTE: This is a mock example. Replace seeds with Raydium's real PDA logic
  const [poolState] = PublicKey.findProgramAddressSync(
    [Buffer.from("amm"), baseMintPk.toBuffer(), quoteMintPk.toBuffer()],
    RAYDIUM_AMM_PROGRAM_ID
  );

  const account = await connection.getAccountInfo(poolState);
  if (!account) throw new Error("Pool state not found on-chain");

  const decoded = program.coder.accounts.decode("PoolState", account.data);

  return {
    poolState: poolState.toBase58(),
    lpMint: decoded.lpMint.toBase58(),
    baseVault: decoded.baseVault.toBase58(),
    quoteVault: decoded.quoteVault.toBase58(),
  };
};

module.exports = { fetchRaydiumPoolInfo };
