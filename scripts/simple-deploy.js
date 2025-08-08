require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');

async function simpleDeployment() {
  try {
    console.log("🚀 Simple deployment to Hedera Testnet...");
    
    // Setup
    const provider = new ethers.providers.JsonRpcProvider("https://testnet.hashio.io/api");
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    console.log("📍 Deploying from:", wallet.address);
    
    // Get balance
    const balance = await wallet.getBalance();
    console.log("💰 Balance:", ethers.utils.formatEther(balance), "HBAR");
    
    // Read contract
    const artifact = JSON.parse(fs.readFileSync('./artifacts/contracts/WasteMarketplace.sol/Waste.json', 'utf8'));
    
    // Create factory
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
    
    console.log("📦 Deploying with minimal settings...");
    
    // Deploy with minimal settings
    const contract = await factory.deploy();
    
    console.log("🧾 Transaction hash:", contract.deployTransaction.hash);
    console.log("⏳ Waiting for confirmation...");
    
    // Wait for deployment
    const receipt = await contract.deployTransaction.wait(1);
    
    console.log("✅ Deployed to:", contract.address);
    console.log("⛽ Gas used:", receipt.gasUsed.toString());
    console.log("📍 HashScan:", "https://hashscan.io/testnet/contract/" + contract.address);
    
    // Wait a bit then test
    console.log("⏳ Waiting 5 seconds for contract to be ready...");
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    try {
      const name = await contract.name();
      console.log("🎉 Contract verified! Name:", name);
    } catch (testError) {
      console.log("⚠️  Contract needs more time to be ready");
    }
    
    console.log("\n🔧 Update config.js:");
    console.log(`export const wastemarketplaceAddress = "${contract.address}";`);
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.transaction) {
      console.log("TX Hash:", error.transaction.hash);
    }
  }
}

simpleDeployment();
