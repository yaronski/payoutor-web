"use client";

import React, { useState, useRef, useEffect } from "react";
import styles from "./page.module.css";

function renderSummaryWithLinks(summary: string) {
  // Regex to match URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = summary.split(urlRegex);
  return parts.map((part, i) => {
    if (urlRegex.test(part)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: 'underline', color: '#39ff14' }}
        >
          {part}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default function Home() {
  const [usdAmount, setUsdAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [proxy, setProxy] = useState(false);
  const [proxyAddress, setProxyAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);
  const [showResult, setShowResult] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setShowResult(false);
    setResult(null);
    try {
      const res = await fetch("/api/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usdAmount: parseFloat(usdAmount),
          recipient,
          proxy,
          proxyAddress: proxy ? proxyAddress : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unknown error");
      setResult(data);
      setTimeout(() => setShowResult(true), 100); // allow DOM update before animating
    } catch (err: any) {
      setError(err.message || "Failed to calculate payout");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (showResult && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [showResult]);

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
  }

  function handleDownload(filename: string, text: string) {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={styles.page}>
      <main className={styles.main} style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'center', paddingTop: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
          <pre style={{ fontFamily: 'monospace', fontSize: 14, color: '#D4D4D4', marginBottom: 0, marginTop: 10, lineHeight: 1.1, textAlign: 'center', maxWidth: 800, width: '100%' }}>
{`
    ████████╗██████╗ ███████╗ █████╗ ███████╗██╗   ██╗██████╗ ██╗   ██╗
    ╚══██╔══╝██╔══██╗██╔════╝██╔══██╗██╔════╝██║   ██║██╔══██╗╚██╗ ██╔╝
       ██║   ██████╔╝█████╗  ███████║███████╗██║   ██║██████╔╝ ╚████╔╝ 
       ██║   ██╔══██╗██╔══╝  ██╔══██║╚════██║██║   ██║██╔══██╗  ╚██╔╝  
       ██║   ██║  ██║███████╗██║  ██║███████║╚██████╔╝██║  ██║   ██║   
       ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝   

    ██████╗  █████╗ ██╗   ██╗ ██████╗ ██╗   ██╗████████╗ ██████╗ ██████╗ 
    ██╔══██╗██╔══██╗╚██╗ ██╔╝██╔═══██╗██║   ██║╚══██╔══╝██╔═══██╗██╔══██╗
    ██████╔╝███████║ ╚████╔╝ ██║   ██║██║   ██║   ██║   ██║   ██║██████╔╝
    ██╔═══╝ ██╔══██║  ╚██╔╝  ██║   ██║██║   ██║   ██║   ██║   ██║██╔══██╗
    ██║     ██║  ██║   ██║   ╚██████╔╝╚██████╔╝   ██║   ╚██████╔╝██║  ██║
    ╚═╝     ╚═╝  ╚═╝   ╚═╝    ╚═════╝  ╚═════╝    ╚═╝    ╚═════╝ ╚═╝  ╚═╝
                                                                            
                        ██╗    ██╗███████╗██████╗                        
                        ██║    ██║██╔════╝██╔══██╗                       
                        ██║ █╗ ██║█████╗  ██████╔╝                       
                        ██║███╗██║██╔══╝  ██╔══██╗                       
                        ╚███╔███╔╝███████╗██████╔╝                       
                        ╚══╝╚══╝ ╚══════╝╚═════╝                        

    
`}
          </pre>
          <form onSubmit={handleSubmit} className={styles.form} style={{ marginTop: 10, width: 400, maxWidth: '90%' }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Payout Amount in USD</div>
              <input
                type="number"
                min="0"
                step="any"
                value={usdAmount}
                onChange={e => setUsdAmount(e.target.value)}
                required
                style={{ width: 220, padding: 8, fontSize: 16 }}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Recipient Address</div>
              <input
                type="text"
                value={recipient}
                onChange={e => setRecipient(e.target.value)}
                required
                style={{ width: 320, padding: 8, fontSize: 16 }}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={proxy}
                  onChange={e => setProxy(e.target.checked)}
                />
                Proxy
              </label>
              {proxy && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Proxy Address</div>
                  <input
                    type="text"
                    value={proxyAddress}
                    onChange={e => setProxyAddress(e.target.value)}
                    required={proxy}
                    style={{ width: 320, padding: 8, fontSize: 16 }}
                  />
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 24,
                padding: '16px 40px',
                fontSize: 20,
                fontWeight: 700,
                background: '#3D3D3D',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 8px rgba(30,144,255,0.12)',
                transition: 'background 0.2s',
              }}
            >
              {loading ? "Calculating..." : "Calculate Payout"}
            </button>
          </form>
          {error && <div className={styles.error} style={{ textAlign: 'center', marginTop: 12 }}>{error}</div>}
        </div>
        <div style={{ minHeight: 400, width: "100%" }}>
          <div
            ref={resultRef}
            style={{
              opacity: showResult ? 1 : 0,
              transform: showResult ? 'scale(1)' : 'scale(0.96)',
              transition: 'opacity 0.7s cubic-bezier(.4,2,.6,1), transform 0.7s cubic-bezier(.4,2,.6,1)',
              filter: showResult ? 'drop-shadow(0 4px 24px #39ff1433)' : 'none',
              background: showResult ? '#181c1f' : 'none',
              borderRadius: 18,
              padding: showResult ? 32 : 0,
              marginTop: showResult ? 32 : 0,
              boxShadow: showResult ? '0 8px 32px #39ff1422' : 'none',
              pointerEvents: showResult ? 'auto' : 'none',
              maxWidth: 800,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            {showResult && result && (
              <div className={styles.result}>
                {/* Removed Results heading */}
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 16, background: 'none', color: '#39ff14', marginBottom: 16, fontFamily: 'monospace', textShadow: '0 0 0px #39ff14, 0 0 4px #39ff14' }}>{renderSummaryWithLinks(result.summary)}</pre>
                <button onClick={() => handleCopy(result.summary)} style={{ marginBottom: 18, fontSize: 16, padding: '8px 24px', borderRadius: 6, background: '#3D3D3D', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px #1e90ff22' }}>Copy Full Summary</button>
                <details>
                  <summary style={{ fontSize: 16, fontWeight: 600, color: 'white', cursor: 'pointer' }}>Show advanced details</summary>
                  <div style={{ marginTop: 12 }}>
                    <strong>GLMR Amount:</strong> {result.glmrAmount}
                    <button onClick={() => handleCopy(result.glmrAmount.toString())} style={{ marginLeft: 8 }}>Copy</button>
                  </div>
                  <div>
                    <strong>MOVR Amount:</strong> {result.movrAmount}
                    <button onClick={() => handleCopy(result.movrAmount.toString())} style={{ marginLeft: 8 }}>Copy</button>
                  </div>
                  <div>
                    <strong>GLMR Council Call Data:</strong>
                    <pre>{JSON.stringify(result.glmrCallData, null, 2)}</pre>
                    <button onClick={() => handleCopy(JSON.stringify(result.glmrCallData, null, 2))}>Copy</button>
                    <button onClick={() => handleDownload("glmr_call_data.json", JSON.stringify(result.glmrCallData, null, 2))}>Download</button>
                  </div>
                  <br></br>
                  <div>
                    <strong>MOVR Council Call Data:</strong>
                    <pre>{JSON.stringify(result.movrCallData, null, 2)}</pre>
                    <button onClick={() => handleCopy(JSON.stringify(result.movrCallData, null, 2))}>Copy</button>
                    <button onClick={() => handleDownload("movr_call_data.json", JSON.stringify(result.movrCallData, null, 2))}>Download</button>
                  </div>
                </details>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
