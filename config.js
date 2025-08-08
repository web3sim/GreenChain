
export const wastemarketplaceAddress = "0x68eda53448d0ded662a2891064cb7d094c53eccd";

// Hedera Testnet Configuration  
export const HEDERA_TESTNET_CONFIG = {
  chainId: "0x128", // 296 in decimal
  chainName: "Hedera Testnet",
  nativeCurrency: {
    name: "HBAR",
    symbol: "HBAR",
    decimals: 18, // Weibars (18 decimals) for EthereumTransaction
  },
  rpcUrls: ["https://testnet.hashio.io/api"],
  blockExplorerUrls: ["https://hashscan.io/testnet"],
  blockGasLimit: 30000000,
};

// Primary JSON-RPC endpoint for transactions
export const RPC_URL = "https://testnet.hashio.io/api";

// Mirror Node REST API for queries (more reliable for contract calls)
export const MIRROR_NODE_URL = "https://testnet.mirrornode.hedera.com";

// Explorer URL
export const EXPLORER_URL = "https://hashscan.io/testnet";

// Hedera-specific settings
export const HEDERA_CONFIG = {
  minGasPrice: "350000000000", // 350 gwei minimum on Hedera
  maxGasLimit: 15000000, // 15M gas max per transaction
  contractCreationGas: 3000000, // 3M gas for contract creation
  chainId: 296,
  networkName: "hedera-testnet"
};

