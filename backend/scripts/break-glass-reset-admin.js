// pt schimbare email + parola(automata): npm run break-glass -- --email the_new_admin_email@admin.com --generate
// npm run break-glass -- --email test_terminal_1@admin.com --generate

//Pt generare email+ parola persoonalizata: npm run break-glass -- --email the_new_admin_email@admin.com --password "TempPass!123456"
// npm run break-glass -- --email test_terminal_2@admin.com --password "Terminal_password2026!"

// pt a genera doar o parola temporara: npm run break-glass -- --generate

import "dotenv/config";
import mongoose from "mongoose";
import crypto from "node:crypto";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { User } from "../src/models/user.models.js";

function generateTempPassword() {
  return crypto.randomBytes(24).toString("hex"); // 48 chars
}

function getArg(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && process.argv[idx + 1])
    return String(process.argv[idx + 1]).trim();
  return null;
}

async function main() {
  const mongoUrl = process.env.MONGO_URL?.trim();
  if (!mongoUrl) throw new Error("MONGO_URL missing in .env");

  await mongoose.connect(mongoUrl);

  const admin = await User.findOne({ role: "admin" });
  if (!admin) throw new Error("No admin account found (role: admin)");

  // CLI args: npm run break-glass -- --email a@b.com --password X | --generate
  const emailFromCli = getArg("--email")?.toLowerCase() || "";
  const passwordFromCli = getArg("--password") || "";
  const generateFlag = process.argv.includes("--generate");

  const rl = readline.createInterface({ input, output });

  console.log("\n⚠️  BREAK-GLASS: reset admin credentials\n");
  console.log("Current admin email in DB:", admin.email);

  const newEmail = emailFromCli
    ? emailFromCli
    : (
        await rl.question(
          "Enter NEW admin email (leave empty to keep current): ",
        )
      )
        .trim()
        .toLowerCase();

  let tempPassword = "";
  if (generateFlag) {
    tempPassword = generateTempPassword();
  } else if (passwordFromCli) {
    tempPassword = passwordFromCli;
  } else {
    const answer = (
      await rl.question("Generate random temporary password? (yes/no): ")
    )
      .trim()
      .toLowerCase();

    if (answer === "yes" || answer === "y") {
      tempPassword = generateTempPassword();
    } else {
      tempPassword = (
        await rl.question("Enter temporary password to set: ")
      ).trim();
      if (!tempPassword) throw new Error("Temporary password cannot be empty");
    }
  }

  const confirm = (
    await rl.question("Type EXACTLY 'RESET' to confirm: ")
  ).trim();
  if (confirm !== "RESET") {
    console.log("Aborted.");
    await rl.close();
    await mongoose.disconnect();
    process.exit(0);
  }

  // If email provided and changed, ensure it's not used by someone else
  if (newEmail && newEmail !== admin.email) {
    const exists = await User.exists({ email: newEmail });
    if (exists)
      throw new Error("That email is already used by another account.");

    admin.email = newEmail;
    admin.isEmailVerified = true; // operator sets it
  }

  admin.password = tempPassword;
  admin.mustChangePassword = true;
  admin.refreshToken = ""; // revoke sessions

  await admin.save(); // hashing runs in pre('save')

  console.log("\n✅ Admin credentials updated.");
  console.log("Admin email:", admin.email);
  console.log("Temporary password:", tempPassword);
  console.log("Next step: admin must login and change password.\n");

  await rl.close();
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error("❌ Break-glass failed:", e.message);
  process.exit(1);
});
