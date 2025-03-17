// app/page.tsx
"use client";
import React, { useEffect, useState } from "react";

import App from "./App";
import { motion } from "framer-motion";
import { useElementsStore } from "@/store/elementsStore";

export default function Page() {
  const { theUserIsSpeaking } = useElementsStore();
  const [speaking, setSpeaking] = useState(false);

  // Update speaking state when theUserIsSpeaking changes
  useEffect(() => {
    // Direct state update - no need for interval
    if (theUserIsSpeaking !== speaking) {
      setSpeaking(theUserIsSpeaking);
    }
  }, [theUserIsSpeaking]); // Only depend on theUserIsSpeaking to prevent infinite loops

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {/* Full-screen animated background */}
      <motion.div
        key={speaking ? "speaking" : "not-speaking"}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1.02 }}
        transition={{ 
          duration: speaking ? 0.5 : 1000,
          repeat: Infinity, 
          repeatType: "reverse", 
          ease: "easeInOut" 
        }}
        className={`absolute inset-0 z-0 rounded-md ${speaking ? 'bg-red-500' : 'bg-red-600'}`}
      />
      
      {/* Static App container with a 2px inset */}
      <div 
        className="absolute z-10" 
        style={{ top: "10px", right: "10px", bottom: "10px", left: "10px" }}
      >
       
            <App />
      
      </div>
    </div>
  );
}