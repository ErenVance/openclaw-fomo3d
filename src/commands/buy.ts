import { readConfig, requirePrivateKey, ADDRESSES } from "../lib/config.js"
import { getPublicClient, getWalletClient } from "../lib/client.js"
import { ensureAllowance, getTokenBalance } from "../lib/erc20.js"
import { output, log, fatal } from "../lib/output.js"
import { getFlagValue } from "../lib/args.js"
import { FLAP_SKILL_ADDRESS, FLAP_SKILL_ABI, USDT_ADDRESS } from "../lib/flap.js"
import { requireMainnet, parseBigInt } from "../lib/utils.js"

export async function buy(args: string[]) {
  const amountStr = getFlagValue(args, "--amount")
  if (!amountStr) fatal("Missing --amount <usdt_wei>. Usage: fomo3d buy --amount 10000000000000000000")

  const usdtAmount = parseBigInt(amountStr, "amount")
  if (usdtAmount <= 0n) fatal("Amount must be positive")

  const config = readConfig()
  requireMainnet(config)

  const pk = requirePrivateKey(config)
  const publicClient = getPublicClient(config.network, config.rpcUrl)
  const walletClient = getWalletClient(pk, config.network, config.rpcUrl)
  const fomoToken = ADDRESSES[config.network].fomoToken

  // 检查 USDT 余额
  const usdtBalance = await getTokenBalance(publicClient, USDT_ADDRESS, walletClient.account!.address)
  if (usdtBalance < usdtAmount) {
    fatal(`Insufficient USDT balance: have ${usdtBalance}, need ${usdtAmount}`)
  }

  // 授权 USDT 给 FlapSkill
  await ensureAllowance(publicClient, walletClient, USDT_ADDRESS, FLAP_SKILL_ADDRESS, usdtAmount)

  // 买入
  log(`Buying FOMO with ${usdtAmount} USDT (wei)...`)
  const hash = await walletClient.writeContract({
    address: FLAP_SKILL_ADDRESS,
    abi: FLAP_SKILL_ABI,
    functionName: "buyTokens",
    args: [fomoToken, usdtAmount],
    chain: walletClient.chain,
  })

  log(`Transaction: ${hash}`)
  const receipt = await publicClient.waitForTransactionReceipt({ hash })

  output({
    txHash: hash,
    blockNumber: Number(receipt.blockNumber),
    status: receipt.status,
    usdtSpent: usdtAmount.toString(),
    token: fomoToken,
  }, (d) => {
    log(`\nBuy ${d.status === "success" ? "successful" : "failed"}!`)
    log(`USDT spent: ${d.usdtSpent}`)
    log(`Block: ${d.blockNumber}`)
    log("")
  })
}
