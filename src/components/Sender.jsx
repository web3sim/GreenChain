/* eslint-disable no-use-before-define */
/* pages/index.js */
import { ethers } from "ethers";
import { useEffect, useState } from "react";
import axios from "axios";
// import { useNavigate } from "react-router-dom";
import Web3Modal from "web3modal";

import Waste from "../utils/Waste.json";
import { wastemarketplaceAddress, RPC_URL } from "../../config";
import { getIPFSGatewayURL } from "../utils/decentralizedStorage";
import { handleHederaError, verifyContractComprehensive, getContractNFTs } from "../utils/hederaHelpers";

export default function Sender() {
//  const navigate = useNavigate();
  const [nfts, setNfts] = useState([]);
  const [loadingState, setLoadingState] = useState("not-loaded");
  useEffect(() => {
    // eslint-disable-next-line no-use-before-define
    loadWaste();
  }, []);

  // const rpcUrl = "https://matic-mumbai.chainstacklabs.com";
  // const rpcUrl = "http://localhost:8545";

  async function loadWaste() {
    try {
      console.log("Loading user's owned waste items...");
      
      // First try with web3Modal connection (more reliable for Hedera)
      let contract;
      let provider;
      
      try {
        console.log("Attempting wallet connection for better contract access...");
        const web3Modal = new Web3Modal();
        const connection = await web3Modal.connect();
        const web3Provider = new ethers.providers.Web3Provider(connection);
        const signer = web3Provider.getSigner();
        contract = new ethers.Contract(wastemarketplaceAddress, Waste.abi, signer);
        provider = web3Provider;
        console.log("Using wallet connection for contract calls");
      } catch (walletError) {
        console.warn("Wallet connection failed, falling back to RPC:", walletError);
        // Fallback to RPC provider
        provider = new ethers.providers.JsonRpcProvider(RPC_URL);
        contract = new ethers.Contract(wastemarketplaceAddress, Waste.abi, provider);
      }
      
      console.log("Contract address:", wastemarketplaceAddress);
      console.log("Provider:", provider);
      
      // Check contract existence - Hedera RPC can be slow to index
      try {
        const contractCode = await provider.getCode(wastemarketplaceAddress);
        if (contractCode === "0x") {
          console.warn("Contract code not found via RPC (possible indexing delay), but proceeding anyway...");
          // Don't return here - continue trying the contract call
        } else {
          console.log("Contract verified at address:", wastemarketplaceAddress);
        }
      } catch (codeError) {
        console.warn("Error checking contract code, but proceeding anyway:", codeError);
        // Continue execution - the contract might still work
      }
      
      // Try to fetch user's owned NFTs with better error handling for Hedera
      let data;
      try {
        console.log("Calling fetchMyNFTs to get user's owned items...");
        data = await contract.fetchMyNFTs();
        console.log("User's owned waste data fetched from contract:", data);
      } catch (fetchError) {
        console.error("Error calling fetchMyNFTs:", fetchError);
        
        // Use Hedera-specific error handling
        const errorInfo = handleHederaError(fetchError, "fetchMyNFTs");
        console.warn(`${errorInfo.type}: ${errorInfo.message}`);
        console.log(`Suggestion: ${errorInfo.suggestion}`);
        
        // Check if this is because the user has no items yet
        try {
          // Instead of calling name() which fails due to RPC indexing delay,
          // use comprehensive verification
          console.log("Verifying contract using multiple methods...");
          const verification = await verifyContractComprehensive(wastemarketplaceAddress, Waste.abi, provider);
          
          if (verification.mirrorNodeConfirmed) {
            console.log("✅ Contract confirmed via Mirror Node - user has no owned items yet");
            
            // Try to detect if any NFTs exist for this user via Mirror Node
            const existingNFTs = await getContractNFTs(wastemarketplaceAddress);
            if (existingNFTs.length > 0) {
              console.log(`Found ${existingNFTs.length} NFTs via Mirror Node, but none owned by current user`);
            }
          } else {
            console.log("⚠️ Contract verification inconclusive, assuming no items");
          }
          
          console.log(`Recommended approach: ${verification.recommendedApproach}`);
          setNfts([]);
          setLoadingState("loaded");
          return;
        } catch (verificationError) {
          const verificationErrorInfo = handleHederaError(verificationError);
          console.error(`Contract verification failed: ${verificationErrorInfo.message}`);
          console.log(`Suggestion: ${verificationErrorInfo.suggestion}`);
        }
        
        // If we can't fetch items, set empty array
        setNfts([]);
        setLoadingState("loaded");
        return;
      }
      
      if (!data || data.length === 0) {
        console.log("No owned items found for this user");
        setNfts([]);
        setLoadingState("loaded");
        return;
      }
      
      /*
      *  map over items returned from smart contract and format
      *  them as well as fetch their token metadata
      */
      // eslint-disable-next-line arrow-parens
      const items = await Promise.all(data.map(async i => {
        const tokenUri = await contract.tokenURI(i.tokenId);
        console.log("token Uri is ", tokenUri);
        const httpUri = getIPFSGatewayURL(tokenUri);
        console.log("Http Uri is ", httpUri);
        const meta = await axios.get(httpUri);
        const price = ethers.utils.formatUnits(i.price.toString(), "ether");

        const item = {
          price,
          tokenId: i.tokenId.toNumber(),
          image: meta.data.image ? getIPFSGatewayURL(meta.data.image) : meta.data.imageUrl || "",
          name: meta.data.name,
          description: meta.data.description,
          country: meta.data.properties?.country || "",
          collectionPoint: meta.data.properties?.collectionPoint || "",
          weight: meta.data.properties?.weight || "",
        };
        console.log("item returned is ", item);
        return item;
      }));
      setNfts(items);
      setLoadingState("loaded");
    } catch (error) {
      console.error("Error loading waste data:", error);
      setNfts([]);
      setLoadingState("loaded");
    }
  }

  if (loadingState === "loaded" && !nfts.length) {
    return (
      <div className="text-center text-white">
        <h1 className="px-20 py-10 text-3xl">No waste items owned yet</h1>
        <p className="text-lg mb-4">Purchase some from the marketplace to see them here!</p>
        <p className="text-sm text-gray-300 mb-6">
          If you recently made a purchase and don&apos;t see it, please wait a few minutes for Hedera indexing and refresh the page.
        </p>
        <button
          type="button"
          onClick={() => {
            setLoadingState("not-loaded");
            loadWaste();
          }}
          className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded transition-colors"
        >
          Refresh Dashboard
        </button>
      </div>
    );
  }
  return (
    <div className="flex justify-center from-green-400 to-black mb-12">
      <div className="px-4" style={{ maxWidth: "1600px" }}>
        {loadingState === "not-loaded" && (
          <div className="text-center text-white py-20">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-4" />
            <p>Loading your owned waste items...</p>
          </div>
        )}
        
        {loadingState === "loaded" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
            {nfts.map((nft, i) => (
              <div key={i} className="border shadow rounded-xl overflow-hidden border-2 border-white-500">
                <iframe
                  title="Waste"
                  frameBorder="0"
                  scrolling="no"
                  height="400px"
                  width="100%"
                  src={`${nft.image}#toolbar=0`}
                  className="py-3 object-fill h-500"
                />
                <div className="p-1">
                  <p style={{ height: "34px" }} className="text-xl text-green-400 font-semibold">Category: {nft.name}</p>
                  <div style={{ height: "40px", overflow: "hidden" }}>
                    <p className=" text-white">Description: {nft.description}</p>
                  </div>
                  <p style={{ height: "34px" }} className="text-xl text-white font-semibold">Country : {nft.country}</p>
                  <div style={{ height: "40px", overflow: "hidden" }}>
                    <p className=" text-white">Collection Point: {nft.collectionPoint}</p>
                  </div>
                  <p className="text-xl font-bold text-white"> Weight(Kg): {nft.weight}</p>
                  <p className="text-xl font-bold text-white">Price Paid: {nft.price} HBAR</p>
                </div>

                <div className="p-2 bg-black">
                  <div className="mt-4 w-full bg-green-500 text-white font-bold py-2 px-12 rounded text-center">✅ Owned</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
