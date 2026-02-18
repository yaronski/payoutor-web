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
  const cleaned = value.replace(/,/g, "").replace(/[^0-9.]/g, "");
  const [integer, ...decimals] = cleaned.split(".");
  const decimalPart = decimals.join("");
  return decimals.length ? `${integer}.${decimalPart}` : integer;
}

function formatAmountWithGrouping(value: string) {
  if (!value) return "";
  const [integer, decimalPart = ""] = value.split(".");
  const intNum = Number(integer);
  if (Number.isNaN(intNum)) return value;
  const grouped = intNum.toLocaleString("en-US");
  // Preserve a trailing "." while the user is still typing decimals
  if (decimalPart === "" && value.endsWith(".")) {
    return `${grouped}.`;
  }
  return decimalPart ? `${grouped}.${decimalPart}` : grouped;
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

// Payoutor - Moonbeam Treasury Payout Tool
export default function Home() {
  const [usdAmount, setUsdAmount] = useState("");
  const [currency, setCurrency] = useState<"USD" | "EUR">("USD");
  const [payoutType, setPayoutType] = useState<"native" | "usdc">("native");
  const [fxRate, setFxRate] = useState<number | null>(1);
  const [fxRateLoading, setFxRateLoading] = useState(false);
  const [fxRateError, setFxRateError] = useState<string | null>(null);
  const [fxLastUpdated, setFxLastUpdated] = useState<string | null>(null);
  const [fxSource, setFxSource] = useState<string | null>(null);
  const [recipient, setRecipient] = useState("");
  const [proxy, setProxy] = useState(false);
  const [proxyAddress, setProxyAddress] = useState("");
  const [glmrRatio, setGlmrRatio] = useState(50); // Default 50% GLMR, 50% MOVR
  const [treasuryBalances, setTreasuryBalances] = useState<{
    usdc: string;
    glmr: string;
    movr: string;
    glmrUsd: string;
    movrUsd: string;
  }>({ usdc: "Fetching...", glmr: "Fetching...", movr: "Fetching...", glmrUsd: "Fetching...", movrUsd: "Fetching..." });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    summary: string;
    forumReply: string;
    glmrAmount: number;
    movrAmount: number;
    moonbeamProposalIndex: number;
    moonriverProposalIndex: number;
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
    glmrVoteCallData: {
      voteCallHex: string;
    };
    movrVoteCallData: {
      voteCallHex: string;
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
  const parsedInputAmount = parseFloat(usdAmount.replace(/,/g, ""));
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

  useEffect(() => {
    async function fetchBalances() {
      try {
        const res = await fetch("/api/treasury-balances");
        if (res.ok) {
          const data = await res.json();
          setTreasuryBalances(data);
        }
      } catch (err) {
        console.error("Failed to fetch treasury balances:", err);
        setTreasuryBalances({ usdc: "Error", glmr: "Error", movr: "Error", glmrUsd: "Error", movrUsd: "Error" });
      }
    }
    fetchBalances();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setShowResult(false);
    setResult(null);
    try {
      const parsedAmount = parseFloat(usdAmount.replace(/,/g, ""));
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
          payoutType,
          usdAmount: amountInUsd,
          inputAmount: parsedAmount,
          inputCurrency: currency,
          fxRate: currency === "EUR" ? fxRate : 1,
          fxDate: currency === "EUR" ? fxLastUpdated : null,
          recipient,
          proxy,
          proxyAddress: proxy ? proxyAddress : undefined,
          glmrRatio: payoutType === "native" ? glmrRatio / 100 : 0,
          movrRatio: payoutType === "native" ? (100 - glmrRatio) / 100 : 0,
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
      <main className={styles.main} style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'center', paddingTop: 24, padding: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: 800 }}>
          {/* ASCII Art */}
          <div style={{ width: '100%', overflow: 'hidden', textAlign: 'center' }}>
            <pre style={{ 
              fontFamily: 'monospace', 
              fontSize: 14, 
              color: '#D4D4D4', 
              marginBottom: 0, 
              marginTop: 10, 
              lineHeight: 1.15, 
              whiteSpace: 'pre',
            }}>
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
          </div>
          <form onSubmit={handleSubmit} className={styles.form} style={{ marginTop: 10, width: '100%', maxWidth: 400 }}>
            {/* Payout Type Toggle */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Payout Type</div>
              <div style={{ display: 'flex', gap: 0, background: '#0f1112', borderRadius: 8, padding: 4, border: '1px solid #2d2d2d' }}>
                <label style={{ 
                  flex: 1, 
                  textAlign: 'center', 
                  padding: '10px 8px', 
                  fontSize: 14, 
                  cursor: 'pointer',
                  borderRadius: 6,
                  background: payoutType === "native" ? '#3D3D3D' : 'transparent',
                  color: payoutType === "native" ? '#fff' : '#9CA3AF',
                  transition: 'all 0.2s',
                  fontWeight: payoutType === "native" ? 600 : 400,
                }}>
                  <input 
                    type="radio" 
                    name="payoutType" 
                    value="native" 
                    checked={payoutType === "native"} 
                    onChange={() => setPayoutType("native")}
                    style={{ display: 'none' }}
                  />
                  Native
                </label>
                <label style={{ 
                  flex: 1, 
                  textAlign: 'center', 
                  padding: '10px 8px', 
                  fontSize: 14, 
                  cursor: 'pointer',
                  borderRadius: 6,
                  background: payoutType === "usdc" ? '#3D3D3D' : 'transparent',
                  color: payoutType === "usdc" ? '#fff' : '#9CA3AF',
                  transition: 'all 0.2s',
                  fontWeight: payoutType === "usdc" ? 600 : 400,
                }}>
                  <input 
                    type="radio" 
                    name="payoutType" 
                    value="usdc" 
                    checked={payoutType === "usdc"} 
                    onChange={() => setPayoutType("usdc")}
                    style={{ display: 'none' }}
                  />
                  USDC
                </label>
              </div>
              {/* Treasury Balances - shown below toggle */}
              <div style={{ marginTop: 12, fontSize: 11, color: '#9CA3AF', fontFamily: 'monospace', minHeight: 32 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {payoutType === "native" ? (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, alignItems: 'center' }}>
                        <span style={{ color: '#39ff14', textShadow: '0 0 4px #39ff14' }}>Moonbeam</span>
                        <span style={{ fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{treasuryBalances.glmr === "Fetching..." ? "Fetching..." : treasuryBalances.glmr + " GLMR"}</span>
                        <span style={{ fontVariantNumeric: 'tabular-nums', textAlign: 'right', color: '#6b7280' }}>{treasuryBalances.glmrUsd === "Fetching..." ? "" : "$ " + treasuryBalances.glmrUsd}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, alignItems: 'center' }}>
                        <span style={{ color: '#39ff14', textShadow: '0 0 4px #39ff14' }}>Moonriver</span>
                        <span style={{ fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{treasuryBalances.movr === "Fetching..." ? "Fetching..." : treasuryBalances.movr + " MOVR"}</span>
                        <span style={{ fontVariantNumeric: 'tabular-nums', textAlign: 'right', color: '#6b7280' }}>{treasuryBalances.movrUsd === "Fetching..." ? "" : "$ " + treasuryBalances.movrUsd}</span>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, alignItems: 'center' }}>
                      <span style={{ color: '#39ff14', textShadow: '0 0 4px #39ff14' }}>Moonbeam</span>
                      <span style={{ fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{treasuryBalances.usdc === "Fetching..." ? "Fetching..." : treasuryBalances.usdc + " USDC"}</span>
                      <span style={{ fontVariantNumeric: 'tabular-nums', textAlign: 'right', color: '#6b7280' }}>{treasuryBalances.usdc === "Fetching..." ? "" : "$ " + treasuryBalances.usdc}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>
                Payment Amount
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 120, position: 'relative' }}>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={usdAmount}
                    onChange={e => {
                      const cleaned = sanitizeAmountInput(e.target.value);
                      setUsdAmount(formatAmountWithGrouping(cleaned));
                    }}
                    required
                    style={{
                      width: '100%',
                      padding: '8px',
                      paddingRight: currency === "EUR" && hasTypedAmount ? 120 : 8,
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
                        fontSize: 11,
                        color: '#D1D5DB',
                        background: '#0f1112',
                        padding: '2px 4px',
                        borderRadius: 4,
                        pointerEvents: 'none',
                        boxShadow: '0 0 6px rgba(0,0,0,0.35)',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {currency === "EUR"
                        ? fxRate
                          ? `≈ ${usdFormatter.format(liveUsdAmount)} USD`
                          : "Waiting..."
                        : `= ${usdFormatter.format(liveUsdAmount)} USD`}
                    </span>
                  )}
                </div>
                <select
                  value={currency}
                  onChange={e => setCurrency(e.target.value as "USD" | "EUR")}
                  style={{ width: 80, padding: 8, fontSize: 16, background: '#0f1112', color: 'white', borderRadius: 4, border: '1px solid #2d2d2d' }}
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
                placeholder="0x..."
                required
                style={{ 
                  width: '100%', 
                  padding: 8, 
                  fontSize: 16,
                  color: '#ffffff'
                }}
              />
              <style>{`
                input[placeholder="0x..."]::placeholder {
                  color: #6b7280;
                  opacity: 0.7;
                }
              `}</style>
            </div>
            {payoutType === "native" && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Payout Ratio</div>
              <div style={{ 
                background: '#0f1112', 
                padding: '16px', 
                borderRadius: 8, 
                border: '1px solid #2d2d2d',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, flexDirection: 'row', flexWrap: 'wrap' }}>
                  {/* Pie Chart */}
                  <div style={{ 
                    position: 'relative', 
                    width: 60, 
                    height: 60,
                    flexShrink: 0
                  }}>
                    <svg width="60" height="60" viewBox="0 0 80 80">
                      {/* Background circle (MOVR portion) */}
                      <circle
                        cx="40"
                        cy="40"
                        r="36"
                        fill="none"
                        stroke="#6b7280"
                        strokeWidth="8"
                      />
                      {/* Foreground circle (GLMR portion) */}
                      <circle
                        cx="40"
                        cy="40"
                        r="36"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="8"
                        strokeDasharray={`${glmrRatio * 2.26} ${226 - glmrRatio * 2.26}`}
                        transform="rotate(-90 40 40)"
                        style={{ transition: 'stroke-dasharray 0.3s ease' }}
                      />
                    </svg>
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#ffffff'
                    }}>
                      {glmrRatio}%
                    </div>
                  </div>
                  
                  {/* Ratio Display */}
                  <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        marginBottom: 4,
                        fontSize: 13
                      }}>
                        <span style={{ color: '#9CA3AF' }}>GLMR</span>
                        <span style={{ fontWeight: 600, color: '#ffffff' }}>{glmrRatio}%</span>
                      </div>
                      <div style={{ 
                        height: '4px', 
                        background: '#1a1d1f', 
                        borderRadius: 2, 
                        overflow: 'hidden',
                        marginBottom: 8
                      }}>
                        <div style={{ 
                          width: `${glmrRatio}%`, 
                          background: '#ffffff',
                          transition: 'width 0.3s ease',
                          height: '100%'
                        }} />
                      </div>
                    </div>
                    <div>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        marginBottom: 4,
                        fontSize: 13
                      }}>
                        <span style={{ color: '#9CA3AF' }}>MOVR</span>
                        <span style={{ fontWeight: 600, color: '#ffffff' }}>{100 - glmrRatio}%</span>
                      </div>
                      <div style={{ 
                        height: '4px', 
                        background: '#1a1d1f', 
                        borderRadius: 2, 
                        overflow: 'hidden'
                      }}>
                        <div style={{ 
                          width: `${100 - glmrRatio}%`, 
                          background: '#6b7280',
                          transition: 'width 0.3s ease',
                          height: '100%'
                        }} />
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Slider Control */}
                <div style={{ marginBottom: 16 }}>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={glmrRatio}
                    onChange={e => setGlmrRatio(parseInt(e.target.value))}
                    onTouchStart={e => e.stopPropagation()}
                    onTouchMove={e => e.stopPropagation()}
                    style={{
                      width: '100%',
                      height: '6px',
                      background: '#1a1d1f',
                      borderRadius: 3,
                      outline: 'none',
                      WebkitAppearance: 'none',
                      appearance: 'none',
                      touchAction: 'none'
                    }}
                  />
                  <style>{`
                    input[type="range"]::-webkit-slider-thumb {
                      -webkit-appearance: none;
                      appearance: none;
                      width: 16px;
                      height: 16px;
                      border-radius: 50%;
                      background: #ffffff;
                      cursor: pointer;
                      border: 2px solid #0f1112;
                    }
                    input[type="range"]::-moz-range-thumb {
                      width: 16px;
                      height: 16px;
                      border-radius: 50%;
                      background: #ffffff;
                      cursor: pointer;
                      border: 2px solid #0f1112;
                    }
                    input[type="range"] {
                      touch-action: none;
                    }
                  `}</style>
                </div>
                
                {/* Ratio Input Controls */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 80 }}>
                    <label style={{ 
                      display: 'block', 
                      fontSize: 11, 
                      color: '#9CA3AF', 
                      marginBottom: 4 
                    }}>
                      GLMR %
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={glmrRatio}
                      onChange={e => {
                        const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                        setGlmrRatio(val);
                      }}
                      style={{
                        width: '100%',
                        padding: '6px',
                        fontSize: 13,
                        background: '#1a1d1f',
                        border: '1px solid #2d2d2d',
                        borderRadius: 4,
                        color: '#ffffff',
                        outline: 'none'
                      }}
                    />
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: 14,
                    color: '#6b7280',
                    fontWeight: 600,
                    flexShrink: 0
                  }}>
                    =
                  </div>
                  <div style={{ flex: 1, minWidth: 80 }}>
                    <label style={{ 
                      display: 'block', 
                      fontSize: 11, 
                      color: '#9CA3AF', 
                      marginBottom: 4 
                    }}>
                      MOVR %
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={100 - glmrRatio}
                      onChange={e => {
                        const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                        setGlmrRatio(100 - val);
                      }}
                      style={{
                        width: '100%',
                        padding: '6px',
                        fontSize: 13,
                        background: '#1a1d1f',
                        border: '1px solid #2d2d2d',
                        borderRadius: 4,
                        color: '#ffffff',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
            )}
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
                    placeholder="0x..."
                    required={proxy}
                    style={{ width: '100%', padding: 8, fontSize: 16 }}
                  />
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={isSubmitDisabled}
              style={{
                marginTop: 24,
                padding: '14px 32px',
                fontSize: 18,
                fontWeight: 700,
                background: '#3D3D3D',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                cursor: isSubmitDisabled ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 8px rgba(30,144,255,0.12)',
                transition: 'background 0.2s',
                width: '100%'
              }}
            >
              {loading ? "Calculating..." : isWaitingForRate ? "Waiting for EUR rate..." : "Calculate Payout"}
            </button>
          </form>
          {error && <div className={styles.error} style={{ textAlign: 'center', marginTop: 12 }}>{error}</div>}
        </div>
        <div style={{ minHeight: 400, width: "100%", padding: '0 16px' }}>
          <div
            ref={resultRef}
            style={{
              opacity: showResult ? 1 : 0,
              transform: showResult ? 'scale(1)' : 'scale(0.96)',
              transition: 'opacity 0.7s cubic-bezier(.4,2,.6,1), transform 0.7s cubic-bezier(.4,2,.6,1)',
              filter: showResult ? 'drop-shadow(0 4px 24px #39ff1433)' : 'none',
              background: showResult ? '#181c1f' : 'none',
              borderRadius: 12,
              padding: showResult ? '16px' : 0,
              marginTop: showResult ? 24 : 0,
              boxShadow: showResult ? '0 8px 32px #39ff1422' : 'none',
              pointerEvents: showResult ? 'auto' : 'none',
              maxWidth: 800,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            {showResult && result && (
              <div className={styles.result}>
                {/* Voting Links Section */}
                <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid #2d2d2d' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'white', marginBottom: 10 }}>1. Submit Proposals</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                    <a 
                      href={`https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Fwss.api.moonbeam.network#/extrinsics/decode/${result.glmrCallData.councilCallHex}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'block', padding: '10px 14px', background: '#1a1d1f', borderRadius: 6, color: '#39ff14', textDecoration: 'none', fontSize: 13, fontFamily: 'monospace', border: '1px solid #2d2d2d', textShadow: '0 0 4px #39ff14' }}
                    >
                      Moonbeam: Submit Proposal #{result.moonbeamProposalIndex}
                    </a>
                    <a 
                      href={`https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Fwss.api.moonriver.moonbeam.network#/extrinsics/decode/${result.movrCallData.councilCallHex}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'block', padding: '10px 14px', background: '#1a1d1f', borderRadius: 6, color: '#39ff14', textDecoration: 'none', fontSize: 13, fontFamily: 'monospace', border: '1px solid #2d2d2d', textShadow: '0 0 4px #39ff14' }}
                    >
                      Moonriver: Submit Proposal #{result.moonriverProposalIndex}
                    </a>
                  </div>

                  <div style={{ fontSize: 14, fontWeight: 600, color: 'white', marginBottom: 10 }}>2. Vote AYE</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <a 
                      href={`https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Fwss.api.moonbeam.network#/extrinsics/decode/${result.glmrVoteCallData.voteCallHex}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'block', padding: '10px 14px', background: '#1a1d1f', borderRadius: 6, color: '#39ff14', textDecoration: 'none', fontSize: 13, fontFamily: 'monospace', border: '1px solid #2d2d2d', textShadow: '0 0 4px #39ff14' }}
                    >
                      Moonbeam: Vote AYE (Proposal #{result.moonbeamProposalIndex})
                    </a>
                    <a 
                      href={`https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Fwss.api.moonriver.moonbeam.network#/extrinsics/decode/${result.movrVoteCallData.voteCallHex}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'block', padding: '10px 14px', background: '#1a1d1f', borderRadius: 6, color: '#39ff14', textDecoration: 'none', fontSize: 13, fontFamily: 'monospace', border: '1px solid #2d2d2d', textShadow: '0 0 4px #39ff14' }}
                    >
                      Moonriver: Vote AYE (Proposal #{result.moonriverProposalIndex})
                    </a>
                  </div>
                  <div style={{ marginTop: 12, fontSize: 11, color: '#6b7280', fontStyle: 'italic' }}>
                    Note: Before voting, replace the placeholder hash (0x0000...) in Polkadot.js with the actual on-chain proposal hash
                  </div>
                </div>

                {/* Original Summary */}
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 'clamp(11px, 2.5vw, 14px)', background: 'none', color: '#39ff14', marginBottom: 16, fontFamily: 'monospace', textShadow: '0 0 0px #39ff14, 0 0 4px #39ff14', overflowX: 'auto' }}>{renderSummaryWithLinks(result.summary)}</pre>
                <button onClick={() => handleCopy(result.summary)} style={{ marginBottom: 18, fontSize: 14, padding: '8px 16px', borderRadius: 6, background: '#3D3D3D', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px #1e90ff22', width: '100%' }}>Copy Full Summary</button>
                <details>
                  <summary style={{ fontSize: 14, fontWeight: 600, color: 'white', cursor: 'pointer' }}>Show advanced details</summary>
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

                {/* Forum Reply Section - at the end */}
                <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #2d2d2d' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#9CA3AF', marginBottom: 10 }}>3. Reply</div>
                  <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 'clamp(11px, 2.5vw, 13px)', background: 'none', color: '#39ff14', padding: 12, marginBottom: 12, fontFamily: 'monospace', textShadow: '0 0 0px #39ff14, 0 0 4px #39ff14' }}>{renderSummaryWithLinks(result.forumReply)}</pre>
                  <button onClick={() => handleCopy(result.forumReply)} style={{ fontSize: 14, padding: '8px 16px', borderRadius: 6, background: '#3D3D3D', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px #1e90ff22', width: '100%' }}>Copy Forum Reply</button>
                </div>
              </div>
            )}
          </div>
          <div style={{ textAlign: 'center', marginTop: 32, marginBottom: 24, fontSize: 11, color: '#6b7280', fontStyle: 'italic' }}>
            Disclaimer: This tool is provided as-is. Always double-check all calculations and on-chain data before submitting any proposals or votes.
          </div>
        </div>
      </main>
    </div>
  );
}
