import React, { useEffect, useRef } from 'react';

/**
 * AdBanner Component for AdButler integration.
 * @param {string} zoneId - The AdButler Zone ID.
 * @param {string} accountId - Your AdButler Account ID.
 * @param {string} width - Banner width (e.g., '728').
 * @param {string} height - Banner height (e.g., '90').
 */
export default function AdBanner({ zoneId, accountId = 'YOUR_ACCOUNT_ID', width = '728', height = '90' }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!zoneId || !accountId) return;

    // Create unique placement container ID
    const placementId = `ab_zone_${zoneId}_${Math.floor(Math.random() * 1000000)}`;
    
    if (containerRef.current) {
      containerRef.current.innerHTML = `<div id="${placementId}"></div>`;
    }

    // Load AdButler Async Script
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = `https://servedbyadbutler.com/app.js`;
    
    script.onload = () => {
      if (window.AdButler) {
        window.AdButler.ads = window.AdButler.ads || [];
        window.AdButler.ads.push({
          handler: function () {
            window.AdButler.register(accountId, zoneId, [width, height], placementId, {});
          }
        });
      }
    };

    document.body.appendChild(script);

    return () => {
      // Clean up script on unmount
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [zoneId, accountId, width, height]);

  return (
    <div className="flex justify-center items-center my-4 overflow-hidden rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
      <div ref={containerRef} style={{ width: `${width}px`, height: `${height}px` }} className="flex items-center justify-center bg-slate-50">
        <span className="text-xs text-slate-400 font-mono">Advertisement</span>
      </div>
    </div>
  );
}