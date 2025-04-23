const {
    createAssociatedTokenAccountInstruction,
    getAssociatedTokenAddress,
  } = require("@solana/spl-token");
  
  async function ensureWrappedSOLAccount(connection, payer, amountLamports) {
    const ata = await getAssociatedTokenAddress(WSOL_MINT, payer.publicKey);
    const ix = createAssociatedTokenAccountInstruction(
      payer.publicKey,
      ata,
      payer.publicKey,
      WSOL_MINT
    );
  
    const tx = new Transaction()
      .add(ix)
      .add(
        SystemProgram.transfer({
          fromPubkey: payer.publicKey,
          toPubkey: ata,
          lamports: amountLamports,
        })
      );
  
    await sendAndConfirmTransaction(connection, tx, [payer]);
    return ata;
  }
  