import type { Address } from "viem"
import { readConfig, ADDRESSES } from "../lib/config.js"
import { getPublicClient } from "../lib/client.js"
import { getTokenBalance } from "../lib/erc20.js"
import { output, log } from "../lib/output.js"
import { getFlagValue } from "../lib/args.js"
import {
  PORTAL_ADDRESSES, PORTAL_ABI,
  TOKEN_STATUS, type TokenStatusCode,
} from "../lib/flap.js"
import { formatUnits } from "viem"
import { privateKeyToAccount } from "viem/accounts"

// 获取账户地址（读操作不需要 walletClient）
function resolveAccount(args: string[], privateKey: string): Address | undefined {
  const addressFlag = getFlagValue(args, "--address")
  if (addressFlag) return addressFlag as Address
  if (!privateKey) return undefined
  const key = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`
  return privateKeyToAccount(key as `0x${string}`).address
}

export async function tokenInfo(args: string[]) {
  const config = readConfig()
  const publicClient = getPublicClient(config.network, config.rpcUrl)
  const fomoToken = ADDRESSES[config.network].fomoToken
  const portal = PORTAL_ADDRESSES[config.network]
  const account = resolveAccount(args, config.privateKey)

  // Portal 状态查询（testnet + mainnet 都支持）
  type TokenStateResult = {
    status: number
    reserve: bigint
    circulatingSupply: bigint
    price: bigint
    tokenVersion: number
    r: bigint
    h: bigint
    k: bigint
    dexSupplyThresh: bigint
    quoteTokenAddress: `0x${string}`
    nativeToQuoteSwapEnabled: boolean
    extensionID: `0x${string}`
    taxRate: bigint
    pool: `0x${string}`
    progress: bigint
  }

  const queries: Promise<unknown>[] = [
    publicClient.readContract({
      address: portal,
      abi: PORTAL_ABI,
      functionName: "getTokenV6",
      args: [fomoToken],
    }),
  ]
  if (account) {
    queries.push(
      getTokenBalance(publicClient, fomoToken, account),
      publicClient.getBalance({ address: account }),
    )
  }

  const results = await Promise.all(queries)
  const tokenState = results[0] as TokenStateResult
  const fomoBalance = (results[1] as bigint | undefined) ?? 0n
  const bnbBalance = (results[2] as bigint | undefined) ?? 0n

  const statusCode = Number(tokenState.status) as TokenStatusCode
  const statusName = TOKEN_STATUS[statusCode] ?? "Unknown"
  const phase = statusCode === 1 ? "内盘 (Portal)" : statusCode === 4 ? "外盘 (PancakeSwap)" : statusName
  const quoteToken = tokenState.quoteTokenAddress === "0x0000000000000000000000000000000000000000" ? "BNB (native)" : tokenState.quoteTokenAddress

  output({
    token: fomoToken,
    network: config.network,
    portal,
    status: statusName,
    statusCode,
    phase,
    quoteToken,
    price: tokenState.price.toString(),
    reserve: tokenState.reserve.toString(),
    circulatingSupply: tokenState.circulatingSupply.toString(),
    taxRate: Number(tokenState.taxRate),
    // progress 是 18 位精度，1e18 = 100%
    progress: tokenState.progress.toString(),
    fomoBalance: fomoBalance.toString(),
    bnbBalance: bnbBalance.toString(),
    account: account ?? "N/A",
  }, (d) => {
    log(`\nFOMO Token Info (${d.network})`)
    log(`Token: ${d.token}`)
    log(`Portal: ${d.portal}`)
    log(`Phase: ${d.phase}`)
    log(`Status: ${d.status} (${d.statusCode})`)
    log(`Quote Token: ${d.quoteToken}`)
    log(`Price: ${formatUnits(BigInt(d.price), 18)} BNB`)
    log(`Tax Rate: ${d.taxRate / 10}%`)
    log(`Progress: ${formatUnits(BigInt(d.progress), 16)}%`)
    if (account) {
      log(`\nYour Balances:`)
      log(`FOMO: ${formatUnits(BigInt(d.fomoBalance), 18)}`)
      log(`BNB: ${formatUnits(BigInt(d.bnbBalance), 18)}`)
    }
    log("")
  })
}
