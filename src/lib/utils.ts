import type { Config } from "./config.js"
import { fatal } from "./output.js"

// mainnet 限制检查（buy/sell 仅 mainnet 可用）
export function requireMainnet(config: Config): void {
  if (config.network !== "mainnet") {
    fatal("This command is only available on mainnet. On testnet, use 'fomo3d purchase' with faucet tokens.")
  }
}

// 安全解析 BigInt，给出友好的错误提示
export function parseBigInt(value: string, fieldName: string): bigint {
  try {
    return BigInt(value)
  } catch {
    fatal(`Invalid ${fieldName}: "${value}". Must be a positive integer.`)
  }
}
