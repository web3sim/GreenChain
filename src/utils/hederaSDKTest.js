/* Test file to check if Hedera SDK can be imported */

// Simple function that doesn't require Hedera SDK to test if the module loads
export function testBasicFunction() {
  console.log("✅ Basic function works - module loading OK");
  return true;
}

// Try to import and use Hedera SDK components
export async function testHederaSDKImport() {
  try {
    // Dynamic import to catch any issues
    const hederaSDK = await import("@hashgraph/sdk");
    console.log("✅ Hedera SDK imported successfully");
    console.log("Available exports:", Object.keys(hederaSDK));
    
    // Test basic functionality
    const { Client } = hederaSDK;
    const client = Client.forTestnet();
    console.log("✅ Hedera client created successfully");
    
    return true;
  } catch (error) {
    console.error("❌ Error importing Hedera SDK:", error);
    return false;
  }
}

// Test contract address conversion without Hedera SDK
export function testAddressConversion(ethereumAddress) {
  // Our known mapping for the specific contract
  if (ethereumAddress === "0x68eda53448d0ded662a2891064cb7d094c53eccd") {
    return "0.0.6519500";
  }
  
  // For other contracts, try to convert (though this may not always work)
  try {
    const addressNumber = parseInt(ethereumAddress.slice(2), 16);
    return `0.0.${addressNumber}`;
  } catch (error) {
    console.error("Failed to convert address to contract ID:", error);
    throw new Error(`Cannot convert address ${ethereumAddress} to Hedera Contract ID`);
  }
}
