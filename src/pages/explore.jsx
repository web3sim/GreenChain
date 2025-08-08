import { Navbar, Marketplace } from "../components";

const explore = () => (
  <div className="bg-gradient-to-b from-green-600 to-black">
    <Navbar />
    <div className="text-4xl text-center text-white font-bold mt-10 mb-20">
      <h1> Waste Marketplace </h1>
    </div>
    <Marketplace />
  </div>
);

export default explore;
