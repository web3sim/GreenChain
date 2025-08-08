import { HEDERA_TESTNET_CONFIG } from "../../config";

/**
 * Add Hedera Testnet to MetaMask
 * @returns {Promise<boolean>} - Returns true if successful, false otherwise
 */
export const addHederaTestnetToMetaMask = async () => {
  if (!window.ethereum) {
    alert("Please install MetaMask to use this feature");
    return false;
  }

  try {
    // Try to switch to Hedera Testnet
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: HEDERA_TESTNET_CONFIG.chainId }],
    });
    return true;
  } catch (switchError) {
    // This error code indicates that the chain has not been added to MetaMask
    if (switchError.code === 4902) {
      try {
        // Add the Hedera Testnet to MetaMask
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [HEDERA_TESTNET_CONFIG],
        });
        return true;
      } catch (addError) {
        console.error("Failed to add Hedera Testnet to MetaMask:", addError);
        return false;
      }
    } else {
      console.error("Failed to switch to Hedera Testnet:", switchError);
      return false;
    }
  }
};

/**
 * Check if user is connected to Hedera Testnet
 * @returns {Promise<boolean>} - Returns true if connected to Hedera Testnet
 */
export const isHederaTestnet = async () => {
  if (!window.ethereum) return false;
  
  try {
    const chainId = await window.ethereum.request({ method: "eth_chainId" });
    return chainId === HEDERA_TESTNET_CONFIG.chainId;
  } catch (error) {
    console.error("Error checking network:", error);
    return false;
  }
};
