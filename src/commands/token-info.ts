import type { Address } from "viem"
import { readConfig, ADDRESSES } from "../lib/config.js"
import { getPublicClient } from "../lib/client.js"
import { getTokenBalance } from "../lib/erc20.js"
import { output, log } from "../lib/output.js"
import { getFlagValue } from "../lib/args.js"
import {
  PORTAL_ADDRESS, PORTAL_ABI, USDT_ADDRESS,
  TOKEN_STATUS, type TokenStatusCode,
} from "../lib/flap.js"
import { formatUnits } from "viem"
import { privateKeyToAccount } from "viem/accounts"

// 获取账户地址（不需要 walletClient，读操作不签名）
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
  const account = resolveAccount(args, config.privateKey)

  if (config.network === "mainnet") {
    // Portal 状态查询不需要私钥
    const queries: [Promise<unknown>, Promise<bigint>?, Promise<bigint>?] = [
      publicClient.readContract({
        address: PORTAL_ADDRESS,
        abi: PORTAL_ABI,
        functionName: "getTokenV6",
        args: [fomoToken],
      }),
    ]
    if (account) {
      queries.push(
        getTokenBalance(publicClient, fomoToken, account),
        getTokenBalance(publicClient, USDT_ADDRESS, account),
      )
    }

    const results = await Promise.all(queries)
    const tokenState = results[0] as {
      status: number
      quoteToken: `0x${string}`
      currentPrice: bigint
      totalSupply: bigint
      reserveBalance: bigint
      progress: bigint
    }
    const fomoBalance = (results[1] as bigint | undefined) ?? 0n
    const usdtBalance = (results[2] as bigint | undefined) ?? 0n

    const statusCode = tokenState.status as TokenStatusCode
    const statusName = TOKEN_STATUS[statusCode] ?? "Unknown"
    const phase = statusCode === 1 ? "内盘 (Portal)" : statusCode === 2 ? "外盘 (PancakeSwap)" : statusName

    output({
      token: fomoToken,
      network: config.network,
      status: statusName,
      statusCode,
      phase,
      quoteToken: tokenState.quoteToken,
      currentPrice: tokenState.currentPrice.toString(),
      totalSupply: tokenState.totalSupply.toString(),
      reserveBalance: tokenState.reserveBalance.toString(),
      progress: tokenState.progress.toString(),
      fomoBalance: fomoBalance.toString(),
      usdtBalance: usdtBalance.toString(),
      account: account ?? "N/A",
    }, (d) => {
      log(`\nFOMO Token Info (${d.network})`)
      log(`Token: ${d.token}`)
      log(`Phase: ${d.phase}`)
      log(`Status: ${d.status} (${d.statusCode})`)
      log(`Quote Token: ${d.quoteToken}`)
      log(`Price: ${formatUnits(BigInt(d.currentPrice), 18)} USDT`)
      // progress 是 18 位精度，1e18 = 100%，用 16 位格式化得到百分比
      log(`Progress: ${formatUnits(BigInt(d.progress), 16)}%`)
      if (account) {
        log(`\nYour Balances:`)
        log(`FOMO: ${formatUnits(BigInt(d.fomoBalance), 18)}`)
        log(`USDT: ${formatUnits(BigInt(d.usdtBalance), 18)}`)
      }
      log("")
    })
  } else {
    // testnet 只显示余额
    const fomoBalance = account
      ? await getTokenBalance(publicClient, fomoToken, account)
      : 0n

    output({
      token: fomoToken,
      network: config.network,
      status: "N/A",
      phase: "testnet (no FLAP Portal)",
      fomoBalance: fomoBalance.toString(),
      account: account ?? "N/A",
    }, (d) => {
      log(`\nFOMO Token Info (${d.network})`)
      log(`Token: ${d.token}`)
      log(`Phase: ${d.phase}`)
      if (account) {
        log(`FOMO Balance: ${formatUnits(BigInt(d.fomoBalance), 18)}`)
      }
      log(`\nNote: Buy/sell only available on mainnet.`)
      log("")
    })
  }
}
