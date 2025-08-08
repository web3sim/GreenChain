// Utility functions for Hedera contract interaction
import axios from "axios";
import { MIRROR_NODE_URL } from "../../config";

// Get contract info via Mirror Node API
export const getContractInfo = async (contractId) => {
  try {
    const response = await axios.get(`${MIRROR_NODE_URL}/api/v1/contracts/${contractId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching contract info:", error);
    return null;
  }
};

// Get contract call results via Mirror Node API
export const getContractCallResults = async (contractAddress, limit = 10) => {
  try {
    const response = await axios.get(
      `${MIRROR_NODE_URL}/api/v1/contracts/${contractAddress}/results?limit=${limit}&order=desc`
    );
    return response.data.results || [];
  } catch (error) {
    console.error("Error fetching contract call results:", error);
    return [];
  }
};

// Check if contract exists and is active via Mirror Node
/**
 * Check if contract is still active via Mirror Node
 */
export const isContractActive = async (contractAddress) => {
  try {
    const response = await axios.get(`${MIRROR_NODE_URL}/contracts/${contractAddress}`);
    return response.data && !response.data.deleted;
  } catch (error) {
    console.warn("Error checking contract status via Mirror Node:", error);
    return true; // Assume active if we can't check
  }
};

/**
 * Get contract transaction history to understand state
 */
export const getContractTransactions = async (contractAddress, limit = 20) => {
  try {
    // Convert EVM address to Hedera format if needed
    let contractId = contractAddress;
    if (contractAddress.startsWith("0x")) {
      // For now, use the known contract ID
      contractId = "0.0.6519500";
    }
    
    const response = await axios.get(`${MIRROR_NODE_URL}/contracts/${contractId}/results?limit=${limit}&order=desc`);
    return response.data.results || [];
  } catch (error) {
    console.warn("Error fetching contract transactions:", error);
    return [];
  }
};

/**
 * Check if specific NFT tokens exist for this contract
 */
export const getContractNFTs = async (contractAddress) => {
  try {
    const transactions = await getContractTransactions(contractAddress);
    
    // Look for successful NFT creation transactions
    const nftCreations = transactions.filter((tx) => (
      tx.call_result &&
      tx.call_result !== "0x" &&
      tx.error_message === null &&
      tx.function_parameters &&
      tx.function_parameters.includes("72b3b620") // createToken function signature
    ));
    
    console.log("Found NFT creation transactions:", nftCreations);
    
    // Extract token IDs from successful transactions
    const tokenIds = nftCreations.map((tx) => {
      if (tx.call_result && tx.call_result.length >= 66) {
        // call_result is hex, extract the token ID
        const tokenIdHex = tx.call_result.slice(-64);
        const tokenId = parseInt(tokenIdHex, 16);
        return tokenId;
      }
      return null;
    }).filter((id) => id !== null);
    
    return tokenIds;
  } catch (error) {
    console.warn("Error getting contract NFTs:", error);
    return [];
  }
};

// Get the latest successful contract transactions
export const getLatestContractActivity = async (contractAddress, functionName = null) => {
  try {
    const results = await getContractCallResults(contractAddress, 20);
    
    if (functionName) {
      // Filter by function name if provided
      return results.filter((result) => result.function_parameters && result.function_parameters.includes(functionName));
    }
    
    return results;
  } catch (error) {
    console.error("Error fetching contract activity:", error);
    return [];
  }
};

// Enhanced error handler for Hedera-specific issues
/**
 * Verify contract existence and functionality using multiple methods
 */
export const verifyContractComprehensive = async (contractAddress, contractABI, provider) => {
  const results = {
    rpcWorking: false,
    mirrorNodeConfirmed: false,
    contractExists: false,
    canCallFunctions: false,
    recommendedApproach: "unknown"
  };
  
  try {
    // Method 1: Check contract bytecode via RPC
    try {
      const code = await provider.getCode(contractAddress);
      if (code !== "0x") {
        results.contractExists = true;
        console.log("✅ Contract bytecode confirmed via RPC");
      }
    } catch (codeError) {
      console.warn("❌ Cannot verify contract bytecode via RPC:", codeError.message);
    }
    
    // Method 2: Try a simple contract call
    try {
      const contract = new (await import("ethers")).Contract(contractAddress, contractABI, provider);
      await contract.name();
      results.canCallFunctions = true;
      results.rpcWorking = true;
      results.recommendedApproach = "rpc";
      console.log("✅ Contract functions work via RPC");
    } catch (callError) {
      console.warn("❌ Contract function calls fail via RPC:", callError.message);
      results.recommendedApproach = "wallet";
    }
    
    // Method 3: Verify via Mirror Node API
    try {
      const contractInfo = await getContractInfo(contractAddress);
      if (contractInfo && !contractInfo.deleted) {
        results.mirrorNodeConfirmed = true;
        results.contractExists = true;
        console.log("✅ Contract confirmed active via Mirror Node");
      }
    } catch (mirrorError) {
      console.warn("❌ Mirror Node verification failed:", mirrorError.message);
    }
    
    // Determine final recommendation
    if (results.rpcWorking) {
      results.recommendedApproach = "rpc";
    } else if (results.mirrorNodeConfirmed) {
      results.recommendedApproach = "wallet-with-mirror-fallback";
    } else {
      results.recommendedApproach = "retry-later";
    }
    
    return results;
  } catch (error) {
    console.error("Comprehensive contract verification failed:", error);
    return results;
  }
};

/**
 * Enhanced error handling for Hedera-specific contract interaction issues
 */
export const handleHederaError = (error) => {
  const errorMessage = error.message || error.toString();
  
  // Hedera-specific error patterns
  if (errorMessage.includes("call revert exception") && errorMessage.includes("data=\"0x\"")) {
    return {
      type: "Hedera RPC Indexing Delay",
      message: "Hedera RPC indexing delay detected. The contract exists but RPC is slow to respond.",
      suggestion: "Try using wallet connection instead of RPC, or wait for indexing to complete.",
      shouldRetry: true,
      retryDelay: 30000,
      alternativeApproach: "Use wallet connection or Mirror Node API"
    };
  }
  
  if (errorMessage.includes("transaction underpriced")) {
    return {
      type: "Gas Price Too Low",
      message: "Transaction gas price is below Hedera minimum (350 gwei).",
      suggestion: "Increase gas price to at least 350 gwei.",
      shouldRetry: true,
      retryDelay: 5000
    };
  }
  
  if (errorMessage.includes("insufficient funds")) {
    return {
      type: "Insufficient HBAR",
      message: "Insufficient HBAR balance for transaction fees.",
      suggestion: "Add HBAR to your wallet from the Hedera faucet.",
      shouldRetry: false
    };
  }
  
  if (errorMessage.includes("network not supported") || errorMessage.includes("chain")) {
    return {
      type: "Network Configuration",
      message: "Wallet not connected to Hedera Testnet.",
      suggestion: "Switch to Hedera Testnet (Chain ID: 296) in your wallet.",
      shouldRetry: false
    };
  }
  
  // Generic fallback
  return {
    type: "Contract Error",
    message: errorMessage,
    suggestion: "Check your connection and try again, or try using wallet connection.",
    shouldRetry: true,
    retryDelay: 10000,
    alternativeApproach: "Try wallet connection instead of RPC"
  };
};
