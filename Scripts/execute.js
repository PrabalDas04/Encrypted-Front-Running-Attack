const hre = require("hardhat");
const fs = require("fs");
const { ethers, Interface } = require("ethers");

async function main() {
    // load address from deployments.json
    const addresses = JSON.parse(fs.readFileSync("scripts/deployments.json", "utf8"));
    const tokenA = addresses.tokenA;
    const tokenB = addresses.tokenB;
    const dex = addresses.dex;
    const coordinator = addresses.coordinator;

    const signer = await hre.ethers.getSigners();
    const keyper = signer[3]; // Pick signer[3], keyper's account
    const attacker = signer[2]; // Pick signer[2], attacker's account
    const user = signer[1]; // Pick signer[1], victim's account

    // Get ABI from the contract factory
    const Token = await hre.ethers.getContractFactory("Token");
    const Dex = await hre.ethers.getContractFactory("Dex");
    const Coordinator = await hre.ethers.getContractFactory("Coordinator");

    // Create a contract instances
    const TokenA = new ethers.Contract(tokenA, Token.interface, keyper);
    const TokenB = new ethers.Contract(tokenB, Token.interface, keyper);
    const DEX = new ethers.Contract(dex, Dex.interface, keyper);
    const CordinatoR = new ethers.Contract(coordinator, Coordinator.interface, keyper);

    // Define the ABI of the function
    const abi = ["function swap(address tokenIn, uint256 amountIn)"];
    const iface = new Interface(abi);

    // Get array length
    const length = await CordinatoR.decryptedTxCount();

    for (let index = 0; index < length; index++){
        // fetch the decrypted txs
        const [addr, payload] = await CordinatoR.getDecryptedTx(index);
        console.log("Target address:",addr);
        console.log("Payload:",payload);

        // Decode the payload data
        const decoded = iface.decodeFunctionData("swap", payload);

        // Access the decoded values
        console.log("Decoded tokenIn address:", decoded.tokenIn);
        console.log("Decoded amountIn:", decoded.amountIn.toString());

        // Set sender's address to be attacker and victim
        let sender;
        if(index === 0)
        {
            sender = attacker;
        }
        else{
            sender = user;
        }

        // Check user's token balances before swap
        const userBalanceA_before = await TokenA.balanceOf(sender.address);
        const userBalanceB_before = await TokenB.balanceOf(sender.address);
       
        // check if sender has enough token to swap
        if(userBalanceA_before >= decoded.amountIn)
        {
            // need approval before swapping
            await TokenA.connect(sender).approve(await DEX.getAddress(), decoded.amountIn);
            // sender performs swap: TokenA -> TokenB
            await DEX.connect(sender).swap(await decoded.tokenIn, decoded.amountIn);
            
            // Check keyper's token balances after swap
            const userBalanceA_after = await TokenA.balanceOf(sender.address);
            const userBalanceB_after = await TokenB.balanceOf(sender.address);

            console.log("user TokenA balance before swap:", hre.ethers.formatEther(userBalanceA_before));
            console.log("user TokenB balance before swap:", hre.ethers.formatEther(userBalanceB_before));

            console.log("user TokenA balance after swap:", hre.ethers.formatEther(userBalanceA_after));
            console.log("user TokenB balance after swap:", hre.ethers.formatEther(userBalanceB_after));
        }
        else
        {
            console.log("failure: index", index);
        }
    }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});