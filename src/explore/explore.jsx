import { Navbar, Marketplace } from "../components";

const explore = () => (
  <div className="w-full gradient-bg-welcome">
    <Navbar />
    <div className="text-4xl text-center text-white font-bold mt-10 mb-20">
      <h1>Waste NFT Marketplace</h1>
    </div>
    <Marketplace />
  </div>
);

export default explore;
