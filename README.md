# Payoutor

A comprehensive treasury payout tool for Moonbeam Treasury Council members. Built with Next.js, it streamlines the entire payout process from calculation to documentation, supporting both native tokens (GLMR/MOVR) and USDC payouts.

## Features

### Payout Types
- **Native token payouts**: Split payments between GLMR (Moonbeam) and MOVR (Moonriver) with configurable ratios
- **USDC payouts**: Single USDC payment on Moonbeam for stable dollar-denominated payouts
- **Automatic price fetching**: Retrieves 30-day EMA prices from Subscan at stable block heights
- **EUR support**: Converts EUR to USD using live ECB exchange rates via Frankfurter API

### Proposal Management
- **Multi-chain support**: Handles both Moonbeam (GLMR) and Moonriver (MOVR) in one transaction
- **Flexible split ratios**: Configure GLMR/MOVR allocation (default 50/50)
- **Proxy support**: Submit proposals via proxy account
- **Separate Moonriver address**: Option to specify a different recipient for MOVR payouts

### Council Workflow
- **One-click voting**: Pre-built vote extrinsics for council members to vote AYE
- **One-click closing**: Pre-built close extrinsics for executing approved proposals
- **One-click payout**: Pre-built payout extrinsics for claiming treasury funds
- **Council member dropdown**: Quick selection of council members (Simon, Yaron, Aaron, Michele, Sicco)

### Documentation & Reporting
- **Forum content auto-fetching**: Automatically fetches forum post content via Discourse API
- **Google Sheets integration**: Generates tab-separated rows with all required fields (Proposal ID, Motion ID, AssetType, Net Tokens, Total USD Requested, etc.)
- **Treasury repo documentation**: Generates preformatted .md files for Moonbeam Foundation treasury repository
- **README generation**: Automatically updates treasury README with new proposal entries
- **Forum-ready output**: Copy-paste formatted replies for the Moonbeam forum

### User Experience
- **Copy notifications**: Visual feedback ("Copied!") for all copy actions
- **Treasury balance display**: Real-time GLMR, MOVR, and USDC treasury balances
- **Form validation**: Green glow indicators for required fields
- **Project labeling**: Custom labels and categories for better organization

## Usage

### For Native Token Payouts (GLMR + MOVR)

1. Enter payout amount (USD or EUR) and recipient address
2. Adjust GLMR/MOVR split ratio if needed (default 50/50)
3. Optionally enable separate Moonriver address
4. Optionally enable proxy and enter proxy address
5. Click "Calculate Payout"
6. Follow the 7-step process:
   - Submit proposals on both networks
   - Vote AYE on both proposals
   - Wait for additional council votes
   - Close proposals
   - Claim payouts
   - Post forum reply
   - Generate documentation

### For USDC Payouts

1. Select "USDC" payout type
2. Enter payout amount (USD) and recipient address
3. Click "Calculate Payout"
4. Follow the streamlined Moonbeam-only workflow

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
npm run build
npm start
```

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Blockchain**: @polkadot/api for Substrate interactions
- **Deployment**: Vercel with automated CI/CD via GitHub Actions
- **Security**: Dependabot for automated security updates

## Architecture

- `/src/app/page.tsx` - Main UI component
- `/src/app/payoutor-core.ts` - Core calculation and blockchain logic
- `/src/app/api/calculate/` - Payout calculation API
- `/src/app/api/forum-content/` - Forum content fetching
- `/src/app/api/readme/` - README generation and updates
- `/src/app/api/treasury-balances/` - Treasury balance fetching
- `/src/app/api/fx-rate/` - EUR/USD exchange rate fetching

## Live Deployment

Production: [https://payoutor-web.vercel.app/](https://payoutor-web.vercel.app/)

## Security

- Automated security monitoring via Dependabot (monthly scans)
- Manual review required for all security updates
- Only production dependencies monitored
- CI/CD pipeline runs linting and tests on all PRs

## Roadmap / Ideas

- [ ] Batch payout processing
- [ ] Historical payout tracking
- [ ] Price alerts for treasury rebalancing
- [ ] Multi-sig support
- [ ] Automated forum post creation

## Contributing

This is a specialized tool for Moonbeam Treasury Council operations. For feature requests or bug reports, please open an issue on GitHub.

## Disclaimer

This tool is provided as-is without any warranties. Always double-check all calculations, proposal data, and on-chain interactions before submitting. The author assumes no liability for any loss of funds or errors in the payout process.

## License

MIT
