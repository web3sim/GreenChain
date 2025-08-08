/* eslint-disable no-trailing-spaces */
const hre = require("hardhat");

async function main() {
  console.log("🔍 Checking contract deployment status...");
  
  // Current contract address from config.js
  const contractAddress = "0x7CDaAb0408c131B751d11C1D14cb7BBe6D7097ED";
  
  const provider = new hre.ethers.providers.JsonRpcProvider("https://testnet.hashio.io/api");
  
  try {
    console.log("📍 Checking address:", contractAddress);
    
    // Check if contract exists
    const code = await provider.getCode(contractAddress);
    if (code === "0x") {
      console.log("❌ No contract found at this address");
      console.log("🚀 You need to deploy a new contract!");
      console.log("Run: npm run deploy:hedera");
      return;
    }
    
    console.log("✅ Contract exists at address");
    
    // Try to interact with it
    const Waste = await hre.ethers.getContractFactory("Waste");
    const contract = Waste.attach(contractAddress);
    
    try {
      const name = await contract.name();
      const symbol = await contract.symbol();
      console.log("📛 Contract name:", name);
      console.log("🔖 Contract symbol:", symbol);
      
      // Try to get market items
      try {
        const items = await contract.fetchMarketItems();
        console.log("📦 Market items count:", items.length);
        
        if (items.length === 0) {
          console.log("💡 Contract is working but has no items yet");
          console.log("✨ Try minting an NFT to test the marketplace!");
        } else {
          console.log("🎉 Found", items.length, "items in marketplace");
        }
      } catch (fetchError) {
        console.log("⚠️  Error fetching market items:", fetchError.message);
      }
      
    } catch (interactionError) {
      console.log("❌ Error interacting with contract:", interactionError.message);
    }
    
  } catch (error) {
    console.error("🚨 Error checking deployment:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
