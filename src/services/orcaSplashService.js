const {
    WhirlpoolContext,
    ORCA_WHIRLPOOL_PROGRAM_ID,
    PriceMath,
  } = require("@orca-so/whirlpools-sdk");
  const {
    buildWhirlpoolClient
  } = require("@orca-so/whirlpools-sdk");
  const {
    AnchorProvider,
    Wallet
  } = require("@coral-xyz/anchor");
  const {
    PublicKey,
    Connection,
    Keypair,
    Transaction
  } = require("@solana/web3.js");
  const { Decimal } = require("decimal.js");
  
  const WHIRLPOOLS_CONFIG = new PublicKey("FcrweFY1G9HJAHG5inkGB6pKg1HZ6x9UC2WioAfWrGkR");
  
  /**
   * Create Orca Splash Pool using SDK v2
   * @param {Object} params
   * @param {string} params.rpcUrl - Solana RPC endpoint
   * @param {Keypair} params.payer - Solana wallet keypair
   * @param {string} params.tokenMintA - Token mint address A
   * @param {string} params.tokenMintB - Token mint address B
   * @param {number} params.initialPrice - Initial price (A in terms of B)
   * @returns {Promise<string>} Transaction ID
   */
  async function createSplashPoolWrapper({
    rpcUrl,
    payer,
    tokenMintA,
    tokenMintB,
    initialPrice
  }) {
    try {
      console.log("🔃 Creating Orca Splash Pool using SDK v2...");
      console.log("tokenMintA",tokenMintA);
      console.log("tokenMintB",tokenMintB)
      const connection = new Connection(rpcUrl, "confirmed");
      const wallet = new Wallet(payer); // 🧠 Wrap the Keypair for Anchor
      const provider = new AnchorProvider(connection, wallet, {});
      const ctx = WhirlpoolContext.withProvider(provider, ORCA_WHIRLPOOL_PROGRAM_ID);
      const client = buildWhirlpoolClient(ctx);
  
      // Ensure correct mint order
      const [mintA, mintB] = [new PublicKey(tokenMintA), new PublicKey(tokenMintB)];
      console.log("mintA",mintA);
      console.log("mintB",mintB)

      const [orderedMintA, orderedMintB] = mintA.toBuffer().compare(mintB.toBuffer()) < 0
        ? [mintA, mintB]
        : [mintB, mintA];

        console.log("orderedMintA",orderedMintA);
        console.log("orderedMintB",orderedMintB)
  
      // Pool params
      const tickSpacing = 64;
      const decimalsA = 9;
      const decimalsB = 9;
      const price = new Decimal(initialPrice);
      const initialTickIndex = PriceMath.priceToTickIndex(price, decimalsA, decimalsB);
  
      const { poolKey, tx: createPoolTxBuilder } = await client.createPool(
        WHIRLPOOLS_CONFIG,
        orderedMintA,
        orderedMintB,
        tickSpacing,
        initialTickIndex,
        payer.publicKey
      );
  
      const txId = await createPoolTxBuilder.buildAndExecute();
  
      console.log(`✅ Splash Pool Created!`);
      console.log(`🪙 Pool Address: ${poolKey.toBase58()}`);
      console.log(`🔗 Transaction ID: ${txId}`);
  
      return {
        txId,
        poolAddress: poolKey.toBase58()
      };
  
    } catch (err) {
      console.error("❌ Splash Pool Creation Failed:", err.message);
      throw err;
    }
  }
  
  module.exports = {
    createSplashPoolWrapper
  };
  