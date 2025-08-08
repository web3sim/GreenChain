import { Navbar, Sender } from "../components";

const dashboard = () => (
  <div className="w-full gradient-bg-welcome">
    <Navbar />
    <div className="text-4xl text-center text-white font-bold mt-10 mb-20">
      <h1>My Waste Collection Dashboard</h1>
    </div>
    <Sender />
  </div>
);

export default dashboard;
