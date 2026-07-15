import { useState } from "react";
import { StoreProvider } from "./state/StoreContext";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { PaymentRailBrowser } from "./components/PaymentRailBrowser";
import { TabWorkspace } from "./components/TabWorkspace";
import { RightRiskPanel } from "./components/RightRiskPanel";
import "./styles/index.css";

function DashboardContent() {
  const [activeRail, setActiveRail] = useState<string | null>(null);

  return (
    <div id="root">
      {/* Top Navbar */}
      <Navbar />

      {/* Main Grid View */}
      <div className="dashboard-grid">
        {/* Left Rails Browser */}
        <PaymentRailBrowser activeRail={activeRail} onSelectRail={setActiveRail} />

        {/* Central tabbed content workspace */}
        <TabWorkspace activeRail={activeRail} />

        {/* Right Dynamic Risk & SHAP progress weights */}
        <RightRiskPanel />
      </div>

      {/* Footer shortcut guides */}
      <Footer />
    </div>
  );
}

function App() {
  return (
    <StoreProvider>
      <DashboardContent />
    </StoreProvider>
  );
}

export default App;
