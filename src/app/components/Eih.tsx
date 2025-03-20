"use client";

import React from "react";
import Image from "next/image";

function Eih() {
  return (
    <div className="flex flex-col flex-1  min-h-0 rounded-xl">
      <div className="flex items-center justify-center h-full relative">
        <Image 
          src="/eih.svg" 
          alt="EIH Logo" 
          width={400} 
          height={400} 
          className="object-contain z-10 relative"
        />
      </div>
    </div>
  );
}

export default Eih;
