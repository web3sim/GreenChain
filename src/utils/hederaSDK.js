/* Hedera SDK for proper smart contract interaction */
import {
  Client,
  ContractCallQuery,
  ContractId,
  Hbar
} from "@hashgraph/sdk";
import { ethers } from "ethers";

// Convert Ethereum address to Hedera Contract ID
export function addressToContractId(ethereumAddress) {
  // For your specific contract, use the known Hedera Contract ID
  if (ethereumAddress.toLowerCase() === "0x68eda53448d0ded662a2891064cb7d094c53eccd") {
    return ContractId.fromString("0.0.6519500");
  }
  
  // For other contracts, try to convert (though this may not always work)
  try {
    const addressNumber = parseInt(ethereumAddress.slice(2), 16);
    return ContractId.fromString(`0.0.${addressNumber}`);
  } catch (error) {
    console.error("Failed to convert address to contract ID:", error);
    throw new Error(`Cannot convert address ${ethereumAddress} to Hedera Contract ID`);
  }
}

// Create Hedera client for testnet
export function createHederaClient() {
  try {
    // Create client for testnet
    const client = Client.forTestnet();
    
    // For read-only queries, we can set a default operator for gas fees
    // Using a public testnet account for read operations (you may need to update this)
    // For production, you should use your own account
    try {
      // Set default operator for gas payment (needed even for queries)
      // You can create a free testnet account at portal.hedera.com
      // This is a placeholder - you should use your own testnet account
      client.setDefaultMaxQueryPayment(new Hbar(1));
      client.setDefaultMaxTransactionFee(new Hbar(2));
    } catch (operatorError) {
      console.warn("Could not set operator for Hedera client:", operatorError);
    }
    
    return client;
  } catch (error) {
    console.error("Failed to create Hedera client:", error);
    throw error;
  }
}

// Call a smart contract function using Hedera SDK (read-only)
export async function callContractFunction(contractAddress, functionName, parameters = null, gasLimit = 100000) {
  try {
    console.log("=== HEDERA SDK CONTRACT CALL ===");
    console.log("Contract Address:", contractAddress);
    console.log("Function:", functionName);
    
    const client = createHederaClient();
    const contractId = addressToContractId(contractAddress);
    
    console.log("Hedera Contract ID:", contractId.toString());
    
    // Create contract call query
    let query = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(gasLimit)
      .setFunction(functionName);
    
    // Add parameters if provided
    if (parameters) {
      query = query.setFunctionParameters(parameters);
    }
    
    console.log("Executing contract call query...");
    
    // Execute the query
    const result = await query.execute(client);
    
    console.log("Contract call result:", result);
    console.log("Raw result:", result.bytes);
    
    return result;
  } catch (error) {
    console.error("Hedera SDK contract call failed:", error);
    throw error;
  }
}

// Parse contract result using ethers ABI decoder
export function parseContractResult(result, abi, functionName) {
  try {
    // Create interface from ABI
    const contractInterface = new ethers.utils.Interface(abi);
    
    // Get the function fragment
    const functionFragment = contractInterface.getFunction(functionName);
    
    // Decode the result
    const decoded = contractInterface.decodeFunctionResult(functionFragment, result.bytes);
    
    console.log("Decoded result:", decoded);
    return decoded;
  } catch (error) {
    console.error("Failed to parse contract result:", error);
    throw error;
  }
}

// Get marketplace items using Hedera SDK
export async function fetchMarketItemsWithHedera(contractAddress, abi) {
  try {
    console.log("=== FETCHING MARKET ITEMS WITH HEDERA SDK ===");
    
    const result = await callContractFunction(contractAddress, "fetchMarketItems");
    
    // Parse the result using the provided ABI
    const decoded = parseContractResult(result, abi, "fetchMarketItems");
    console.log("Market items result:", decoded);
    
    return decoded && decoded[0] ? decoded[0] : [];
  } catch (error) {
    console.error("Failed to fetch market items with Hedera SDK:", error);
    throw error;
  }
}

// Check if contract exists using Hedera SDK
export async function checkContractExists(contractAddress) {
  try {
    console.log("Checking if contract exists:", contractAddress);
    
    const client = createHederaClient();
    const contractId = addressToContractId(contractAddress);
    
    // Try a simple query to see if contract responds
    const query = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(50000)
      .setFunction("owner"); // Most contracts have an owner function
    
    await query.execute(client);
    console.log("Contract exists and is responsive");
    return true;
  } catch (error) {
    console.warn("Contract not responsive or doesn't exist:", error.message);
    return false;
  }
}
