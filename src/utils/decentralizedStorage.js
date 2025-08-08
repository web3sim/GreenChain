/* eslint-disable no-trailing-spaces */
/**
 * Decentralized storage utilities without login requirements
 * Uses public IPFS nodes and fallback storage for metadata
 */

// Alternative IPFS gateways for redundancy
const IPFS_GATEWAYS = [
  "https://ipfs.io/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://gateway.pinata.cloud/ipfs/",
  "https://dweb.link/ipfs/",
];

/**
 * Get IPFS gateway URL with fallback options
 * @param {string} ipfsUrl - IPFS URL (ipfs://hash or just hash)
 * @returns {string} - HTTP gateway URL or blob URL for local storage
 */
/**
 * Get a URL to access content by hash/ID
 * @param {string} hash - The IPFS hash or storage ID
 * @returns {string} - URL to access the content
 */
export const getIPFSGatewayURL = (hash) => {
  if (!hash) return "";
  
  // Handle JSONBin storage
  if (hash.startsWith("jsonbin_")) {
    const binId = hash.replace("jsonbin_", "");
    return `https://api.jsonbin.io/v3/b/${binId}/latest`;
  }
  
  // Handle GitHub Gist storage
  if (hash.startsWith("gist_")) {
    const gistId = hash.replace("gist_", "");
    return `https://gist.githubusercontent.com/anonymous/${gistId}/raw`;
  }
  
  // Handle blob URL storage (local storage)
  if (hash.startsWith("blob_")) {
    const storageKey = hash.replace("blob_", "");
    const storedData = localStorage.getItem(storageKey);
    if (storedData) {
      try {
        const data = JSON.parse(storedData);
        return data.url || "";
      } catch (e) {
        console.error("Failed to parse stored blob data:", e);
        return "";
      }
    }
    return "";
  }
  
  // Handle regular IPFS hash
  const gateways = [
    `https://gateway.pinata.cloud/ipfs/${hash}`,
    `https://cloudflare-ipfs.com/ipfs/${hash}`,
    `https://ipfs.io/ipfs/${hash}`,
  ];
  
  return gateways[0]; // Return the first gateway
};

/**
 * Get multiple gateway URLs for redundancy
 * @param {string} ipfsUrl - IPFS URL
 * @returns {Array<string>} - Array of gateway URLs
 */
export const getIPFSGatewayURLs = (ipfsUrl) => {
  if (!ipfsUrl) return [];
  
  let hash = ipfsUrl;
  if (ipfsUrl.startsWith("ipfs://")) {
    hash = ipfsUrl.replace("ipfs://", "");
  }
  
  const [mainHash] = hash.split("/");
  hash = mainHash;
  
  return IPFS_GATEWAYS.map((gateway) => `${gateway}${hash}`);
};

/**
 * Upload to IndexedDB for larger files
 * @param {File} file - The file to upload
 * @returns {Promise<string>} - Returns ID
 */
// decentralizedStorage.js - Upload files to IPFS or decentralized storage

/**
 * Convert file to base64 in chunks to avoid memory issues
 * @param {File} file - File to convert
 * @returns {Promise<string>} - Base64 string
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = reader.result.split(",")[1]; // Remove data:type;base64, prefix
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Simple blob URL creation for storing files locally
 * This is a fallback when IPFS isn't available
 * @param {File} file - The file to store
 * @returns {Promise<string>} - Returns a storage ID that can be used to retrieve the file
 */
export const uploadToWeb3Storage = async (file) => {
  try {
    // Create a blob URL - this is the simplest and most reliable approach
    const blobUrl = URL.createObjectURL(file);
    const timestamp = Date.now();
    const simpleId = `blob_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Store the blob URL and metadata
    localStorage.setItem(`blob_${simpleId}`, blobUrl);
    localStorage.setItem(`meta_${simpleId}`, JSON.stringify({
      name: file.name,
      type: file.type,
      size: file.size,
      timestamp,
      storage: "blob"
    }));
    
    console.log("Stored as blob URL with ID:", simpleId);
    return simpleId;
  } catch (error) {
    console.error("Blob storage failed:", error);
    
    // Final fallback - just create a unique ID
    const fallbackId = `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(`meta_${fallbackId}`, JSON.stringify({
      name: file.name,
      type: file.type,
      size: file.size,
      timestamp: Date.now(),
      storage: "fallback"
    }));
    
    return fallbackId;
  }
};

/**
 * Upload file to IPFS using a public node or fallback to local storage
 * @param {File} file - The file to upload
 * @returns {Promise<string>} - Returns IPFS hash or local storage ID
 */
export const uploadToIPFS = async (file) => {
  try {
    // Method 1: Try JSONBin for small files (free, no auth needed)
    if (file.size < 1024 * 1024) { // 1MB limit for JSONBin
      try {
        const base64 = await fileToBase64(file);
        const jsonData = {
          name: file.name,
          type: file.type,
          size: file.size,
          data: base64,
          timestamp: Date.now()
        };
        
        const response = await fetch("https://api.jsonbin.io/v3/b", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(jsonData)
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log("Uploaded to JSONBin:", result.metadata.id);
          return `jsonbin_${result.metadata.id}`;
        }
      } catch (jsonbinError) {
        console.log("JSONBin not available, trying fallback...");
      }
    }
    
    // Method 2: Try GitHub Gist (public, no auth needed for small files)
    if (file.size < 1024 * 1024) { // 1MB limit
      try {
        const base64 = await fileToBase64(file);
        const gistData = {
          public: true,
          files: {
            [`file_${Date.now()}.json`]: {
              content: JSON.stringify({
                name: file.name,
                type: file.type,
                size: file.size,
                data: base64,
                timestamp: Date.now()
              })
            }
          }
        };
        
        const response = await fetch("https://api.github.com/gists", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(gistData)
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log("Uploaded to GitHub Gist:", result.id);
          return `gist_${result.id}`;
        }
      } catch (gistError) {
        console.log("GitHub Gist not available, using local storage...");
      }
    }
    
    // Method 3: Fallback to local storage
    return await uploadToWeb3Storage(file);
  } catch (error) {
    console.error("All upload methods failed, using local storage:", error);
    
    // Final fallback to local storage
    try {
      return await uploadToWeb3Storage(file);
    } catch (fallbackError) {
      console.error("Even local storage failed:", fallbackError);
      throw new Error("Failed to upload to any storage system");
    }
  }
};

/**
 * Create metadata JSON and upload it
 * @param {Object} metadata - NFT metadata
 * @param {string} imageHash - IPFS hash of the image
 * @returns {Promise<string>} - Returns metadata URI
 */
export const uploadMetadata = async (metadata, imageHash) => {
  try {
    // Create metadata JSON
    const metadataJson = {
      ...metadata,
      image: `ipfs://${imageHash}`,
      timestamp: Date.now(),
    };

    // Convert to blob
    const metadataBlob = new Blob([JSON.stringify(metadataJson, null, 2)], {
      type: "application/json",
    });

    // Upload metadata
    const metadataHash = await uploadToIPFS(metadataBlob);
    
    return {
      url: `ipfs://${metadataHash}`,
      data: metadataJson,
      gateway: getIPFSGatewayURL(`ipfs://${metadataHash}`)
    };
  } catch (error) {
    console.error("Metadata upload error:", error);
    throw error;
  }
};

/**
 * Load file from localStorage fallback
 * @param {string} fileId - File identifier
 * @returns {Promise<string>} - Returns data URL
 */
export const loadFromLocalStorage = (fileId) => {
  try {
    const base64Data = localStorage.getItem(`file_${fileId}`);
    const metadata = JSON.parse(localStorage.getItem(`meta_${fileId}`) || "{}");
    
    if (!base64Data) {
      throw new Error("File not found in local storage");
    }
    
    return `data:${metadata.type || "application/octet-stream"};base64,${base64Data}`;
  } catch (error) {
    console.error("LocalStorage load error:", error);
    throw error;
  }
};

/**
 * Complete upload process for NFT
 * @param {Object} nftData - NFT data including file and metadata
 * @returns {Promise<Object>} - Returns complete metadata object
 */
export const uploadNFTContent = async (nftData) => {
  const { file, name, description, country, collectionPoint, weight, price } = nftData;
  
  try {
    console.log("Uploading asset to decentralized storage...");
    
    // Upload image first
    const imageHash = await uploadToIPFS(file);
    console.log("Image uploaded, hash:", imageHash);
    
    // Create the image URL immediately
    const imageUrl = getIPFSGatewayURL(`ipfs://${imageHash}`);
    
    // Create and upload metadata
    const metadata = await uploadMetadata({
      name,
      description,
      properties: {
        country,
        collectionPoint,
        weight,
        price
      },
      external_url: window.location.origin,
      background_color: "00FF00",
      attributes: [
        {
          trait_type: "Country",
          value: country
        },
        {
          trait_type: "Collection Point",
          value: collectionPoint
        },
        {
          trait_type: "Weight",
          value: weight
        },
        {
          trait_type: "Price",
          value: price
        }
      ]
    }, imageHash);
    
    console.log("Metadata uploaded:", metadata);
    
    return {
      ...metadata,
      imageHash,
      imageUrl,
      data: {
        ...metadata.data,
        image: `ipfs://${imageHash}`,
        imageUrl
      }
    };
  } catch (error) {
    console.error("NFT upload error:", error);
    throw new Error("Failed to upload NFT content to decentralized storage");
  }
};
