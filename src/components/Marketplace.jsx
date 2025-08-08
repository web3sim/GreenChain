/* eslint-disable no-use-before-define */
/* Marketplace component for browsing and purchasing available waste NFTs */
import { ethers } from "ethers";
import { useEffect, useState } from "react";
import axios from "axios";
import Web3Modal from "web3modal";

import Waste from "../utils/Waste.json";
import { wastemarketplaceAddress, RPC_URL } from "../../config";
import { getIPFSGatewayURL } from "../utils/decentralizedStorage";

export default function Marketplace() {
  const [nfts, setNfts] = useState([]);
  const [loadingState, setLoadingState] = useState("not-loaded");

  useEffect(() => {
    loadMarketplace();
  }, []);

  // Load marketplace items from contract
  async function loadMarketplace() {
    try {
      // Method 1: Try direct RPC connection
      const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
      const contract = new ethers.Contract(wastemarketplaceAddress, Waste.abi, provider);
      
      try {
        const data = await contract.fetchMarketItems();
        
        if (data && data.length > 0) {
          const items = await Promise.all(data.map(async (item) => {
            try {
              const tokenUri = await contract.tokenURI(item.tokenId);
              const httpUri = getIPFSGatewayURL(tokenUri);
              const meta = await axios.get(httpUri);
              const price = ethers.utils.formatUnits(item.price.toString(), "ether");

              return {
                price,
                tokenId: item.tokenId.toNumber(),
                image: meta.data.image ? getIPFSGatewayURL(meta.data.image) : meta.data.imageUrl || "",
                name: meta.data.name,
                description: meta.data.description,
                country: meta.data.properties?.country || "",
                collectionPoint: meta.data.properties?.collectionPoint || "",
                weight: meta.data.properties?.weight || "",
              };
            } catch (itemError) {
              console.warn("Error processing item:", itemError);
              return null;
            }
          }));
          
          const validItems = items.filter(Boolean);
          if (validItems.length > 0) {
            setNfts(validItems);
            setLoadingState("loaded");
            return;
          }
        }
      } catch (rpcError) {
        console.warn("❌ RPC call failed:", rpcError.message);
      }
      
      // Method 2: Try wallet connection if available
      try {
        const web3Modal = new Web3Modal();
        const connection = await web3Modal.connect();
        const provider2 = new ethers.providers.Web3Provider(connection);
        const signer = provider2.getSigner();
        const contract2 = new ethers.Contract(wastemarketplaceAddress, Waste.abi, signer);
        
        const data2 = await contract2.fetchMarketItems();
        
        if (data2 && data2.length > 0) {
          const items = await Promise.all(data2.map(async (item) => {
            try {
              const tokenUri = await contract2.tokenURI(item.tokenId);
              const httpUri = getIPFSGatewayURL(tokenUri);
              const meta = await axios.get(httpUri);
              const price = ethers.utils.formatUnits(item.price.toString(), "ether");

              return {
                price,
                tokenId: item.tokenId.toNumber(),
                image: meta.data.image ? getIPFSGatewayURL(meta.data.image) : meta.data.imageUrl || "",
                name: meta.data.name,
                description: meta.data.description,
                country: meta.data.properties?.country || "",
                collectionPoint: meta.data.properties?.collectionPoint || "",
                weight: meta.data.properties?.weight || "",
              };
            } catch (itemError) {
              console.warn("Error processing wallet item:", itemError);
              return null;
            }
          }));
          
          const validItems = items.filter(Boolean);
          if (validItems.length > 0) {
            setNfts(validItems);
            setLoadingState("loaded");
            return;
          }
        }
      } catch (walletError) {
        console.warn("❌ Wallet connection failed:", walletError.message);
      }
      
      // No items found - show empty marketplace
      setNfts([]);
      setLoadingState("loaded");
    } catch (error) {
      console.error("❌ Complete marketplace load failure:", error);
      setNfts([]);
      setLoadingState("loaded");
    }
  }

  // Buy NFT function
  async function buyNft(nft) {
    try {
      const web3Modal = new Web3Modal();
      const connection = await web3Modal.connect();
      const provider = new ethers.providers.Web3Provider(connection);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(wastemarketplaceAddress, Waste.abi, signer);

      const price = ethers.utils.parseUnits(nft.price.toString(), "ether");
      const transaction = await contract.createMarketSale(nft.tokenId, {
        value: price,
      });

      await transaction.wait();
      alert(`Successfully purchased ${nft.name}!`);
      loadMarketplace(); // Refresh marketplace
    } catch (error) {
      console.error("Purchase failed:", error);
      alert(`Purchase failed: ${error.message}`);
    }
  }

  return (
    <div className="flex justify-center">
      <div className="px-4" style={{ maxWidth: "1600px" }}>
        {loadingState === "not-loaded" && (
          <h1 className="py-10 px-20 text-3xl text-white text-center">
            Loading marketplace...
          </h1>
        )}
        {loadingState === "loaded" && (
          nfts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
              {nfts.map((nft, i) => (
              <div key={i} className="border shadow rounded-xl overflow-hidden bg-white">
                <img
                  alt={nft.name}
                  src={nft.image}
                  className="py-3 object-fill h-500"
                />
                <div className="p-1">
                  <p style={{ height: "34px" }} className="text-xl text-green-400 font-semibold">Category: {nft.name}</p>
                  <div style={{ height: "40px", overflow: "hidden" }}>
                    <p className=" text-black">Description: {nft.description}</p>
                  </div>
                  <p style={{ height: "34px" }} className="text-xl text-black font-semibold">Country : {nft.country}</p>
                  <div style={{ height: "40px", overflow: "hidden" }}>
                    <p className=" text-black">Collection Point: {nft.collectionPoint}</p>
                  </div>
                  <p className="text-xl font-bold text-black"> Weight(Kg): {nft.weight}</p>
                  <p className="text-xl font-bold text-green-400">Sale Price: {nft.price} HBAR</p>
                </div>

                <div className="p-2 bg-black">
                  <button
                    type="button"
                    className="mt-4 w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-12 rounded transition-colors"
                    onClick={() => {
                      buyNft(nft);
                    }}
                  >
                    Buy for {nft.price} HBAR
                  </button>
                </div>
              </div>
            ))}
              </div>
            ) : (
              <div className="text-center text-white">
                <h1 className="px-20 py-10 text-3xl">No items available in marketplace</h1>
                <p className="text-lg mb-4">No waste NFTs are currently listed for sale.</p>
                <p className="text-sm text-gray-300 mb-6">
                  Be the first to create and list a waste NFT for others to purchase!
                </p>
                <p className="text-sm text-gray-300 mb-6">
                  If you recently created an item and don&apos;t see it, please wait a few minutes for Hedera indexing and refresh the page.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setLoadingState("not-loaded");
                    loadMarketplace();
                  }}
                  className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition-colors"
                >
                  Refresh Marketplace
                </button>
              </div>
            )
        )}
      </div>
    </div>
  );
}
