import React from "react";

interface Asset {
  id: number;
  uid: string;
  name: string;
  type: string;
  location: string;
  status: string;
  metadata?: {
    department?: string;
    criticality?: string;
    description?: string;
  };
}

// Export function to generate HTML string from template
export function generateAssetQRPDFHTML(
  asset: Asset,
  qrCodeDataUrl: string
): string {
  return `
   <div style="width: 148mm; height: 210mm; margin: 0; padding: 8mm; background-color: #fbbf24; font-family: Arial, sans-serif; box-sizing: border-box; display: flex; flex-direction: column; color: #10204b; font-size: 12px;">
    <!-- Branding -->
  <div style="display: flex; justify-content: center; align-items: center; width: 100%; margin-bottom: 8mm;">
    <div style="display: flex; align-items: center; ">
              <div style="font-size: 1.8rem; color: #10204b; font-weight: 700;">QResolve</div>
    </div>
  </div>
  
  <!-- Main content -->
  <div style="text-align: center; margin-bottom: 8mm;">
    <h2 style="font-size: 3rem; font-weight: 700; color: #10204b; margin-bottom: 8mm; line-height: 1.2; letter-spacing: 0.06em;">
      SEE IT. SCAN IT.<br/>FIX IT TOGETHER!
    </h2>
    <p style="font-size: 0.9rem; color: #10204b; margin: 0 auto; line-height: 1.2; letter-spacing: 0.03em;">
      We're committed to maintaining every piece of equipment in top condition. When your expertise contributes to our shared environment, everyone together we can keep things running smoothly.
    </p>
  </div>

       <div style="display: flex; flex-direction: row; align-items: flex-start; gap: 8mm; margin-bottom: 4mm; width: 100%; justify-content: space-between; position: relative;">
 
    <!-- Instructions -->
    <div style="flex: 1; display: flex; flex-direction: column; gap: 4mm;">
      <h3 style="font-size: 1.7rem; font-weight: 800; color: #10204b;">SCAN TO REPORT</h3>
      <div style="font-size: 1.2rem; font-weight: 600; color: #10204b;">1. Scan the QR</div>
     <div style="font-size: 1.2rem; font-weight: 600; color: #10204b;">2. Select the Issue</div>
     <div style="font-size: 1.2rem; font-weight: 600; color: #10204b;">3. We'll fix it fast</div>
    </div>

    <!-- SVG Arrow positioned between columns -->
    <div style="position: absolute; top: 20mm; left: 40%; transform: translateX(-40%); z-index: 10;">
       <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100" width="30mm" height="15mm">
       <defs>
         <marker id="arrowhead" markerWidth="10" markerHeight="7" 
                 refX="10" refY="3.5" orient="auto">
           <polygon points="0 0, 10 3.5, 0 7" fill="#10204b" />
         </marker>
       </defs>
       
       <path d="M 20 50 Q 60 20, 100 50 Q 140 80, 180 50" 
             stroke="#10204b" 
             stroke-width="3" 
             fill="none" 
             marker-end="url(#arrowhead)" />
     </svg>
    </div>

    <!-- QR Code -->
    <div style="flex: 1; display: flex; gap: 4mm; align-items: center; flex-direction: column;">
      <img src="${qrCodeDataUrl}" alt="QR Code" style="width: 65mm; height: 65mm; border: 3px solid #10204b; border-radius: 6px; object-fit: contain;" />
      <p style="font-size: 0.8rem; color: #10204b; line-height: 1.3; text-align: left;">
        Takes less than 10 seconds!
      </p>
    </div>
  </div>

  <div style="font-size: 1.2rem; color: #10204b; margin: 0; font-weight: 800; text-align: center; line-height: 1.2;">Powered by QResolve</div>
  <div style="font-size: 1rem; color: #10204b; margin: 0; font-weight: 400; text-align: center; line-height: 1.2;">Helping You Keep Things Running</div>

     <!-- Asset Information Footer -->
       <div style="margin-top: auto; margin-left: -8mm; margin-right: -8mm; margin-bottom: -8mm; background-color: #10204b; padding: 4mm;">
     <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.7rem; color: #fbbf24; flex-wrap: wrap;">
       
       <div style="width: 100%; text-align: center;">
         <div style="font-weight: 700; margin-bottom: 1mm;">Asset: ${asset.name}</div>
         <div>ID: ${asset.uid}</div>
       </div>
       <div style="width: 100%; text-align: center; margin-bottom: 1.5mm;">
         <div style="font-weight: 700;">Location: ${asset.location}</div>
       </div>
     </div>
   </div>

</div>

  `;
}
