const { Transaction, TransactionInstruction, PublicKey, sendAndConfirmTransaction } = require("@solana/web3.js");

const RAYDIUM_POOL_PROGRAM_ID = new PublicKey(process.env.RAYDIUM_AMM_PROGRAM_ID);
const SOL_TOKEN_MINT = new PublicKey(process.env.SOL_TOKEN_MINT);

const createRaydiumPool = async (tokenMint) => {
    console.log(`🔹 Creating Liquidity Pool for ${tokenMint.toBase58()}...`);
    
    const transaction = new Transaction();
    transaction.add(
        new TransactionInstruction({
            keys: [
                { pubkey: tokenMint, isSigner: false, isWritable: true },
                { pubkey: SOL_TOKEN_MINT, isSigner: false, isWritable: true },
                { pubkey: RAYDIUM_POOL_PROGRAM_ID, isSigner: false, isWritable: true },
            ],
            programId: RAYDIUM_POOL_PROGRAM_ID,
            data: Buffer.from([]), // Pool creation parameters
        })
    );

    await sendAndConfirmTransaction(connection, transaction, [payer]);
    console.log("✅ Liquidity Pool Created!");
};

const addLiquidity = async (tokenMint, amountToken, amountSOL) => {
    console.log(`🔹 Adding ${amountSOL / LAMPORTS_PER_SOL} SOL Liquidity for ${tokenMint.toBase58()}...`);

    const transaction = new Transaction();
    transaction.add(
        new TransactionInstruction({
            keys: [
                { pubkey: tokenMint, isSigner: false, isWritable: true },
                { pubkey: SOL_TOKEN_MINT, isSigner: false, isWritable: true },
                { pubkey: RAYDIUM_POOL_PROGRAM_ID, isSigner: false, isWritable: true },
            ],
            programId: RAYDIUM_POOL_PROGRAM_ID,
            data: Buffer.from([amountToken, amountSOL]), // Add liquidity amount
        })
    );

    await sendAndConfirmTransaction(connection, transaction, [payer]);
    console.log(`✅ Liquidity Added: ${amountToken} Tokens, ${amountSOL / LAMPORTS_PER_SOL} SOL`);
};

const listOnRaydium = async (tokenMint) => {
    console.log(`🔹 Listing ${tokenMint.toBase58()} on Raydium...`);

    const transaction = new Transaction();
    transaction.add(
        new TransactionInstruction({
            keys: [
                { pubkey: tokenMint, isSigner: false, isWritable: true },
                { pubkey: RAYDIUM_POOL_PROGRAM_ID, isSigner: false, isWritable: true },
            ],
            programId: RAYDIUM_POOL_PROGRAM_ID,
            data: Buffer.from([]), // Auto-listing parameters
        })
    );

    await sendAndConfirmTransaction(connection, transaction, [payer]);
    console.log("✅ Token Listed on Raydium!");
};

module.exports = { createRaydiumPool, addLiquidity, listOnRaydium };
