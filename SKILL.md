---
name: fomo3d
description: Play Fomo3D and Slot Machine on BNB Chain (BSC). Fomo3D is a blockchain game where players buy shares using tokens — the last buyer before the countdown ends wins the grand prize. Includes a Slot Machine mini-game with VRF-powered random spins. This skill provides a CLI to check game status, purchase shares, claim dividends, spin the slot machine, and more. Use this skill whenever the user wants to interact with Fomo3D, buy/sell FOMO tokens, check game status, spin the slot machine, trade on FLAP Portal or PancakeSwap, or manage their BNB Chain gaming wallet.
version: 1.2.0
metadata:
  openclaw:
    emoji: "🎰"
    homepage: "https://fomo3d.app"
    primaryEnv: FOMO3D_PRIVATE_KEY
    requires:
      env:
        - FOMO3D_PRIVATE_KEY
      bins:
        - node
---

# Fomo3D — BNB Chain Blockchain Game

Fomo3D is a decentralized game on BNB Chain (BSC) with two game modes:

1. **Fomo3D Main Game** — Buy shares with tokens. Each purchase resets a countdown timer. The last buyer when the timer hits zero wins the grand prize pool. All shareholders earn dividends from each purchase.

2. **Slot Machine** — Bet tokens for a VRF-powered random spin. Matching symbols win multiplied payouts (up to 100x). Depositors earn dividend shares from every spin.

## Installation and Config (required)

Ensure dependencies are installed at repo root (`npm install`).

A private key is required. If the user has not configured the skill yet, **run `fomo3d setup`** from the repo root. This runs an interactive CLI that prompts for:
- BSC private key (for signing transactions)
- Network (testnet or mainnet)
- Optional custom RPC URL

Alternatively, set environment variables (no `setup` needed):
- `FOMO3D_PRIVATE_KEY` — BSC wallet private key (hex, with or without 0x prefix)
- `FOMO3D_NETWORK` — `testnet` or `mainnet` (default: testnet)
- `FOMO3D_RPC_URL` — custom RPC endpoint (optional)
- `FOMO3D_FLAP_TOKEN` — override FLAP token address for buy/sell commands (optional, for testing)

**Important:** The wallet must be an EOA (externally owned account), not a smart contract wallet. The game contracts require `msg.sender == tx.origin`.

## How to run (CLI)

Run from the **repo root** (where `package.json` lives). For machine-readable output, always append `--json`. The CLI prints JSON to stdout in `--json` mode.

```bash
fomo3d <command> [options] --json
```

On error the CLI prints `{"success":false,"error":"message"}` to stdout and exits with code 1. On success the CLI prints `{"success":true,"data":{...}}`.

## Important Concepts

### Token Amounts

All token amounts in CLI arguments and JSON output are in **wei** (18 decimals). For example:
- 1 token = `1000000000000000000` (1e18)
- 0.5 tokens = `500000000000000000` (5e17)

When displaying amounts to users, divide by 1e18 for human-readable values.

### Share Amounts

Share amounts for `purchase --shares` are **integers** (not wei). 1 share = 1 share.

### Auto-Approve

The CLI automatically checks ERC20 token allowance and approves if needed before `purchase`, `buy`, `sell`, `slot spin`, and `slot deposit`. No manual approval step required.

### FOMO Token Trading

The FOMO token is launched on the FLAP platform (BNB Chain bonding curve). Trading uses **BNB** as the quote token:
- **内盘 (Portal)**: Directly calls FLAP Portal's `swapExactInput` with native BNB
- **外盘 (PancakeSwap V2)**: After the token graduates to DEX, uses PancakeSwap V2 Router

The CLI auto-detects the current phase via `getTokenV6` and routes accordingly. Buy/sell commands work on both **testnet** and **mainnet**.

### VRF (Verifiable Random Function)

Slot machine spins use Binance Oracle VRF for provably fair randomness. Each `spin` requires a small BNB fee (~0.00015 BNB) sent as `msg.value`. The spin result is determined by a VRF callback (1-3 blocks later) — the CLI returns the spin request transaction, not the result. Check the result with `fomo3d slot status` or `fomo3d player` afterward.

## Commands Reference

### Setup

```bash
fomo3d setup --json
```
Interactive configuration. Prompts for private key, network, and optional RPC URL. Saves to `config.json`.

### Wallet — Check Balances

```bash
fomo3d wallet --json
```
Returns BNB balance and game token balance for the configured wallet.

**Output fields:** `address`, `bnbBalance` (wei), `tokenBalance` (wei), `tokenSymbol`, `tokenDecimals`

### Status — Game Round Info

```bash
fomo3d status --json
```
Returns current round status including countdown, prize pools, share price, and last buyers.

**Output fields:** `currentRound`, `roundStatus` (NotStarted/Active/Ended), `paused`, `countdownRemaining` (seconds), `grandPrizePool` (wei), `dividendPool` (wei), `sharePrice` (wei), `totalShares`, `lastBuyers` (address[]), `pools`

**Strategy tip:** When `countdownRemaining` is low, buying shares has higher expected value because you may win the grand prize. Each purchase resets the countdown by a fixed increment.

### Player — Player Info

```bash
fomo3d player --json
fomo3d player --address 0x1234... --json
```
Returns player's shares, earnings, and pending withdrawals. Without `--address`, uses the configured wallet.

**Output fields:** `address`, `shares`, `totalEarnings` (wei), `pendingEarnings` (wei), `pendingWithdrawal` (wei), `hasExited`, `currentRound`

**Decision guide:**
- If `pendingWithdrawal > 0`: Must run `fomo3d settle` before purchasing more shares
- If `pendingEarnings > 0` and round is active: Can `exit` to lock in earnings, or hold for more dividends
- If `hasExited == true`: Already exited this round, wait for round to end or settle

### Purchase — Buy Shares

```bash
fomo3d purchase --shares <integer> --json
```
Buy shares in the current round. The `--shares` value is an integer count (not wei). Token cost = shares × sharePrice (auto-calculated).

**Pre-checks performed automatically:**
- Game must not be paused
- No pending withdrawal (must `settle` first)
- Token approval (auto-approved if needed)

**Output fields:** `txHash`, `blockNumber`, `status`, `sharesAmount`, `tokensCost` (wei)

### Exit — Exit Game

```bash
fomo3d exit --json
```
Exit the current round and lock in your dividend earnings.

**Output fields:** `txHash`, `blockNumber`, `status`

### Settle — Claim Dividends & Prize

```bash
fomo3d settle --json
```
Settle dividends and claim any grand prize after a round ends. Must be called if `pendingEarnings > 0` or `pendingWithdrawal > 0`.

**Output fields:** `txHash`, `blockNumber`, `status`, `pendingEarnings` (wei), `pendingWithdrawal` (wei)

### End Round — End Expired Round

```bash
fomo3d end-round --json
```
End a round whose countdown has reached zero. Anyone can call this. The grand prize is distributed to the last buyer.

**Output fields:** `txHash`, `blockNumber`, `status`

### Faucet — Claim Test Tokens (testnet only)

```bash
fomo3d faucet --json
```
Claim 10000 test FOMO game tokens on BSC Testnet. Rate limited to 1 claim per address per hour.

**Output fields:** `txHash`, `amount`, `token`, `account`

### Buy — Buy FOMO with BNB

```bash
fomo3d buy --amount <bnb_amount_in_wei> --json
```
Buy FOMO tokens using BNB via the FLAP platform. Auto-detects market phase: Portal (内盘) or PancakeSwap V2 (外盘).

**Example:** Buy with 0.01 BNB:
```bash
fomo3d buy --amount 10000000000000000 --json
```

**Output fields:** `txHash`, `blockNumber`, `status`, `bnbSpent` (wei), `token`, `market`

**Note:** Buy and sell commands use `minOutputAmount=0` (no slippage protection). For large trades, consider splitting into smaller amounts.

### Sell — Sell FOMO for BNB

```bash
# 按数量卖出
fomo3d sell --amount <token_amount_in_wei> --json

# 按持仓比例卖出
fomo3d sell --percent <bps> --json
```
Sell FOMO tokens for BNB. Two modes:
- `--amount`: Sell exact token amount (in wei, 18 decimals)
- `--percent`: Sell by percentage of holdings in basis points (10000=100%, 5000=50%, 1000=10%)

Cannot use both flags simultaneously. Token allowance is auto-approved for Portal/PancakeSwap.

**Example:** Sell 50% of holdings:
```bash
fomo3d sell --percent 5000 --json
```

**Output fields:** `txHash`, `blockNumber`, `status`, `tokensSold` (wei), `market`, `method`

### Token Info — Token Status & Balances

```bash
fomo3d token-info --json
fomo3d token-info --address 0x1234... --json
```
Query FOMO token status on the FLAP platform and balances. Works without private key (shows token status only). Supports `--address` flag to check another wallet.

**Output fields:** `token`, `network`, `portal`, `status` (Invalid/Tradable/InDuel/Killed/DEX/Staged), `phase` (内盘/外盘), `quoteToken`, `price` (wei), `reserve` (wei), `circulatingSupply` (wei), `taxRate`, `progress` (wei), `fomoBalance` (wei), `bnbBalance` (wei), `account`

**Decision guide:**
- `status == Tradable`: Token is on 内盘 (bonding curve), buy/sell via Portal
- `status == DEX`: Token has graduated to 外盘 (PancakeSwap), buy/sell via DEX
- `progress`: How close to graduation (higher = closer to DEX)

### Slot Status — Slot Machine Info

```bash
fomo3d slot status --json
```
Returns slot machine configuration, prize pool, and statistics.

**Output fields:** `paused`, `token`, `minBet` (wei), `maxBet` (wei), `prizePool` (wei), `totalShares`, `vrfFee` (wei), `stats` { `totalSpins`, `totalBetAmount`, `totalWinAmount`, `totalDividendsDistributed` }

**Note:** `maxBet = prizePool / 100` (dynamic). If prize pool is low, max bet is low.

### Slot Spin — Spin the Slot Machine

```bash
fomo3d slot spin --bet <amount_in_wei> --json
```
Spin the slot machine. Requires token balance for the bet AND BNB for VRF fee (~0.00015 BNB).

**Constraints:**
- `minBet <= bet <= maxBet`
- Wallet must have enough BNB for VRF fee
- Cannot spin while a previous spin is pending

**Payout table:**
| Symbols | Multiplier |
|---------|-----------|
| 💎💎💎 | 100x |
| 🍒🍒🍒 | 50x |
| 🔔🔔🔔 | 50x |
| 🍋🍋🍋 | 20x |

**Output fields:** `txHash`, `blockNumber`, `status`, `betAmount` (wei), `vrfFee` (wei), `note`

**Important:** The spin result is NOT in this response. The VRF callback determines the outcome 1-3 blocks later. Check `fomo3d player --json` or `fomo3d slot status --json` afterward.

### Slot Cancel — Cancel Timed-Out Spin

```bash
fomo3d slot cancel --json
```
Cancel a spin that timed out waiting for VRF callback. Only needed if VRF fails to respond.

**Output fields:** `txHash`, `blockNumber`, `status`

### Slot Deposit — Deposit to Prize Pool

```bash
fomo3d slot deposit --amount <amount_in_wei> --json
```
Deposit tokens into the slot machine prize pool. **WARNING: Deposited tokens are permanently locked.** You receive dividend shares in return — each spin distributes 5% of the bet amount to all depositors proportionally.

**Output fields:** `txHash`, `blockNumber`, `status`, `amount` (wei)

### Slot Claim — Claim Slot Dividends

```bash
fomo3d slot claim --json
```
Claim accumulated dividends from slot machine deposits.

**Output fields:** `txHash`, `blockNumber`, `status`, `dividends` (wei)

## Recommended Workflows

### First-Time Setup

1. `fomo3d setup` — configure wallet and network
2. `fomo3d wallet --json` — verify BNB and token balances
3. `fomo3d status --json` — check game state

### Testing on Testnet

Before using real funds on mainnet, test all features on BSC Testnet. You need:
- **tBNB**: Get from [BNB Chain Faucet](https://www.bnbchain.org/en/testnet-faucet) (for gas + token trading)
- **Test FOMO tokens**: Use the built-in faucet command (for game actions)

```bash
# 1. Setup with testnet
fomo3d setup    # select "testnet", enter your private key

# 2. Claim test game tokens (10000 FOMO per call, 1h cooldown)
fomo3d faucet --json

# 3. Check balances
fomo3d wallet --json

# 4. Test game: purchase → player → exit → settle
fomo3d purchase --shares 1 --json
fomo3d player --json
fomo3d exit --json

# 5. Test slot machine
fomo3d slot status --json
fomo3d slot spin --bet 1000000000000000000 --json  # 1 FOMO
```

**Note:** Testnet has two separate FOMO tokens:
- **Game token** (`0x57e3...5d46`): Used by `purchase`, `slot spin`, `slot deposit`. Get via `faucet`.
- **FLAP token** (`0x32bf...8888`): Used by `buy`/`sell` on FLAP Portal. Buy with tBNB.

### Testing Token Trading — 内盘 (Portal)

The default FOMO token on testnet (`0x32bf...8888`) is in 内盘 (Portal bonding curve) phase. Test buy/sell with tBNB:

```bash
# Check token status — should show "phase": "内盘 (Portal)"
fomo3d token-info --json

# Buy with 0.001 tBNB
fomo3d buy --amount 1000000000000000 --json

# Sell 50% of holdings
fomo3d sell --percent 5000 --json
```

### Testing Token Trading — 外盘 (PancakeSwap)

To test the PancakeSwap DEX path, use `FOMO3D_FLAP_TOKEN` env var to override the token address with a PancakeSwap-listed testnet token:

```bash
# Use a testnet token with PancakeSwap V2 liquidity
export FOMO3D_FLAP_TOKEN=0xFa60D973F7642B748046464e165A65B7323b0DEE

# Check token info (should fallback to PancakeSwap)
fomo3d token-info --json

# Buy with 0.001 tBNB via PancakeSwap
fomo3d buy --amount 1000000000000000 --json

# Sell 100% via PancakeSwap
fomo3d sell --percent 10000 --json

# Unset to return to default FOMO token
unset FOMO3D_FLAP_TOKEN
```

**How it works:** The CLI auto-detects the market phase via FLAP Portal `getTokenV6`. If the token is not on FLAP (query fails) or has status `DEX` (4), it routes to PancakeSwap V2 Router. If status is `Tradable` (1), it routes to Portal.

### Buying FOMO Tokens

1. `fomo3d token-info --json` — check token status and your BNB balance
2. `fomo3d buy --amount 10000000000000000 --json` — buy with 0.01 BNB
3. `fomo3d token-info --json` — verify FOMO balance

### Selling FOMO Tokens

1. `fomo3d token-info --json` — check FOMO balance
2. `fomo3d sell --percent 5000 --json` — sell 50% of holdings
3. Or: `fomo3d sell --amount 1000000000000000000 --json` — sell exactly 1 FOMO

### Playing Fomo3D

1. `fomo3d status --json` — check round status and countdown
2. `fomo3d purchase --shares 1 --json` — buy shares (start small)
3. `fomo3d player --json` — check your earnings
4. When ready to claim: `fomo3d exit --json` then `fomo3d settle --json`
5. If countdown reaches 0 and you're the last buyer: `fomo3d end-round --json` then `fomo3d settle --json`

### Playing Slot Machine

1. `fomo3d slot status --json` — check min/max bet and prize pool
2. `fomo3d slot spin --bet <amount> --json` — spin
3. Wait 5-10 seconds for VRF callback
4. `fomo3d player --json` — check if you won

### Earning Passive Income (Slot Dividends)

1. `fomo3d slot deposit --amount <amount> --json` — deposit tokens (permanent)
2. Periodically check: `fomo3d slot claim --json` — claim dividends

## Global Flags

| Flag | Description |
|------|-------------|
| `--json` | JSON output (always use for programmatic access) |
| `--network testnet\|mainnet` | Override network |
| `--help` | Show help |
| `--version` | Show version |

## Network Info

| Network | Chain ID | Fomo3D Diamond | Slot Diamond | Game Token | FLAP Token (buy/sell) |
|---------|----------|----------------|--------------|------------|----------------------|
| BSC Testnet | 97 | `0x22E309...23a6` | `0x007813...F678` | `0x57e3a4...5d46` | `0x32bfe5...8888` |
| BSC Mainnet | 56 | `0x062AfaB...948b` | `0x6eB59f...156E` | `0x13f266...7777` | `0x13f266...7777` |

## Trading Contracts

| Contract | Testnet | Mainnet | Purpose |
|----------|---------|---------|---------|
| FLAP Portal | `0x5bEacaF7ABCbB3aB280e80D007FD31fcE26510e9` | `0xe2cE6ab80874Fa9Fa2aAE65D277Dd6B8e65C9De0` | 内盘交易 + 状态查询 |
| PancakeSwap V2 Router | `0xD99D1c33F9fC3444f8101754aBC46c52416550D1` | `0x10ED43C718714eb63d5aA57B78B54704E256024E` | 外盘交易 |
| Quote Token | BNB (native) | BNB (native) | 支付媒介 |
