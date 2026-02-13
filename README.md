# payoutor-web

A web-based treasury payout tool for Moonbeam Treasury Council members. Built with Next.js, it calculates payout amounts in GLMR and MOVR tokens using 30-day EMA prices and generates ready-to-submit council proposal call data.

## Features

- **Multi-chain support**: Handles both Moonbeam (GLMR) and Moonriver (MOVR) in one go
- **Automatic price fetching**: Retrieves 30-day EMA prices from Subscan at stable block heights
- **Flexible split ratios**: Configure GLMR/MOVR allocation (default 50/50)
- **EUR support**: Converts EUR to USD using live ECB exchange rates
- **Proxy support**: Submit proposals via proxy account
- **One-click voting**: Pre-built vote extrinsics for council members to vote AYE
- **Forum-ready output**: Copy-paste formatted replies for the Moonbeam forum

## Usage

1. Enter payout amount (USD or EUR) and recipient address
2. Adjust GLMR/MOVR split ratio if needed
3. Optionally enable proxy and enter proxy address
4. Click "Calculate Payout"
5. Copy the forum reply, submit proposals, and vote AYE

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- @polkadot/api

## Live

Deployed at [https://payoutor-web.vercel.app/](https://payoutor-web.vercel.app/)
