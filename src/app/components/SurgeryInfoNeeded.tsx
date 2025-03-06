"use client";

import React from "react";

function SurgeryInfoNeeded() {
  return (
    <div className="w-1/2 overflow-auto rounded-xl flex flex-col bg-white">
      <div>
        <div className="font-semibold px-6 py-4 sticky top-0 z-10 text-base border-b bg-white">
          Surgery Info Needed
        </div>
        <div className="px-6 py-4 text-sm text-gray-800">
          <div className="mb-4">
            <h3 className="font-medium text-gray-900 mb-2">1. Patient Information:</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Age and gender</li>
              <li>Primary diagnosis</li>
              <li>Medical history and risk factors</li>
              <li>Any additional relevant patient information</li>
            </ul>
          </div>
          
          <div className="mb-4">
            <h3 className="font-medium text-gray-900 mb-2">2. Procedure Details:</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Procedure name and type</li>
              <li>Anesthesia used</li>
              <li>Incision details</li>
              <li>Surgical approach</li>
              <li>Findings during surgery</li>
              <li>Implants or materials used</li>
              <li>Closure method</li>
            </ul>
          </div>
          
          <div className="mb-2">
            <h3 className="font-medium text-gray-900 mb-2">3. Post-Operative Information:</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Estimated blood loss</li>
              <li>Complications (if any)</li>
              <li>Post-operative instructions</li>
              <li>Follow-up plans</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SurgeryInfoNeeded;
