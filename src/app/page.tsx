"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import styles from "./page.module.css";

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

function sanitizeAmountInput(value: string) {
  if (!value) return "";
  const cleaned = value.replace(/[^0-9.]/g, "");
  const [integer, ...decimals] = cleaned.split(".");
  const decimalPart = decimals.join("");
  return decimals.length ? `${integer}.${decimalPart}` : integer;
}

const FX_SOURCE_REFERENCES: Record<
  string,
  { name: string; href: string }
> = {
  ExchangerateHost: {
    name: "ExchangerateHost",
    href: "https://exchangerate.host/#/#docs",
  },
  Frankfurter: {
    name: "Frankfurter",
    href: "https://www.frankfurter.app/docs/",
  },
};

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
  const [currency, setCurrency] = useState<"USD" | "EUR">("USD");
  const [fxRate, setFxRate] = useState<number | null>(1);
  const [fxRateLoading, setFxRateLoading] = useState(false);
  const [fxRateError, setFxRateError] = useState<string | null>(null);
  const [fxLastUpdated, setFxLastUpdated] = useState<string | null>(null);
  const [fxSource, setFxSource] = useState<string | null>(null);
  const [recipient, setRecipient] = useState("");
  const [proxy, setProxy] = useState(false);
  const [proxyAddress, setProxyAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    summary: string;
    glmrAmount: number;
    movrAmount: number;
    glmrCallData: {
      treasuryCallHex: string;
      treasuryCallHash: string;
      councilCallHex: string;
      councilCallHash: string;
    };
    movrCallData: {
      treasuryCallHex: string;
      treasuryCallHash: string;
      councilCallHex: string;
      councilCallHash: string;
    };
    glmrProxyCallData?: {
      treasuryCallHex: string;
      treasuryCallHash: string;
      councilCallHex: string;
      councilCallHash: string;
    };
    movrProxyCallData?: {
      treasuryCallHex: string;
      treasuryCallHash: string;
      councilCallHex: string;
      councilCallHash: string;
    };
    proxy?: boolean;
  } | null>(null);
  const [showResult, setShowResult] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const isWaitingForRate = currency === "EUR" && (fxRateLoading || !fxRate);
  const isSubmitDisabled = loading || isWaitingForRate;
  const fxMetaText = [fxSource, fxLastUpdated]
    .filter((part): part is string => Boolean(part))
    .join(" · ");
  const fxSourceDetails = fxSource ? FX_SOURCE_REFERENCES[fxSource] : undefined;
  const parsedInputAmount = parseFloat(usdAmount);
  const hasTypedAmount = !Number.isNaN(parsedInputAmount) && parsedInputAmount > 0;
  const liveUsdAmount =
    currency === "EUR" && fxRate
      ? parsedInputAmount * fxRate
      : parsedInputAmount;

  const fetchEurUsdRate = useCallback(async () => {
    try {
      setFxRateLoading(true);
      setFxRateError(null);
      const res = await fetch("/api/fx-rate");
      if (!res.ok) {
        throw new Error("Failed to fetch EUR → USD rate");
      }
      const data = await res.json();
      if (typeof data.rate !== "number") {
        throw new Error("Invalid rate response");
      }
      setFxRate(data.rate);
      setFxLastUpdated(data.asOf ?? null);
      setFxSource(data.source ?? null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unable to fetch EUR → USD rate";
      setFxRate(null);
      setFxRateError(message);
      setFxSource(null);
    } finally {
      setFxRateLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currency === "EUR") {
      fetchEurUsdRate();
    } else {
      setFxRate(1);
      setFxRateError(null);
      setFxLastUpdated(null);
      setFxSource(null);
    }
  }, [currency, fetchEurUsdRate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setShowResult(false);
    setResult(null);
    try {
      const parsedAmount = parseFloat(usdAmount);
      if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error("Enter a valid payout amount.");
      }
      let amountInUsd = parsedAmount;
      if (currency === "EUR") {
        if (!fxRate) {
          throw new Error("EUR → USD rate unavailable. Please try again.");
        }
        amountInUsd = parsedAmount * fxRate;
      }
      const res = await fetch("/api/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usdAmount: amountInUsd,
          inputAmount: parsedAmount,
          inputCurrency: currency,
          fxRate: currency === "EUR" ? fxRate : 1,
          recipient,
          proxy,
          proxyAddress: proxy ? proxyAddress : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unknown error");
      setResult(data);
      setTimeout(() => setShowResult(true), 100); // allow DOM update before animating
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to calculate payout";
      setError(errorMessage);
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
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Payment Amount</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={usdAmount}
                    onChange={e => setUsdAmount(sanitizeAmountInput(e.target.value))}
                    required
                    style={{
                      width: '100%',
                      padding: '8px',
                      paddingRight: currency === "EUR" && hasTypedAmount ? 170 : 8,
                      fontSize: 16,
                    }}
                  />
                  {currency === "EUR" && hasTypedAmount && (
                    <span
                      style={{
                        position: 'absolute',
                        right: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: 12,
                        color: '#D1D5DB',
                        background: '#0f1112',
                        padding: '2px 6px',
                        borderRadius: 4,
                        pointerEvents: 'none',
                        boxShadow: '0 0 6px rgba(0,0,0,0.35)',
                      }}
                    >
                      {currency === "EUR"
                        ? fxRate
                          ? `≈ ${usdFormatter.format(liveUsdAmount)} USD`
                          : "Waiting for EUR rate..."
                        : `= ${usdFormatter.format(liveUsdAmount)} USD`}
                    </span>
                  )}
                </div>
                <select
                  value={currency}
                  onChange={e => setCurrency(e.target.value as "USD" | "EUR")}
                  style={{ width: 90, padding: 8, fontSize: 16, background: '#0f1112', color: 'white', borderRadius: 4, border: '1px solid #2d2d2d' }}
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
              {currency === "EUR" && (
                <div style={{ marginTop: 8, fontSize: 12, color: fxRateError ? '#ff6b6b' : '#9CA3AF' }}>
                  {fxRateLoading && `Fetching EUR → USD rate...`}
                  {!fxRateLoading && fxRate && (
                    <span>
                      1 EUR ≈ {fxRate.toFixed(4)} USD
                      {(fxSourceDetails || fxLastUpdated) && (
                        <>
                          {" ("}ECB exchange rate via{" "}
                          {fxSourceDetails ? (
                            <a
                              href={fxSourceDetails.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: '#9CA3AF', textDecoration: 'underline' }}
                            >
                              {fxSourceDetails.name}
                            </a>
                          ) : (
                            "provider"
                          )}
                          {fxLastUpdated ? ` · ${fxLastUpdated}` : ""}
                          {")"}
                        </>
                      )}
                    </span>
                  )}
                  {!fxRateLoading && fxRateError && (
                    <span>
                      {fxRateError}{" "}
                      <button
                        type="button"
                        onClick={fetchEurUsdRate}
                        style={{ background: "none", border: "none", color: "#39ff14", cursor: "pointer", textDecoration: "underline" }}
                      >
                        Retry
                      </button>
                    </span>
                  )}
                </div>
              )}
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
              disabled={isSubmitDisabled}
              style={{
                marginTop: 24,
                padding: '16px 40px',
                fontSize: 20,
                fontWeight: 700,
                background: '#3D3D3D',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                cursor: isSubmitDisabled ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 8px rgba(30,144,255,0.12)',
                transition: 'background 0.2s',
              }}
            >
              {loading ? "Calculating..." : isWaitingForRate ? "Waiting for EUR rate..." : "Calculate Payout"}
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
