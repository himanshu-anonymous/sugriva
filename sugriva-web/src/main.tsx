/* Copyright (c) 2026 Himanshu Patil. All rights reserved. */
/* Developer: Himanshu Patil */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Disable inspect mode and developer tool shortcut combinations
if (typeof window !== "undefined") {
  // 1. Block right click context menu
  window.addEventListener("contextmenu", (e) => {
    e.preventDefault();
  });

  // 2. Block DevTools keyboard shortcuts
  window.addEventListener("keydown", (e) => {
    // Block F12 (keyCode 123)
    if (e.keyCode === 123) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modifier = isMac ? e.metaKey : e.ctrlKey;

    // Block Ctrl+Shift+I / Cmd+Opt+I (Inspect)
    // Block Ctrl+Shift+J / Cmd+Opt+J (Console)
    // Block Ctrl+Shift+C / Cmd+Opt+C (Element Selection)
    if (modifier && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Block Ctrl+U / Cmd+Opt+U (View Source)
    if (modifier && (e.key === 'U' || e.key === 'u')) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Block Ctrl+S / Cmd+S (Save Page)
    if (modifier && (e.key === 'S' || e.key === 's')) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
