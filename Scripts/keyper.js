const hre = require("hardhat");
const fs = require("fs");
const eccrypto = require("eccrypto");
const { ethers, AbiCoder } = require("ethers");

async function main() {
  // load address from deployments.json
  const addresses = JSON.parse(fs.readFileSync("scripts/deployments.json", "utf8"));
  const coordinator = addresses.coordinator;

  // get signer's address
  const signer = await hre.ethers.getSigners();
  const keyper = signer[3]; // Pick signer[3], a different account than the other users

  // Get ABI from the contract factory
  const Coordinator = await hre.ethers.getContractFactory("Coordinator");

  // Create a contract instances
  const CordinatoR = new ethers.Contract(coordinator, Coordinator.interface, keyper);

  // Get array length
  const length = await CordinatoR.encryptedTxCount();

  const abiCoder = AbiCoder.defaultAbiCoder();
  // Load private key from file
  const keys = JSON.parse(fs.readFileSync("scripts/keys.json", "utf8"));
  const privateKey = Buffer.from(keys.privateKey, "hex");

  // Loop over all entries
  for (let index = 0; index < length; index++) {
    // Get encrypted data
    const [sender, data] = await CordinatoR.getEncryptedTx(index);
    
    // Split `data` into iv, ephemPublicKey, ciphertext, mac(bytes)
    const [iv, ephemPublicKey, ciphertext, mac] = abiCoder.decode(
      ["bytes", "bytes", "bytes", "bytes"],
      data
    );

    // converts the decoded bytes into Buffer objects
    const encryptedPayload = {
      iv: Buffer.from(iv.slice(2), "hex"),
      ephemPublicKey: Buffer.from(ephemPublicKey.slice(2), "hex"),
      ciphertext: Buffer.from(ciphertext.slice(2), "hex"),
      mac: Buffer.from(mac.slice(2), "hex"),
    };
        
    // decryption
    const decrypted = await eccrypto.decrypt(privateKey, encryptedPayload);
        
    // split the blob of data into original datatypes
    const [dexAddress, callDatas] = abiCoder.decode(
      ["address", "bytes"],
      decrypted
    );
        
    console.log("Dex Address:", dexAddress);
    console.log("Call Data:", callDatas);

    // submit decrypted txs
    const tx = await CordinatoR.connect(keyper).submitDecryptedTx(dexAddress, callDatas);
    await tx.wait();
    console.log("Decrypted transaction submitted to contract");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});