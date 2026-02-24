# Google Sheets Column Structure for Treasury Tracking

## Suggested Columns (v2 - with USDC support)

| # | Column | Description | Native Example | USDC Example |
|---|--------|-------------|----------------|--------------|
| 1 | **Proposal ID** | Network-specific proposal ID | 62 | 63 |
| 2 | **Motion ID** | Usually same as Proposal ID | 62 | 63 |
| 3 | **Type** | Always `approveProposal` | approveProposal | approveProposal |
| 4 | **Network** | Moonbeam or Moonriver | Moonbeam / Moonriver | Moonbeam |
| 5 | **Payout Type** | Native or USDC | Native | USDC |
| 6 | **Submission Address** | Council member who submitted | 0x1CdC... | 0x1CdC... |
| 7 | **Beneficiary Address** | Recipient | 0xa674... | 0xa674... |
| 8 | **GitHub URL** | Link to .md file | `.../MBTP62&MRTP59.md` | `.../MBTP63.md` |
| 9 | **Proposal Hash** | Treasury call hash | 0x2bac... | 0x... |
| 10 | **Closing Result** | Aye or Nay | Aye | Aye |
| 11 | **Closing Block** | Block when closed | 2,319,497 | (filled later) |
| 12 | **Awarded Date** | Date of payout | 2022-11-19 18:28:54 | (filled later) |
| 13 | **Quarter** | Q1-Q4 | Q1 | Q4 |
| 14 | **Label** | Project name | OnFinality RPC | Subscan Explorer |
| 15 | **Category** | Infrastructure/Wallet/etc | Infrastructure | Explorer |
| 16 | **Token Amount** | Raw token amount | 122,518.36 | 50,000.00 |
| 17 | **Token** | GLMR / MOVR / USDC | GLMR | USDC |
| 18 | **Total USD** | Total USD value | $122,518.36 | $50,000.00 |
| 19 | **Proportion** | % of total payout | 80% / 20% | 100% |
| 20 | **Proportion USD** | USD for this row | $98,014.69 | $50,000.00 |

## Key Changes from Current (v1):

1. **Added `Network`** - Distinguishes Moonbeam vs Moonriver rows
2. **Added `Payout Type`** - Distinguishes Native vs USDC
3. **Added `Token`** - Explicitly shows GLMR/MOVR/USDC
4. **Renamed `Net Tokens` → `Token Amount`** - Clearer naming
5. **Renamed `GLMR Proportion` → `Proportion`** - Works for any token
6. **Renamed `GLMR USD` → `Proportion USD`** - Works for any token

## Row Structure Examples:

### Native Payout (USD 10,000, 80/20 split) → 2 rows:
```
62 | 62 | approveProposal | Moonbeam | Native | 0x1CdC... | 0xa674... | ...MBTP62&MRTP59.md | 0x... | Aye | | | Q4 | OnFinality | Infrastructure | 122,518.36 | GLMR | $122,518.36 | 80% | $98,014.69
59 | 59 | approveProposal | Moonriver | Native | 0x1CdC... | 0xa674... | ...MRTP59&MBTP62.md | 0x... | Aye | | | Q4 | OnFinality | Infrastructure | 1,165.58 | MOVR | $29,144.50 | 20% | $5,828.90
```

### USDC Payout (USD 50,000) → 1 row:
```
63 | 63 | approveProposal | Moonbeam | USDC | 0x1CdC... | 0xa674... | ...MBTP63.md | 0x... | Aye | | | Q4 | Subscan | Explorer | 50,000.00 | USDC | $50,000.00 | 100% | $50,000.00
```

## Tab Structure:
- Tab 1: "Moonbeam" - All Moonbeam proposals (GLMR + USDC)
- Tab 2: "Moonriver" - All Moonriver proposals (MOVR only)
