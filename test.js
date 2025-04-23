const fs = require("fs");
const path = require("path");
require("dotenv").config();

const anchor = require("@project-serum/anchor");
const {
  Connection,
  PublicKey,
  Keypair,
} = require("@solana/web3.js");

const {
  getAssociatedTokenAddress,
} = require("@solana/spl-token");

const { createRaydiumPool } = require("./src/services/raydiumService");

(async () => {
  const connection = new Connection(process.env.SOLANA_RPC_URL, "confirmed");

  const walletKey = require("/Users/abc/my-solana-wallets/launchtrade-mainnet.json");
  const wallet = new anchor.Wallet(Keypair.fromSecretKey(Uint8Array.from(walletKey)));

  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);

  const idl = require("./src/services/raydium_amm_idl.json");
  const program = new anchor.Program(idl, process.env.RAYDIUM_AMM_PROGRAM_ID, provider);

  const baseMint = new PublicKey("8vPhZDS3De7fyuxvkZGpeQ948WnDcfFp4eFhR3YQz4gx");
  const quoteMint = new PublicKey("So11111111111111111111111111111111111111112");
  const lpMint = new PublicKey("6Xustgz2JVyZbxy93CXrxeBWgGbqauRgQWzGnhn9imsY");
  const serumMarket = new PublicKey("9oYpKWDpTpyXLCvGCMXz4swbG6oQLNhG2uU3npTjwGqx");

  // 🔧 Generate Keypairs for required accounts
  const poolState = Keypair.generate();
  const openOrders = Keypair.generate();
  const withdrawQueue = Keypair.generate();
  const targetOrders = Keypair.generate();
  const tempLpTokenAccount = Keypair.generate();

  // ✅ Ensure directory exists
  const dir = "./.raydium";
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

  // ✅ Optionally save keypairs for reuse/debugging
  fs.writeFileSync(`${dir}/poolState.json`, JSON.stringify(Array.from(poolState.secretKey)));
  fs.writeFileSync(`${dir}/openOrders.json`, JSON.stringify(Array.from(openOrders.secretKey)));
  fs.writeFileSync(`${dir}/withdrawQueue.json`, JSON.stringify(Array.from(withdrawQueue.secretKey)));
  fs.writeFileSync(`${dir}/targetOrders.json`, JSON.stringify(Array.from(targetOrders.secretKey)));
  fs.writeFileSync(`${dir}/tempLpTokenAccount.json`, JSON.stringify(Array.from(tempLpTokenAccount.secretKey)));

  try {
    const { tx } = await createRaydiumPool({
      baseMint,
      quoteMint,
      lpMint,
      serumMarket,
      wallet: wallet.payer,
      connection,
      program,
      poolState,
      openOrders,
      withdrawQueue,
      targetOrders,
      tempLpTokenAccount,
    });

    console.log("✅ Pool initialized in transaction:", tx);
  } catch (err) {
    console.error("❌ Error in pool creation:", err.message);
  }
})();
