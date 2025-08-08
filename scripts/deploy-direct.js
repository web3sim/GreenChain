require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');

async function deployDirect() {
  try {
    console.log("🚀 Direct deployment to Hedera Testnet...");
    
    // Setup provider and wallet
    const provider = new ethers.providers.JsonRpcProvider('https://testnet.hashio.io/api');
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    console.log("📍 Deploying from:", wallet.address);
    
    // Read contract artifacts
    const contractPath = './artifacts/contracts/WasteMarketplace.sol/Waste.json';
    const contractArtifact = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
    
    console.log("📦 Creating contract factory...");
    const contractFactory = new ethers.ContractFactory(
      contractArtifact.abi,
      contractArtifact.bytecode,
      wallet
    );
    
    console.log("🚀 Deploying contract...");
    const contract = await contractFactory.deploy({
      gasLimit: 3000000,
      gasPrice: ethers.utils.parseUnits("350", "gwei") // Hedera minimum
    });
    
    console.log("⏳ Waiting for deployment...");
    await contract.deployed();
    
    console.log("✅ Contract deployed to:", contract.address);
    console.log("📍 Explorer: https://hashscan.io/testnet/contract/" + contract.address);
    
    // Test the contract
    try {
      const name = await contract.name();
      const symbol = await contract.symbol();
      console.log("📛 Name:", name);
      console.log("🔖 Symbol:", symbol);
      console.log("🎉 Contract is working!");
    } catch (testError) {
      console.log("⚠️  Contract test failed:", testError.message);
    }
    
    console.log("\n🔧 Update your config.js:");
    console.log('export const wastemarketplaceAddress = "' + contract.address + '";');
    
  } catch (error) {
    console.error("❌ Deployment failed:", error.message);
    if (error.reason) console.error("Reason:", error.reason);
  }
}

deployDirect();
