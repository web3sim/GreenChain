/* eslint-disable no-trailing-spaces */
/* eslint-disable consistent-return */
/* eslint-disable no-use-before-define */
/* eslint-disable no-shadow */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import Web3Modal from "web3modal";
import Waste from "../utils/Waste.json";
import { wastemarketplaceAddress, EXPLORER_URL, HEDERA_CONFIG } from "../../config";
import { uploadNFTContent, getIPFSGatewayURL } from "../utils/decentralizedStorage";

const MintWaste = () => {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState(null);
  const [uploadedFile, setUploadedFile] = useState();
  const [imageView, setImageView] = useState();
  const [metaDataURL, setMetaDataURl] = useState();
  const [txURL, setTxURL] = useState();
  const [txStatus, setTxStatus] = useState();
  const [formInput, updateFormInput] = useState({ name: "plastic", description: "", country: "", weight: "", collectionPoint: "", price: "" });

  const handleFileUpload = (event) => {
    console.log("file for upload selected...");
    setUploadedFile(event.target.files[0]);
    setTxStatus("");
    setImageView("");
    setMetaDataURl("");
    setTxURL("");
  };

  const sendTxToBlockchain = async (metadata) => {
    try {
      setTxStatus("Adding transaction to Hedera Testnet Blockchain.");
      
      // Real contract interaction with Hedera-specific configurations
      const web3Modal = new Web3Modal();
      const connection = await web3Modal.connect();
      const web3Provider = new ethers.providers.Web3Provider(connection);
      const signer = web3Provider.getSigner();

      // Convert price to weibar (Hedera's smallest unit: 1 HBAR = 10^8 tinybars = 10^18 weibar)
      const price = ethers.utils.parseUnits(formInput.price.toString(), "ether");
      const connectedContract = new ethers.Contract(wastemarketplaceAddress, Waste.abi, signer);
      
      console.log("Connected to contract", wastemarketplaceAddress);
      console.log("Metadata URL:", metadata.url);
      console.log("Price in weibar:", price.toString());

      // Ensure proper metadata URL format (remove ipfs:// prefix if present)
      let tokenURI = metadata.url;
      if (tokenURI.startsWith("ipfs://")) {
        tokenURI = tokenURI.substring(7); // Remove "ipfs://" prefix
      }
      
      // Hedera requires higher gas limits and proper gas price
      const gasLimit = 1000000; // 1M gas for contract calls
      const gasPrice = ethers.utils.parseUnits("350", "gwei"); // Hedera minimum
      
      console.log("Creating token with URI:", tokenURI);
      console.log("Gas limit:", gasLimit);
      console.log("Gas price:", ethers.utils.formatUnits(gasPrice, "gwei"), "gwei");

      const mintNFTTx = await connectedContract.createToken(tokenURI, price, {
        gasLimit,
        gasPrice,
      });
      
      console.log("Transaction submitted:", mintNFTTx.hash);
      console.log("Waiting for confirmation...");
      
      const receipt = await mintNFTTx.wait();
      console.log("Transaction confirmed:", receipt.transactionHash);
      console.log("Waste successfully created and sent to Blockchain");
      
      return mintNFTTx;
    } catch (error) {
      setErrorMessage(`Failed to send tx to Hedera Testnet: ${error.message}`);
      console.error("Blockchain transaction error:", error);
      throw error;
    }
  };

  const previewNFT = (metaData, mintNFTTx) => {
    console.log("Processing NFT preview...");
    
    // Check if transaction was successful
    if (!mintNFTTx || !mintNFTTx.hash) {
      console.error("Invalid transaction object");
      setErrorMessage("Transaction failed - no hash received");
      return;
    }
    
    // Use the imageUrl from our new storage system
    const imgViewString = metaData.imageUrl || getIPFSGatewayURL(metaData.url);
    console.log("image path is", imgViewString);
    
    setImageView(imgViewString);
    setMetaDataURl(metaData.gateway || getIPFSGatewayURL(metaData.url));
    setTxURL(`${EXPLORER_URL}/transaction/${mintNFTTx.hash}`);
    setTxStatus("Waste registration was successful!");
    console.log("Preview details completed");
  };

  const mintNFTToken = async (e, uploadedFile) => {
    e.preventDefault();
    
    try {
      setErrorMessage(null); // Clear any previous errors
      
      // Validate form inputs
      const { name, description, country, weight, collectionPoint, price } = formInput;
      
      if (!name || !description || !country || !weight || !collectionPoint || !price) {
        setErrorMessage("Please fill in all required fields");
        return;
      }
      
      if (!uploadedFile) {
        setErrorMessage("Please select a file to upload");
        return;
      }
      
      // Validate price is a valid number
      const priceNum = parseFloat(price);
      if (Number.isNaN(priceNum) || priceNum <= 0) {
        setErrorMessage("Please enter a valid price greater than 0");
        return;
      }
      
      console.log("Starting NFT minting process...");
      
      // 1. upload NFT content via decentralized storage
      const metaData = await uploadNFTContent({
        file: uploadedFile,
        name,
        description,
        country,
        collectionPoint,
        weight,
        price: priceNum
      });

      console.log("Metadata uploaded successfully:", metaData);

      // 2. Mint a NFT token on Hedera
      const mintNFTTx = await sendTxToBlockchain(metaData);

      if (mintNFTTx) {
        // 3. preview the minted nft
        previewNFT(metaData, mintNFTTx);
        
        // Navigate to explore page after successful minting
        setTimeout(() => {
          navigate("/explore");
        }, 3000); // Give user time to see the success message
      }
    } catch (error) {
      console.error("Minting process failed:", error);
      setErrorMessage(`Minting failed: ${error.message || "Unknown error occurred"}`);
    }
  };

  return (
    <>
      <div className="text-4xl text-center text-white font-bold mt-10">
        <h1> Register a waste</h1>
      </div>
      <div className="flex justify-center">
        <div className="w-1/2 flex flex-col pb-12 ">
          <select
            className="mt-5 border rounded p-4 text-xl"
            // value={this.state.value}
            onChange={(e) => updateFormInput({ ...formInput, name: e.target.value })}
          ><option value="select">Click to select type of waste</option>
            <option value="plastic">Plastic</option>
            <option value="paper">Paper</option>
            <option value="glass">Glass</option>
            <option value="electronics">Electronics</option>
            <option value="metals">Metals</option>
            <option value="batteries">Batteries</option>
            <option value="tyres">Tyres</option>
            <option value="clothing">Clothing</option>
            <option value="organic">Organic Materials</option>
            <option value="medical">Medical Waste</option>
          </select>
          <textarea
            placeholder="Description of waste"
            className="mt-5 border rounded p-4 text-xl"
            onChange={(e) => updateFormInput({ ...formInput, description: e.target.value })}
            rows={2}
          />
          <input
            placeholder="Enter your Country / Region"
            className="mt-5 border rounded p-4 text-xl"
            onChange={(e) => updateFormInput({ ...formInput, country: e.target.value })}
          />
          <input
            placeholder="Enter Address of Collecetion Point"
            className="mt-5 border rounded p-4 text-xl"
            onChange={(e) => updateFormInput({ ...formInput, collectionPoint: e.target.value })}
          />
          <input
            placeholder="Weight in Kg"
            className="mt-5 border rounded p-4 text-xl"
            onChange={(e) => updateFormInput({ ...formInput, weight: e.target.value })}
          />
          <input
            placeholder="Price in ETH, if free put 0"
            className="mt-5 border rounded p-4 text-xl"
            onChange={(e) => updateFormInput({ ...formInput, price: e.target.value })}
          />
          <br />

          <div className="MintNFT text-white text-xl">
            <form>
              <h3>Select a picture of the waste</h3>
              <input type="file" onChange={handleFileUpload} className="mt-5 border rounded p-4 text-xl" />
            </form>
            {txStatus && <p>{txStatus}</p>}
            <br />
            {metaDataURL && <p className="text-blue"><a href={metaDataURL} className="text-blue">Metadata on IPFS</a></p>}
            <br />
            {txURL && <p><a href={txURL} className="text-blue">See the mint transaction</a></p>}
            <br />
            {errorMessage}

            <br />
            {imageView && (
            <iframe
              className="mb-10"
              title="Ebook "
              src={imageView}
              alt="NFT preview"
              frameBorder="0"
              scrolling="auto"
              height="50%"
              width="100%"
            />
            )}

          </div>

          <button type="button" onClick={(e) => mintNFTToken(e, uploadedFile)} className="font-bold mt-20 bg-green-500 text-white text-2xl rounded p-4 shadow-lg">
            Register Item
          </button>
        </div>
      </div>
    </>

  );
};
export default MintWaste;
