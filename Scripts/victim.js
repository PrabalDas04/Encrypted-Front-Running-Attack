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
    const user = signer[1]; // Pick signer[1], a different account than the first one

    // Get ABI from the contract factory
    const Token = await hre.ethers.getContractFactory("Token");
    const Dex = await hre.ethers.getContractFactory("Dex");
    const Coordinator = await hre.ethers.getContractFactory("Coordinator");

    // Create a contract instances
    const TokenA = new ethers.Contract(tokenA, Token.interface, user);
    const TokenB = new ethers.Contract(tokenB, Token.interface, user);
    const DEX = new ethers.Contract(dex, Dex.interface, user);
    const CordinatoR = new ethers.Contract(coordinator, Coordinator.interface, user);

    // Mint tokens A and B to user for swapping
    const mintAmount = hre.ethers.parseEther("5000");
    await TokenA.mint(user.address, mintAmount);
    await TokenB.mint(user.address, mintAmount);

    // Check user's token balances before swap
    const userBalanceA_before = await TokenA.balanceOf(user.address);
    const userBalanceB_before = await TokenB.balanceOf(user.address);

    console.log("User TokenA balance after mint:", hre.ethers.formatEther(userBalanceA_before));
    console.log("User TokenB balance after mint:", hre.ethers.formatEther(userBalanceB_before));

    // User approves Dex to spend TokenA for swap
    const swapAmount = hre.ethers.parseEther("2000");
    await TokenA.connect(user).approve(await DEX.getAddress(), swapAmount);

    // Load keys from file
    const keys = JSON.parse(fs.readFileSync("scripts/keys.json", "utf8"));
    const pubKey = Buffer.from(keys.publicKey, "hex");

    // User performs swap: TokenA -> TokenB
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
    const tx = await CordinatoR.connect(user).submitEncryptedTx(encryptedData);
    await tx.wait();
    console.log("Victim: Encrypted swap transaction submitted to contract");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});