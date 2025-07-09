const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  const Token = await hre.ethers.getContractFactory("Token", deployer);
  const tokenA = await Token.deploy("Token A", "TKA");
  await tokenA.waitForDeployment();
  const tokenB = await Token.deploy("Token B", "TKB");
  await tokenB.waitForDeployment();

  const tokenAAddress = await tokenA.getAddress();
  const tokenBAddress = await tokenB.getAddress();

  const Dex = await hre.ethers.getContractFactory("Dex");
  const dex = await Dex.deploy(tokenAAddress, tokenBAddress);
  await dex.waitForDeployment();

  const dexAddress = await dex.getAddress();

  const Coordinator = await hre.ethers.getContractFactory("Coordinator");
  const coordinator = await Coordinator.deploy();
  await coordinator.waitForDeployment();

  const coordinatorAddress = await coordinator.getAddress();

  const deployerAddress = await deployer.getAddress();

  console.log("Deployer address:", deployerAddress);
  console.log("Token A deployed at:", tokenAAddress);
  console.log("Token B deployed at:", tokenBAddress);
  console.log("Dex deployed at:", dexAddress);
  console.log("Coordinator deployed at:", coordinatorAddress);

  // Owner approves Dex to spend tokens
  const liquidityAmount = hre.ethers.parseEther("5000");
  await tokenA.approve(await dex.getAddress(), liquidityAmount);
  await tokenB.approve(await dex.getAddress(), liquidityAmount);

  // Owner adds liquidity by transferring tokens to Dex
  await tokenA.transfer(await dex.getAddress(), liquidityAmount);
  await tokenB.transfer(await dex.getAddress(), liquidityAmount);

  console.log("Liquidity added: 5000 TKA and 5000 TKB");

  // Save to file
  const deploymentData = {
    deployer: deployerAddress,
    tokenA: tokenAAddress,
    tokenB: tokenBAddress,
    dex: dexAddress,
    coordinator: coordinatorAddress,
  };

  const filePath = path.join(__dirname, "deployments.json");
  fs.writeFileSync(filePath, JSON.stringify(deploymentData, null, 2));

  console.log("Deployment addresses saved to deployments.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
