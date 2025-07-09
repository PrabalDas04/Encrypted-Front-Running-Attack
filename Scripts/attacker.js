const hre = require("hardhat");
const fs = require("fs");
const eccrypto = require("eccrypto");
const { ethers, Interface, AbiCoder } = require("ethers");

// function for serializing encrypted data
function serializeEncrypted(encrypted) {
  const abiCoder = new AbiCoder();
  return abiCoder.encode(
    ["bytes", "bytes", "bytes", "bytes"],
    [
      encrypted.iv,
      encrypted.ephemPublicKey,
      encrypted.ciphertext,
      encrypted.mac
    ]
  );
}

async function main() {
    // load address from deployments.json
    const addresses = JSON.parse(fs.readFileSync("scripts/deployments.json", "utf8"));
    const tokenA = addresses.tokenA;
    const tokenB = addresses.tokenB;
    const dex = addresses.dex;
    const coordinator = addresses.coordinator;

    // get signer's address
    const signer = await hre.ethers.getSigners();
    const attacker = signer[2]; // Pick signer[2], a different account than the first one

    // Get ABI from the contract factory
    const Token = await hre.ethers.getContractFactory("Token");
    const Dex = await hre.ethers.getContractFactory("Dex");
    const Coordinator = await hre.ethers.getContractFactory("Coordinator");

    // Create a contract instances
    const TokenA = new ethers.Contract(tokenA, Token.interface, attacker);
    const TokenB = new ethers.Contract(tokenB, Token.interface, attacker);
    const DEX = new ethers.Contract(dex, Dex.interface, attacker);
    const CordinatoR = new ethers.Contract(coordinator, Coordinator.interface, attacker);

    // Mint tokens A and B to attacker for swapping
    const mintAmount = hre.ethers.parseEther("10");
    await TokenA.mint(attacker.address, mintAmount);
    await TokenB.mint(attacker.address, mintAmount);

    // Check attacker's token balances before swap
    const attackerBalanceA_before = await TokenA.balanceOf(attacker.address);
    const attackerBalanceB_before = await TokenB.balanceOf(attacker.address);

    console.log("attacker TokenA balance after mint:", hre.ethers.formatEther(attackerBalanceA_before));
    console.log("attacker TokenB balance after mint:", hre.ethers.formatEther(attackerBalanceB_before));

    // attacker approves Dex to spend TokenA for swap(Note: It does not have enough token to swap)
    const swapAmount = hre.ethers.parseEther("200");
    await TokenA.connect(attacker).approve(await DEX.getAddress(), swapAmount);

    // Load keys from file
    const keys = JSON.parse(fs.readFileSync("scripts/keys.json", "utf8"));
    const pubKey = Buffer.from(keys.publicKey, "hex");

    // attacker performs swap: TokenA -> TokenB
    // Swap function ABI
    const abi = ["function swap(address tokenIn, uint256 amountIn)"];
    const iface = new Interface(abi);

    // Encode the swap function call
    const tokenInAddress = await TokenA.getAddress();
    const callData = iface.encodeFunctionData("swap", [tokenInAddress, swapAmount]);

    // Encode all parameters together
    const abiCoder = AbiCoder.defaultAbiCoder();
    const payload = abiCoder.encode(
      ["address", "bytes"],
      [await DEX.getAddress(), callData]
    );
    // Encrypt the call data
    const encryptedTx = await eccrypto.encrypt(pubKey, Buffer.from(payload.slice(2), "hex")); // remove '0x' prefix

    // serialize(to convert encrypted object to byte datatype), then submit encrypted tx
    const encryptedData = serializeEncrypted(encryptedTx);
    const tx = await CordinatoR.connect(attacker).submitEncryptedTx(encryptedData);
    await tx.wait();
    console.log("Attacker: Encrypted swap transaction submitted to contract");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});