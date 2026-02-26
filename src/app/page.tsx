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

const COUNCIL_MEMBERS: Record<string, string> = {
  "Simon": "0x4138574878c133d3A12009d6F54B8F26De700834",
  "Yaron": "0x1CdC248174ec9e9c505fabDbb0E037B5AcaB5c13",
  "Aaron": "0xB19CC53a12F734a9Ced967043F3B259F8b111617",
  "Michele": "0xB969639e3Cbf1e5a1d753efb2be09De4f34001f7",
  "Sicco": "0xE5169Beb6241EB54813D082F643C179809F60A2F",
};

const CATEGORIES = ["Infrastructure", "Wallet", "Tooling", "Explorer", "DeFi", "NFT", "Education", "Other"];

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
  const [separateMoonriverAddress, setSeparateMoonriverAddress] = useState(false);
  const [moonriverRecipient, setMoonriverRecipient] = useState("");
  const [glmrRatio, setGlmrRatio] = useState(50); // Default 50% GLMR, 50% MOVR
  
  // Documentation fields
  const [submitterName, setSubmitterName] = useState("Simon");
  const [projectLabel, setProjectLabel] = useState("");
  const [category, setCategory] = useState("Infrastructure");
  const [forumUrl, setForumUrl] = useState("");
  const [forumContent, setForumContent] = useState<string | null>(null);
  const [forumTitle, setForumTitle] = useState<string | null>(null);
  const [forumLoading, setForumLoading] = useState(false);
  const [docsExpanded, setDocsExpanded] = useState(false);
  
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
    payoutType?: "native" | "usdc";
    glmrAmount?: number;
    movrAmount?: number;
    usdcAmount?: number;
    moonbeamProposalIndex?: number;
    moonriverProposalIndex?: number;
    moonbeamSpendIndex?: number;
    moonriverSpendIndex?: number;
    glmrCallData?: {
      treasuryCallHex: string;
      treasuryCallHash: string;
      councilCallHex: string;
      councilCallHash: string;
    };
    movrCallData?: {
      treasuryCallHex: string;
      treasuryCallHash: string;
      councilCallHex: string;
      councilCallHash: string;
    };
    usdcCallData?: {
      treasuryCallHex: string;
      treasuryCallHash: string;
      councilCallHex: string;
      councilCallHash: string;
    };
    glmrVoteCallData?: {
      voteCallHex: string;
    };
    movrVoteCallData?: {
      voteCallHex: string;
    };
    usdcVoteCallData?: {
      voteCallHex: string;
    };
    glmrCloseCallData?: {
      closeCallHex: string;
    };
    movrCloseCallData?: {
      closeCallHex: string;
    };
    usdcCloseCallData?: {
      closeCallHex: string;
    };
    glmrPayoutCallData?: {
      payoutCallHex: string;
    };
    movrPayoutCallData?: {
      payoutCallHex: string;
    };
    usdcPayoutCallData?: {
      payoutCallHex: string;
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
    recipient?: string;
    moonriverRecipient?: string;
    usdAmount?: number;
  } | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [copyNotification, setCopyNotification] = useState<string | null>(null);
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
          separateMoonriverAddress,
          moonriverRecipient: separateMoonriverAddress ? moonriverRecipient : undefined,
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

  // Auto-fetch forum content when result is shown and forumUrl is provided
  useEffect(() => {
    if (showResult && result && forumUrl && !forumContent && !forumLoading) {
      setForumLoading(true);
      fetch("/api/forum-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: forumUrl }),
      })
        .then(res => res.json())
        .then(data => {
          setForumContent(data.content);
          setForumTitle(data.title);
        })
        .catch(err => {
          console.error(err);
        })
        .finally(() => {
          setForumLoading(false);
        });
    }
  }, [showResult, result, forumUrl]);

  function handleCopy(text: string, label?: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopyNotification(label || 'Copied!');
      setTimeout(() => setCopyNotification(null), 2000);
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
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
      {/* Copy notification - at the very top level */}
      {copyNotification && (
        <div style={{ 
          position: 'fixed', 
          top: 20, 
          left: '50%', 
          transform: 'translateX(-50%)',
          background: '#39ff14', 
          color: '#0f1112', 
          padding: '12px 24px', 
          borderRadius: 8, 
          fontWeight: 700,
          fontSize: 14,
          boxShadow: '0 4px 20px rgba(57, 255, 20, 0.5)',
          zIndex: 999999,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          {copyNotification}
        </div>
      )}
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
                placeholder={separateMoonriverAddress ? "0x... (for GLMR payout)" : "0x..."}
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
              {payoutType === "native" && (
                <div style={{ marginTop: 10 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 500, fontSize: 14 }}>
                    <input
                      type="checkbox"
                      checked={separateMoonriverAddress}
                      onChange={e => setSeparateMoonriverAddress(e.target.checked)}
                    />
                    Separate Moonriver Address
                  </label>
                  {separateMoonriverAddress && (
                    <input
                      type="text"
                      value={moonriverRecipient}
                      onChange={e => setMoonriverRecipient(e.target.value)}
                      placeholder="0x... (for MOVR payout)"
                      required={separateMoonriverAddress}
                      style={{ width: '100%', padding: 8, fontSize: 16, color: '#ffffff', marginTop: 8 }}
                    />
                  )}
                </div>
              )}
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
                <input
                  type="text"
                  value={proxyAddress}
                  onChange={e => setProxyAddress(e.target.value)}
                  placeholder="0x..."
                  required={proxy}
                  style={{ width: '100%', padding: 8, fontSize: 16, marginTop: 10 }}
                />
              )}
            </div>
            
            {/* Documentation Fields */}
            <div style={{ marginBottom: 20, padding: 16, background: '#0f1112', borderRadius: 8, border: '1px solid #2d2d2d' }}>
              <div style={{ fontWeight: 600, marginBottom: 12, color: '#9CA3AF', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Documentation (Optional)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 500, marginBottom: 4, fontSize: 13 }}>Submitter</div>
                  <select
                    value={submitterName}
                    onChange={e => setSubmitterName(e.target.value)}
                    style={{ width: '100%', padding: 8, fontSize: 14, background: '#1a1d1f', color: 'white', borderRadius: 4, border: '1px solid #2d2d2d' }}
                  >
                    {Object.keys(COUNCIL_MEMBERS).map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div style={{ fontWeight: 500, marginBottom: 4, fontSize: 13 }}>Category</div>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    style={{ width: '100%', padding: 8, fontSize: 14, background: '#1a1d1f', color: 'white', borderRadius: 4, border: '1px solid #2d2d2d' }}
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 500, marginBottom: 4, fontSize: 13 }}>Project Label</div>
                <input
                  type="text"
                  value={projectLabel}
                  onChange={e => setProjectLabel(e.target.value)}
                  placeholder="e.g., OnFinality RPC Q1 2026"
                  style={{ width: '100%', padding: 8, fontSize: 14, background: '#1a1d1f', color: 'white', borderRadius: 4, border: '1px solid #2d2d2d' }}
                />
              </div>
              <div>
                <div style={{ fontWeight: 500, marginBottom: 4, fontSize: 13 }}>Forum Post URL</div>
                <input
                  type="text"
                  value={forumUrl}
                  onChange={e => {
                    setForumUrl(e.target.value);
                    setForumContent(null);
                    setForumTitle(null);
                  }}
                  placeholder="https://forum.moonbeam.network/t/..."
                  style={{ width: '100%', padding: 8, fontSize: 14, background: '#1a1d1f', color: 'white', borderRadius: 4, border: '1px solid #2d2d2d' }}
                />
              </div>
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
                
                {/* Treasury Council Steps */}
                <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid #2d2d2d' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'white', marginBottom: 10 }}>1. Submit Proposals</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                    {result.payoutType === "usdc" ? (
                      <>
                        {result.usdcCallData && result.moonbeamProposalIndex !== undefined && (
                          <a 
                            href={`https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Fwss.api.moonbeam.network#/extrinsics/decode/${result.usdcCallData.councilCallHex}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'block', padding: '10px 14px', background: '#1a1d1f', borderRadius: 6, color: '#39ff14', textDecoration: 'none', fontSize: 13, fontFamily: 'monospace', border: '1px solid #2d2d2d', textShadow: '0 0 4px #39ff14' }}
                          >
                            Moonbeam: Submit USDC Proposal #{result.moonbeamProposalIndex}
                          </a>
                        )}
                      </>
                    ) : (
                      <>
                        {result.glmrCallData && result.moonbeamProposalIndex !== undefined && (
                          <a 
                            href={`https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Fwss.api.moonbeam.network#/extrinsics/decode/${result.glmrCallData.councilCallHex}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'block', padding: '10px 14px', background: '#1a1d1f', borderRadius: 6, color: '#39ff14', textDecoration: 'none', fontSize: 13, fontFamily: 'monospace', border: '1px solid #2d2d2d', textShadow: '0 0 4px #39ff14' }}
                          >
                            Moonbeam: Submit Proposal #{result.moonbeamProposalIndex}
                          </a>
                        )}
                        {result.movrCallData && result.moonriverProposalIndex !== undefined && (
                          <a 
                            href={`https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Fwss.api.moonriver.moonbeam.network#/extrinsics/decode/${result.movrCallData.councilCallHex}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'block', padding: '10px 14px', background: '#1a1d1f', borderRadius: 6, color: '#39ff14', textDecoration: 'none', fontSize: 13, fontFamily: 'monospace', border: '1px solid #2d2d2d', textShadow: '0 0 4px #39ff14' }}
                          >
                            Moonriver: Submit Proposal #{result.moonriverProposalIndex}
                          </a>
                        )}
                      </>
                    )}
                  </div>

                  <div style={{ fontSize: 14, fontWeight: 600, color: 'white', marginBottom: 10 }}>2. Vote AYE</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 8 }}>
                    {result.payoutType === "usdc" ? (
                      <>
                        {result.usdcVoteCallData && result.moonbeamProposalIndex !== undefined && (
                          <a 
                            href={`https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Fwss.api.moonbeam.network#/extrinsics/decode/${result.usdcVoteCallData.voteCallHex}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'block', padding: '10px 14px', background: '#1a1d1f', borderRadius: 6, color: '#39ff14', textDecoration: 'none', fontSize: 13, fontFamily: 'monospace', border: '1px solid #2d2d2d', textShadow: '0 0 4px #39ff14' }}
                          >
                            Moonbeam: Vote AYE (USDC Proposal #{result.moonbeamProposalIndex})
                          </a>
                        )}
                      </>
                    ) : (
                      <>
                        {result.glmrVoteCallData && result.moonbeamProposalIndex !== undefined && (
                          <a 
                            href={`https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Fwss.api.moonbeam.network#/extrinsics/decode/${result.glmrVoteCallData.voteCallHex}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'block', padding: '10px 14px', background: '#1a1d1f', borderRadius: 6, color: '#39ff14', textDecoration: 'none', fontSize: 13, fontFamily: 'monospace', border: '1px solid #2d2d2d', textShadow: '0 0 4px #39ff14' }}
                          >
                            Moonbeam: Vote AYE (Proposal #{result.moonbeamProposalIndex})
                          </a>
                        )}
                        {result.movrVoteCallData && result.moonriverProposalIndex !== undefined && (
                          <a 
                            href={`https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Fwss.api.moonriver.moonbeam.network#/extrinsics/decode/${result.movrVoteCallData.voteCallHex}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'block', padding: '10px 14px', background: '#1a1d1f', borderRadius: 6, color: '#39ff14', textDecoration: 'none', fontSize: 13, fontFamily: 'monospace', border: '1px solid #2d2d2d', textShadow: '0 0 4px #39ff14' }}
                          >
                            Moonriver: Vote AYE (Proposal #{result.moonriverProposalIndex})
                          </a>
                        )}
                      </>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7280', fontStyle: 'italic', marginBottom: 20 }}>
                    Note: Before voting, replace the placeholder hash (0x0000...) in Polkadot.js with the actual on-chain proposal hash
                  </div>

                  {/* Forum Reply Section - Step 3 */}
                  <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid #2d2d2d' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'white', marginBottom: 10 }}>3. Reply</div>
                    <div style={{ background: 'rgba(57, 255, 20, 0.05)', borderRadius: 8, padding: 12, marginBottom: 12, border: '1px solid rgba(57, 255, 20, 0.15)' }}>
                      <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 'clamp(11px, 2.5vw, 13px)', background: 'none', color: '#39ff14', padding: 0, marginBottom: 0, fontFamily: 'monospace', textShadow: '0 0 0px #39ff14, 0 0 4px #39ff14' }}>{renderSummaryWithLinks(result.forumReply)}</pre>
                    </div>
                    <button onClick={() => handleCopy(result.forumReply, 'Forum reply copied!')} style={{ fontSize: 14, padding: '8px 16px', borderRadius: 6, background: '#3D3D3D', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px #1e90ff22', width: '100%' }}>Copy Forum Reply</button>
                  </div>

                  <div style={{ fontSize: 14, fontWeight: 600, color: 'white', marginBottom: 10 }}>4. Check for 3 AYE votes</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                    <a 
                      href="https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Fwss.api.moonbeam.network#/chainstate"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'block', padding: '10px 14px', background: '#1a1d1f', borderRadius: 6, color: '#39ff14', textDecoration: 'none', fontSize: 13, fontFamily: 'monospace', border: '1px solid #2d2d2d', textShadow: '0 0 4px #39ff14' }}
                    >
                      Moonbeam: Check voting state (treasuryCouncilCollective.voting)
                    </a>
                    {result.payoutType !== "usdc" && result.moonriverProposalIndex !== undefined && (
                      <a 
                        href="https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Fwss.api.moonriver.moonbeam.network#/chainstate"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'block', padding: '10px 14px', background: '#1a1d1f', borderRadius: 6, color: '#39ff14', textDecoration: 'none', fontSize: 13, fontFamily: 'monospace', border: '1px solid #2d2d2d', textShadow: '0 0 4px #39ff14' }}
                      >
                        Moonriver: Check voting state (treasuryCouncilCollective.voting)
                      </a>
                    )}
                  </div>

                  <div style={{ fontSize: 14, fontWeight: 600, color: 'white', marginBottom: 10 }}>5. Close Proposal</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                    {result.payoutType === "usdc" ? (
                      <>
                        {result.usdcCloseCallData && result.moonbeamProposalIndex !== undefined && (
                          <a 
                            href={`https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Fwss.api.moonbeam.network#/extrinsics/decode/${result.usdcCloseCallData.closeCallHex}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'block', padding: '10px 14px', background: '#1a1d1f', borderRadius: 6, color: '#39ff14', textDecoration: 'none', fontSize: 13, fontFamily: 'monospace', border: '1px solid #2d2d2d', textShadow: '0 0 4px #39ff14' }}
                          >
                            Moonbeam: Close Proposal #{result.moonbeamProposalIndex}
                          </a>
                        )}
                      </>
                    ) : (
                      <>
                        {result.glmrCloseCallData && result.moonbeamProposalIndex !== undefined && (
                          <a 
                            href={`https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Fwss.api.moonbeam.network#/extrinsics/decode/${result.glmrCloseCallData.closeCallHex}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'block', padding: '10px 14px', background: '#1a1d1f', borderRadius: 6, color: '#39ff14', textDecoration: 'none', fontSize: 13, fontFamily: 'monospace', border: '1px solid #2d2d2d', textShadow: '0 0 4px #39ff14' }}
                          >
                            Moonbeam: Close Proposal #{result.moonbeamProposalIndex}
                          </a>
                        )}
                        {result.movrCloseCallData && result.moonriverProposalIndex !== undefined && (
                          <a 
                            href={`https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Fwss.api.moonriver.moonbeam.network#/extrinsics/decode/${result.movrCloseCallData.closeCallHex}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'block', padding: '10px 14px', background: '#1a1d1f', borderRadius: 6, color: '#39ff14', textDecoration: 'none', fontSize: 13, fontFamily: 'monospace', border: '1px solid #2d2d2d', textShadow: '0 0 4px #39ff14' }}
                          >
                            Moonriver: Close Proposal #{result.moonriverProposalIndex}
                          </a>
                        )}
                      </>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7280', fontStyle: 'italic', marginBottom: 20 }}>
                    Note: Before closing, replace the placeholder hash (0x0000...) in Polkadot.js with the actual on-chain proposal hash
                  </div>

                  <div style={{ fontSize: 14, fontWeight: 600, color: 'white', marginBottom: 10 }}>6. Claim Funds</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                    {result.payoutType === "usdc" ? (
                      <>
                        {result.usdcPayoutCallData && result.moonbeamSpendIndex !== undefined && (
                          <a 
                            href={`https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Fwss.api.moonbeam.network#/extrinsics/decode/${result.usdcPayoutCallData.payoutCallHex}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'block', padding: '10px 14px', background: '#1a1d1f', borderRadius: 6, color: '#39ff14', textDecoration: 'none', fontSize: 13, fontFamily: 'monospace', border: '1px solid #2d2d2d', textShadow: '0 0 4px #39ff14' }}
                          >
                            Moonbeam: Claim Funds (Spend #{result.moonbeamSpendIndex})
                          </a>
                        )}
                      </>
                    ) : (
                      <>
                        {result.glmrPayoutCallData && result.moonbeamSpendIndex !== undefined && (
                          <a 
                            href={`https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Fwss.api.moonbeam.network#/extrinsics/decode/${result.glmrPayoutCallData.payoutCallHex}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'block', padding: '10px 14px', background: '#1a1d1f', borderRadius: 6, color: '#39ff14', textDecoration: 'none', fontSize: 13, fontFamily: 'monospace', border: '1px solid #2d2d2d', textShadow: '0 0 4px #39ff14' }}
                          >
                            Moonbeam: Claim Funds (Spend #{result.moonbeamSpendIndex})
                          </a>
                        )}
                        {result.movrPayoutCallData && result.moonriverSpendIndex !== undefined && (
                          <a 
                            href={`https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Fwss.api.moonriver.moonbeam.network#/extrinsics/decode/${result.movrPayoutCallData.payoutCallHex}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'block', padding: '10px 14px', background: '#1a1d1f', borderRadius: 6, color: '#39ff14', textDecoration: 'none', fontSize: 13, fontFamily: 'monospace', border: '1px solid #2d2d2d', textShadow: '0 0 4px #39ff14' }}
                          >
                            Moonriver: Claim Funds (Spend #{result.moonriverSpendIndex})
                          </a>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Step 7: Documentation */}
                <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid #2d2d2d' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'white', marginBottom: 10 }}>7. Documentation</div>
                  {/* Google Sheets Export */}
                  <div style={{ marginBottom: 20, padding: 16, background: '#1a1d1f', borderRadius: 8, border: '1px solid #2d2d2d' }}>
                    <div style={{ fontWeight: 600, marginBottom: 12, color: 'white', fontSize: 13 }}>Google Sheets Row</div>
                    {result.payoutType === "usdc" ? (
                      <button
                        onClick={() => {
                            const submitterAddress = COUNCIL_MEMBERS[submitterName] || "";
                            const totalUsd = result.usdAmount || 0;
                            const row = [
                              result.moonbeamProposalIndex || "",
                              result.moonbeamProposalIndex || "",
                              "approveProposal",
                              submitterAddress,
                              result.recipient || recipient,
                              "",
                              result.usdcCallData?.treasuryCallHash || "",
                              "Aye",
                              "",
                              new Date().toISOString().slice(0, 19).replace('T', ' '),
                              `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`,
                              projectLabel || category,
                              category,
                              "USDC",
                              result.usdcAmount?.toFixed(2) || "0",
                              "0",
                              `$${totalUsd.toFixed(2)}`,
                              "100%",
                              `${result.usdcAmount?.toFixed(2) || "0"} USDC`,
                            ].join('\t');
                            handleCopy(row, 'Moonbeam row copied!');
                          }}
                          style={{ width: '100%', padding: '10px 14px', background: '#3D3D3D', borderRadius: 6, color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                        >
                          Copy Moonbeam Row (USDC)
                        </button>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <button
                              onClick={() => {
                              const submitterAddress = COUNCIL_MEMBERS[submitterName] || "";
                              const totalUsd = result.usdAmount || 0;
                              const row = [
                                result.moonbeamProposalIndex || "",
                                result.moonbeamProposalIndex || "",
                                "approveProposal",
                                submitterAddress,
                                result.recipient || recipient,
                                "",
                                result.glmrCallData?.treasuryCallHash || "",
                                "Aye",
                                "",
                                new Date().toISOString().slice(0, 19).replace('T', ' '),
                                `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`,
                                projectLabel || category,
                                category,
                                "GLMR",
                                result.glmrAmount?.toFixed(2) || "0",
                                "0",
                                `$${totalUsd.toFixed(2)}`,
                                `${glmrRatio}%`,
                                `${result.glmrAmount?.toFixed(2) || "0"} GLMR`,
                              ].join('\t');
                              handleCopy(row, 'Moonbeam row copied!');
                            }}
                            style={{ padding: '10px 14px', background: '#3D3D3D', borderRadius: 6, color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                          >
                            Copy Moonbeam Row (GLMR)
                          </button>
                          <button
                              onClick={() => {
                              const submitterAddress = COUNCIL_MEMBERS[submitterName] || "";
                              const movrRecipientAddr = result.moonriverRecipient || result.recipient || recipient;
                              const totalUsd = result.usdAmount || 0;
                              const movrRatio = 100 - glmrRatio;
                              const row = [
                                result.moonriverProposalIndex || "",
                                result.moonriverProposalIndex || "",
                                "approveProposal",
                                submitterAddress,
                                movrRecipientAddr,
                                "",
                                result.movrCallData?.treasuryCallHash || "",
                                "Aye",
                                "",
                                new Date().toISOString().slice(0, 19).replace('T', ' '),
                                `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`,
                                projectLabel || category,
                                category,
                                "MOVR",
                                result.movrAmount?.toFixed(2) || "0",
                                "0",
                                `$${totalUsd.toFixed(2)}`,
                                `${movrRatio}%`,
                                `${result.movrAmount?.toFixed(2) || "0"} MOVR`,
                              ].join('\t');
                              handleCopy(row, 'Moonriver row copied!');
                            }}
                            style={{ padding: '10px 14px', background: '#3D3D3D', borderRadius: 6, color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                          >
                            Copy Moonriver Row (MOVR)
                          </button>
                        </div>
                      )}
                    </div>

                    {/* GitHub Documentation */}
                    <div style={{ padding: 16, background: '#1a1d1f', borderRadius: 8, border: '1px solid #2d2d2d' }}>
                      <div style={{ fontWeight: 600, marginBottom: 12, color: 'white', fontSize: 13 }}>GitHub Treasury Repo Files</div>
                      
                      {/* Forum URL Input */}
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>Forum Post URL</div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input
                            type="text"
                            value={forumUrl}
                            onChange={e => {
                              setForumUrl(e.target.value);
                              setForumContent(null);
                              setForumTitle(null);
                            }}
                            placeholder="https://forum.moonbeam.network/t/..."
                            style={{ flex: 1, padding: 8, fontSize: 13, background: '#0f1112', color: 'white', borderRadius: 4, border: '1px solid #2d2d2d' }}
                          />
                          <button
                            onClick={async () => {
                              if (!forumUrl) return;
                              setForumLoading(true);
                              try {
                                const res = await fetch("/api/forum-content", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ url: forumUrl }),
                                });
                                if (!res.ok) throw new Error("Failed to fetch");
                                const data = await res.json();
                                setForumContent(data.content);
                                setForumTitle(data.title);
                              } catch (err) {
                                console.error(err);
                                setForumContent("Failed to fetch forum content");
                              } finally {
                                setForumLoading(false);
                              }
                            }}
                            disabled={forumLoading}
                            style={{ padding: '8px 12px', background: '#3D3D3D', color: 'white', border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: forumLoading ? 'wait' : 'pointer' }}
                          >
                            {forumLoading ? "Fetching..." : "Fetch"}
                          </button>
                        </div>
                      </div>

                      {/* Generated Files */}
                      <div style={{ marginTop: 16 }}>
                        <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 8 }}>Generated .md Files</div>
                          
                          {result.payoutType === "usdc" ? (
                            <div style={{ marginBottom: 12 }}>
                              <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#39ff14', marginBottom: 4 }}>
                                moonbeam/MBTP{result.moonbeamProposalIndex}.md
                              </div>
                              <button
                                onClick={() => {
                                  const md = `# [${forumTitle || projectLabel || 'Treasury Proposal'}](${forumUrl || ''})

${forumContent || ''}

---
*Generated by Payoutor*
*Proposal ID: ${result.moonbeamProposalIndex}*
*Beneficiary: ${result.recipient || recipient}*
*Reward: ${result.usdcAmount?.toFixed(2) || '0'} USDC*
`;
                                  handleDownload(`MBTP${result.moonbeamProposalIndex}.md`, md);
                                }}
                                style={{ padding: '6px 12px', background: '#3D3D3D', color: 'white', border: 'none', borderRadius: 4, fontSize: 11, cursor: 'pointer', marginRight: 8 }}
                              >
                                Download
                              </button>
                              <button
                                onClick={() => {
                                  const md = `# [${forumTitle || projectLabel || 'Treasury Proposal'}](${forumUrl || ''})

${forumContent || ''}

---
*Generated by Payoutor*
*Proposal ID: ${result.moonbeamProposalIndex}*
*Beneficiary: ${result.recipient || recipient}*
*Reward: ${result.usdcAmount?.toFixed(2) || '0'} USDC*
`;
                                  handleCopy(md, 'Moonbeam .md copied!');
                                }}
                                style={{ padding: '6px 12px', background: '#3D3D3D', color: 'white', border: 'none', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}
                              >
                                Copy
                              </button>
                            </div>
                          ) : (
                            <>
                              {/* Moonbeam file */}
                              <div style={{ marginBottom: 12 }}>
                                <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#39ff14', marginBottom: 4 }}>
                                  moonbeam/MBTP{result.moonbeamProposalIndex}&MRTP{result.moonriverProposalIndex}.md
                                </div>
                                <button
                                  onClick={() => {
                                    const md = `# [${forumTitle || projectLabel || 'Treasury Proposal'}](${forumUrl || ''})

${forumContent || ''}

---
*Generated by Payoutor*
*Moonbeam Proposal ID: ${result.moonbeamProposalIndex}*
*Moonriver Proposal ID: ${result.moonriverProposalIndex}*
*Beneficiary: ${result.recipient || recipient}${result.moonriverRecipient ? ` / ${result.moonriverRecipient}` : ''}*
*Reward: ${result.glmrAmount?.toFixed(4) || '0'} GLMR*
`;
                                    handleDownload(`MBTP${result.moonbeamProposalIndex}&MRTP${result.moonriverProposalIndex}.md`, md);
                                  }}
                                  style={{ padding: '6px 12px', background: '#3D3D3D', color: 'white', border: 'none', borderRadius: 4, fontSize: 11, cursor: 'pointer', marginRight: 8 }}
                                >
                                  Download
                                </button>
                                <button
                                  onClick={() => {
                                    const md = `# [${forumTitle || projectLabel || 'Treasury Proposal'}](${forumUrl || ''})

${forumContent || ''}

---
*Generated by Payoutor*
*Moonbeam Proposal ID: ${result.moonbeamProposalIndex}*
*Moonriver Proposal ID: ${result.moonriverProposalIndex}*
*Beneficiary: ${result.recipient || recipient}${result.moonriverRecipient ? ` / ${result.moonriverRecipient}` : ''}*
*Reward: ${result.glmrAmount?.toFixed(4) || '0'} GLMR*
`;
                                    handleCopy(md, 'Moonbeam .md copied!');
                                  }}
                                  style={{ padding: '6px 12px', background: '#3D3D3D', color: 'white', border: 'none', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}
                                >
                                  Copy
                                </button>
                              </div>
                              {/* Moonriver file */}
                              <div style={{ marginBottom: 12 }}>
                                <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#39ff14', marginBottom: 4 }}>
                                  moonriver/MRTP{result.moonriverProposalIndex}&MBTP{result.moonbeamProposalIndex}.md
                                </div>
                                <button
                                  onClick={() => {
                                    const movrRecipientAddr = result.moonriverRecipient || result.recipient || recipient;
                                    const md = `# [${forumTitle || projectLabel || 'Treasury Proposal'}](${forumUrl || ''})

${forumContent || ''}

---
*Generated by Payoutor*
*Moonbeam Proposal ID: ${result.moonbeamProposalIndex}*
*Moonriver Proposal ID: ${result.moonriverProposalIndex}*
*Beneficiary: ${movrRecipientAddr}*
*Reward: ${result.movrAmount?.toFixed(4) || '0'} MOVR*
`;
                                    handleDownload(`MRTP${result.moonriverProposalIndex}&MBTP${result.moonbeamProposalIndex}.md`, md);
                                  }}
                                  style={{ padding: '6px 12px', background: '#3D3D3D', color: 'white', border: 'none', borderRadius: 4, fontSize: 11, cursor: 'pointer', marginRight: 8 }}
                                >
                                  Download
                                </button>
                                <button
                                  onClick={() => {
                                    const movrRecipientAddr = result.moonriverRecipient || result.recipient || recipient;
                                    const md = `# [${forumTitle || projectLabel || 'Treasury Proposal'}](${forumUrl || ''})

${forumContent || ''}

---
*Generated by Payoutor*
*Moonbeam Proposal ID: ${result.moonbeamProposalIndex}*
*Moonriver Proposal ID: ${result.moonriverProposalIndex}*
*Beneficiary: ${movrRecipientAddr}*
*Reward: ${result.movrAmount?.toFixed(4) || '0'} MOVR*
`;
                                    handleCopy(md, 'Moonriver .md copied!');
                                  }}
                                  style={{ padding: '6px 12px', background: '#3D3D3D', color: 'white', border: 'none', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}
                                >
                                  Copy
                                </button>
                              </div>
                            </>
                          )}

                          {/* README.md Download */}
                          <div style={{ marginTop: 16 }}>
                            <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#39ff14', marginBottom: 4 }}>
                              README.md
                            </div>
                            <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 8 }}>Generated updated Readme.md file</div>
                            {result.payoutType === "usdc" ? (
                              <div style={{ marginBottom: 12 }}>
                                <button
                                  onClick={async () => {
                                    const submitterAddress = COUNCIL_MEMBERS[submitterName] || "";
                                    const moonbeamRow = `| ${result.moonbeamProposalIndex} | ${result.moonbeamProposalIndex} | [${forumTitle || projectLabel || 'Treasury Proposal'}](moonbeam/MBTP${result.moonbeamProposalIndex}.md) | ${submitterAddress} | ${result.recipient || recipient} | ${result.usdcAmount?.toFixed(2) || '0'} USDC | approved |`;
                                    try {
                                      const res = await fetch("/api/readme", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ moonbeamRow, moonriverRow: '', payoutType: 'usdc' }),
                                      });
                                      const data = await res.json();
                                      handleDownload(`README.md`, data.readme);
                                    } catch (err) {
                                      handleDownload(`README.md`, `# Moonbeam Treasury Proposals\n\n| ID | Motion | Proposal | Submitter | Beneficiary | Reward | Status |\n|----|--------|----------|-----------|-------------|--------|--------|\n${moonbeamRow}\n`);
                                    }
                                  }}
                                  style={{ padding: '6px 12px', background: '#3D3D3D', color: 'white', border: 'none', borderRadius: 4, fontSize: 11, cursor: 'pointer', marginRight: 8 }}
                                >
                                  Download
                                </button>
                                <button
                                  onClick={async () => {
                                    const submitterAddress = COUNCIL_MEMBERS[submitterName] || "";
                                    const moonbeamRow = `| ${result.moonbeamProposalIndex} | ${result.moonbeamProposalIndex} | [${forumTitle || projectLabel || 'Treasury Proposal'}](moonbeam/MBTP${result.moonbeamProposalIndex}.md) | ${submitterAddress} | ${result.recipient || recipient} | ${result.usdcAmount?.toFixed(2) || '0'} USDC | approved |`;
                                    try {
                                      const res = await fetch("/api/readme", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ moonbeamRow, moonriverRow: '', payoutType: 'usdc' }),
                                      });
                                      const data = await res.json();
                                      handleCopy(data.readme, 'README.md copied!');
                                    } catch (err) {
                                      handleCopy(`# Moonbeam Treasury Proposals\n\n| ID | Motion | Proposal | Submitter | Beneficiary | Reward | Status |\n|----|--------|----------|-----------|-------------|--------|--------|\n${moonbeamRow}\n`, 'README.md copied!');
                                    }
                                  }}
                                  style={{ padding: '6px 12px', background: '#3D3D3D', color: 'white', border: 'none', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}
                                >
                                  Copy
                                </button>
                              </div>
                            ) : (
                              <div style={{ marginBottom: 12 }}>
                                <button
                                  onClick={async () => {
                                    const submitterAddress = COUNCIL_MEMBERS[submitterName] || "";
                                    const moonbeamRow = `| ${result.moonbeamProposalIndex} | ${result.moonbeamProposalIndex} | [${forumTitle || projectLabel || 'Treasury Proposal'}](moonbeam/MBTP${result.moonbeamProposalIndex}&MRTP${result.moonriverProposalIndex}.md) | ${submitterAddress} | ${result.recipient || recipient} | ${result.glmrAmount?.toFixed(4) || '0'} GLMR | approved |`;
                                    const movrRecipientAddr = result.moonriverRecipient || result.recipient || recipient;
                                    const moonriverRow = `| ${result.moonriverProposalIndex} | ${result.moonriverProposalIndex} | [${forumTitle || projectLabel || 'Treasury Proposal'}](moonriver/MRTP${result.moonriverProposalIndex}&MBTP${result.moonbeamProposalIndex}.md) | ${submitterAddress} | ${movrRecipientAddr} | ${result.movrAmount?.toFixed(4) || '0'} MOVR | approved |`;
                                    try {
                                      const res = await fetch("/api/readme", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ moonbeamRow, moonriverRow, payoutType: 'native' }),
                                      });
                                      const data = await res.json();
                                      handleDownload(`README.md`, data.readme);
                                    } catch (err) {
                                      handleDownload(`README.md`, `# Moonbeam Treasury Proposals\n\n| ID | Motion | Proposal | Submitter | Beneficiary | Reward | Status |\n|----|--------|----------|-----------|-------------|--------|--------|\n${moonbeamRow}\n\n# Moonriver Treasury Proposals\n\n| ID | Motion | Proposal | Submitter | Beneficiary | Reward | Status |\n|----|--------|----------|-----------|-------------|--------|--------|\n${moonriverRow}\n`);
                                    }
                                  }}
                                  style={{ padding: '6px 12px', background: '#3D3D3D', color: 'white', border: 'none', borderRadius: 4, fontSize: 11, cursor: 'pointer', marginRight: 8 }}
                                >
                                  Download
                                </button>
                                <button
                                  onClick={async () => {
                                    const submitterAddress = COUNCIL_MEMBERS[submitterName] || "";
                                    const moonbeamRow = `| ${result.moonbeamProposalIndex} | ${result.moonbeamProposalIndex} | [${forumTitle || projectLabel || 'Treasury Proposal'}](moonbeam/MBTP${result.moonbeamProposalIndex}&MRTP${result.moonriverProposalIndex}.md) | ${submitterAddress} | ${result.recipient || recipient} | ${result.glmrAmount?.toFixed(4) || '0'} GLMR | approved |`;
                                    const movrRecipientAddr = result.moonriverRecipient || result.recipient || recipient;
                                    const moonriverRow = `| ${result.moonriverProposalIndex} | ${result.moonriverProposalIndex} | [${forumTitle || projectLabel || 'Treasury Proposal'}](moonriver/MRTP${result.moonriverProposalIndex}&MBTP${result.moonbeamProposalIndex}.md) | ${submitterAddress} | ${movrRecipientAddr} | ${result.movrAmount?.toFixed(4) || '0'} MOVR | approved |`;
                                    try {
                                      const res = await fetch("/api/readme", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ moonbeamRow, moonriverRow, payoutType: 'native' }),
                                      });
                                      const data = await res.json();
                                      handleCopy(data.readme, 'README.md copied!');
                                    } catch (err) {
                                      handleCopy(`# Moonbeam Treasury Proposals\n\n| ID | Motion | Proposal | Submitter | Beneficiary | Reward | Status |\n|----|--------|----------|-----------|-------------|--------|--------|\n${moonbeamRow}\n\n# Moonriver Treasury Proposals\n\n| ID | Motion | Proposal | Submitter | Beneficiary | Reward | Status |\n|----|--------|----------|-----------|-------------|--------|--------|\n${moonriverRow}\n`, 'README.md copied!');
                                    }
                                  }}
                                  style={{ padding: '6px 12px', background: '#3D3D3D', color: 'white', border: 'none', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}
                                >
                                  Copy
                                </button>
                              </div>
                            )}
                            {/* GitHub repo link */}
                            <div style={{ marginTop: 8, marginBottom: 8 }}>
                              <a href="https://github.com/moonbeam-foundation/treasury" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#39ff14', textDecoration: 'underline' }}>github.com/moonbeam-foundation/treasury</a>
                            </div>
                            {/* README preview */}
                            <div style={{ marginTop: 8, padding: 8, background: '#0f1112', borderRadius: 4, border: '1px solid #2d2d2d' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <div style={{ color: '#9CA3AF', fontSize: 10 }}>New rows to be added:</div>
                                {result.payoutType !== "usdc" && (
                                  <button
                                    onClick={() => {
                                      const submitterAddress = COUNCIL_MEMBERS[submitterName] || "";
                                      const moonbeamRow = `| ${result.moonbeamProposalIndex} | ${result.moonbeamProposalIndex} | [${forumTitle || projectLabel || 'Treasury Proposal'}](moonbeam/MBTP${result.moonbeamProposalIndex}&MRTP${result.moonriverProposalIndex}.md) | ${submitterAddress} | ${result.recipient || recipient} | ${result.glmrAmount?.toFixed(4) || '0'} GLMR | approved |`;
                                      const moonriverRow = `| ${result.moonriverProposalIndex} | ${result.moonriverProposalIndex} | [${forumTitle || projectLabel || 'Treasury Proposal'}](moonriver/MRTP${result.moonriverProposalIndex}&MBTP${result.moonbeamProposalIndex}.md) | ${submitterAddress} | ${result.moonriverRecipient || result.recipient || recipient} | ${result.movrAmount?.toFixed(4) || '0'} MOVR | approved |`;
                                      handleCopy(`${moonbeamRow}\n${moonriverRow}`, 'Both rows copied!');
                                    }}
                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}
                                    title="Copy both rows"
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#39ff14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                    </svg>
                                  </button>
                                )}
                              </div>
                              {result.payoutType === "usdc" ? (
                                <div
                                  onClick={() => {
                                    const submitterAddress = COUNCIL_MEMBERS[submitterName] || "";
                                    const row = `| ${result.moonbeamProposalIndex} | ${result.moonbeamProposalIndex} | [${forumTitle || projectLabel || 'Treasury Proposal'}](moonbeam/MBTP${result.moonbeamProposalIndex}.md) | ${submitterAddress} | ${result.recipient || recipient} | ${result.usdcAmount?.toFixed(2) || '0'} USDC | approved |`;
                                    handleCopy(row, 'Row copied!');
                                  }}
                                  style={{ cursor: 'pointer', padding: '4px 6px', background: 'rgba(57, 255, 20, 0.05)', borderRadius: 4, marginBottom: 4 }}
                                  title="Click to copy"
                                >
                                  <pre style={{ fontSize: 10, color: '#39ff14', fontFamily: 'monospace', margin: 0, whiteSpace: 'pre-wrap', textShadow: '0 0 4px #39ff14' }}>{`| ${result.moonbeamProposalIndex} | ${result.moonbeamProposalIndex} | [${forumTitle || projectLabel || 'Treasury Proposal'}](moonbeam/MBTP${result.moonbeamProposalIndex}.md) | ${COUNCIL_MEMBERS[submitterName] || ""} | ${result.recipient || recipient} | ${result.usdcAmount?.toFixed(2) || '0'} USDC | approved |`}</pre>
                                </div>
                              ) : (
                                <>
                                  <div
                                    onClick={() => {
                                      const submitterAddress = COUNCIL_MEMBERS[submitterName] || "";
                                      const row = `| ${result.moonbeamProposalIndex} | ${result.moonbeamProposalIndex} | [${forumTitle || projectLabel || 'Treasury Proposal'}](moonbeam/MBTP${result.moonbeamProposalIndex}&MRTP${result.moonriverProposalIndex}.md) | ${submitterAddress} | ${result.recipient || recipient} | ${result.glmrAmount?.toFixed(4) || '0'} GLMR | approved |`;
                                      handleCopy(row, 'Moonbeam row copied!');
                                    }}
                                    style={{ cursor: 'pointer', padding: '4px 6px', background: 'rgba(57, 255, 20, 0.05)', borderRadius: 4, marginBottom: 4 }}
                                    title="Click to copy"
                                  >
                                    <pre style={{ fontSize: 10, color: '#39ff14', fontFamily: 'monospace', margin: 0, whiteSpace: 'pre-wrap', textShadow: '0 0 4px #39ff14' }}>{`| ${result.moonbeamProposalIndex} | ${result.moonbeamProposalIndex} | [${forumTitle || projectLabel || 'Treasury Proposal'}](moonbeam/MBTP${result.moonbeamProposalIndex}&MRTP${result.moonriverProposalIndex}.md) | ${COUNCIL_MEMBERS[submitterName] || ""} | ${result.recipient || recipient} | ${result.glmrAmount?.toFixed(4) || '0'} GLMR | approved |`}</pre>
                                  </div>
                                  <div
                                    onClick={() => {
                                      const submitterAddress = COUNCIL_MEMBERS[submitterName] || "";
                                      const movrRecipientAddr = result.moonriverRecipient || result.recipient || recipient;
                                      const row = `| ${result.moonriverProposalIndex} | ${result.moonriverProposalIndex} | [${forumTitle || projectLabel || 'Treasury Proposal'}](moonriver/MRTP${result.moonriverProposalIndex}&MBTP${result.moonbeamProposalIndex}.md) | ${submitterAddress} | ${movrRecipientAddr} | ${result.movrAmount?.toFixed(4) || '0'} MOVR | approved |`;
                                      handleCopy(row, 'Moonriver row copied!');
                                    }}
                                    style={{ cursor: 'pointer', padding: '4px 6px', background: 'rgba(57, 255, 20, 0.05)', borderRadius: 4 }}
                                    title="Click to copy"
                                  >
                                    <pre style={{ fontSize: 10, color: '#39ff14', fontFamily: 'monospace', margin: 0, whiteSpace: 'pre-wrap', textShadow: '0 0 4px #39ff14' }}>{`| ${result.moonriverProposalIndex} | ${result.moonriverProposalIndex} | [${forumTitle || projectLabel || 'Treasury Proposal'}](moonriver/MRTP${result.moonriverProposalIndex}&MBTP${result.moonbeamProposalIndex}.md) | ${COUNCIL_MEMBERS[submitterName] || ""} | ${result.moonriverRecipient || result.recipient || recipient} | ${result.movrAmount?.toFixed(4) || '0'} MOVR | approved |`}</pre>
                                  </div>
                                </>
                              )}
                              </div>
                            </div>
                          </div>
                     </div>
                 </div>

                {/* Summary Section */}
                <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid #2d2d2d' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'white', marginBottom: 10 }}>Summary</div>
                  <div style={{ background: 'rgba(57, 255, 20, 0.05)', borderRadius: 8, padding: 12, marginBottom: 12, border: '1px solid rgba(57, 255, 20, 0.15)' }}>
                    <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 'clamp(11px, 2.5vw, 14px)', background: 'none', color: '#39ff14', padding: 0, marginBottom: 0, fontFamily: 'monospace', textShadow: '0 0 0px #39ff14, 0 0 4px #39ff14', overflowX: 'auto' }}>{renderSummaryWithLinks(result.summary)}</pre>
                  </div>
                  <button onClick={() => handleCopy(result.summary, 'Summary copied!')} style={{ fontSize: 14, padding: '8px 16px', borderRadius: 6, background: '#3D3D3D', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px #1e90ff22', width: '100%' }}>Copy Full Summary</button>
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
