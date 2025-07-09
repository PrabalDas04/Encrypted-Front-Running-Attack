const fs = require("fs");
const path = require("path");
const eccrypto = require("eccrypto");
const crypto = require("crypto");


// Generate a random private key
  const privateKey = crypto.randomBytes(32);
  const publicKey = eccrypto.getPublic(privateKey); // 65 bytes

// File path to save keys
const filePath = path.join(__dirname, "keys.json");
fs.writeFileSync(
  filePath,
  JSON.stringify(
    {
      privateKey: privateKey.toString("hex"),
      publicKey: publicKey.toString("hex"),
    },
    null,
    2
  )
);

console.log("Keys generated and saved to keys.json");

