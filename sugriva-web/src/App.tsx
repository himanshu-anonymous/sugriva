/* Copyright (c) 2026 Team - SUGRIVA. All rights reserved. */
/* Developer: Team - SUGRIVA */
import { useState } from "react";
import { StoreProvider, useStore } from "./state/StoreContext";
import { Navbar } from "./components/Navbar";
import { EventQueueBanner } from "./components/EventQueueBanner";
import { PresentationEnvironment } from "./components/PresentationEnvironment";
import { Footer } from "./components/Footer";
import { PaymentRailBrowser } from "./components/PaymentRailBrowser";
import { TabWorkspace } from "./components/TabWorkspace";
import { RightRiskPanel } from "./components/RightRiskPanel";
import { LoginGateway } from "./components/LoginGateway";
import "./styles/index.css";

function DashboardContent() {
  const { isAuthenticated, isPresentationMode } = useStore();
  const [activeRail, setActiveRail] = useState<string | null>(null);

  if (!isAuthenticated) {
    return <LoginGateway />;
  }

  return (
    <div id="root">
      {/* Top Navbar */}
      <Navbar />

      {/* Persistent Real-Time Event Management & Queue Banner on every page */}
      <EventQueueBanner />

      {/* Main Grid View */}
      <div className="dashboard-grid">
        {/* Left Rails Browser */}
        <PaymentRailBrowser activeRail={activeRail} onSelectRail={setActiveRail} />

        {/* Central tabbed content workspace */}
        <TabWorkspace activeRail={activeRail} />

        {/* Right Dynamic Risk & SHAP progress weights */}
        <RightRiskPanel />
      </div>

      {/* Presentation Environment Overlay (Triggered by command or Ctrl+P button) */}
      {isPresentationMode && <PresentationEnvironment />}

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
