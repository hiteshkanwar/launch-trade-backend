const { Connection, PublicKey } = require("@solana/web3.js");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = async function verifyPayment(
  connection,
  txSignature,
  userWallet,
  commissionWallet,
  adminWallet,
  expectedCommissionLamports,
  expectedAdminLamports
) {
  console.log("Running verifyPayment...");
  if (process.env.NODE_ENV !== "production") {
    console.log("Dev mode: skipping verifyPayment.");
    return true;
  }

  console.log("🔗 Checking txSignature:", txSignature);
  console.log("Expected Commission (lamports):", expectedCommissionLamports);
  console.log("Expected Admin (lamports):", expectedAdminLamports);
  console.log("User Wallet:", userWallet);
  console.log("Commission Wallet:", commissionWallet.toBase58());
  console.log("Admin Wallet:", adminWallet.toBase58());

  try {
    let txDetails = null;

    for (let i = 0; i < 3; i++) {
      txDetails = await connection.getParsedTransaction(txSignature, {
        commitment: "finalized", // strongest available confirmation
      });

      if (txDetails) {
        console.log(`Attempt ${i + 1}: Transaction found.`);
      } else {
        console.log(`Attempt ${i + 1}: Transaction not found.`);
      }

      if (txDetails && txDetails.meta) {
        if (txDetails.meta.err) {
          console.warn("⚠️ Transaction contains error:", txDetails.meta.err);
        }
        break;
      }

      await sleep(3000); // wait 3s before retry
    }

    if (!txDetails || !txDetails.meta) {
      console.log("Transaction still not found after retries.");
      return false;
    }

    console.log("📦 Full Transaction Details:", JSON.stringify(txDetails, null, 2));

    const instructions = txDetails.transaction.message.instructions;
    console.log(`🔍 Found ${instructions.length} instructions. Checking each:`);

    let commissionPaid = false;
    let adminPaid = false;

    for (let i = 0; i < instructions.length; i++) {
      const ix = instructions[i];

      console.log(`  ➤ Instruction ${i + 1}:`);
      console.log("     - Program:", ix.program);
      console.log("     - Parsed:", JSON.stringify(ix.parsed, null, 2));

      const parsed = ix.parsed;

      if (!parsed || parsed.type !== "transfer") continue;

      const from = parsed.info.source;
      const to = parsed.info.destination;
      const amount = parseInt(parsed.info.lamports);

      console.log(`     - From: ${from}`);
      console.log(`     - To: ${to}`);
      console.log(`     - Amount: ${amount}`);

      if (
        from === userWallet &&
        to === commissionWallet.toBase58() &&
        amount === expectedCommissionLamports
      ) {
        commissionPaid = true;
        console.log("Matched commission transfer.");
      }

      if (
        from === userWallet &&
        to === adminWallet.toBase58() &&
        amount === expectedAdminLamports
      ) {
        adminPaid = true;
        console.log("Matched admin transfer.");
      }
    }

    if (commissionPaid && adminPaid) {
      console.log("Payment fully verified.");
      return true;
    } else {
      if (!commissionPaid) {
        console.warn("Commission transfer not found or mismatched.");
      }
      if (!adminPaid) {
        console.warn("Admin transfer not found or mismatched.");
      }
      return false;
    }
  } catch (err) {
    console.error("Error in verifyPayment:", err.message);
    return false;
  }
};
