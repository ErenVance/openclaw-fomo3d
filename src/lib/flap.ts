import type { Address } from "viem"

// FLAP Portal 地址（按网络）
export const PORTAL_ADDRESSES = {
  testnet: "0x5bEacaF7ABCbB3aB280e80D007FD31fcE26510e9" as Address,
  mainnet: "0xe2cE6ab80874Fa9Fa2aAE65D277Dd6B8e65C9De0" as Address,
} as const

// WBNB (BSC mainnet / testnet 相同)
export const WBNB_ADDRESS = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c" as Address

// PancakeSwap V2 Router（外盘交易，税收代币走 V2）
export const PANCAKE_ROUTER = "0x10ED43C718714eb63d5aA57B78B54704E256024E" as Address

// address(0) 代表原生 BNB
export const NATIVE_BNB = "0x0000000000000000000000000000000000000000" as Address

// Portal ABI — swapExactInput（内盘买卖）+ getTokenV6（状态查询）
export const PORTAL_ABI = [
  // 内盘交易：买入用 inputToken=address(0) + msg.value，卖出用 inputToken=token
  {
    inputs: [
      {
        components: [
          { internalType: "address", name: "inputToken", type: "address" },
          { internalType: "address", name: "outputToken", type: "address" },
          { internalType: "uint256", name: "inputAmount", type: "uint256" },
          { internalType: "uint256", name: "minOutputAmount", type: "uint256" },
          { internalType: "bytes", name: "permitData", type: "bytes" },
        ],
        internalType: "struct ExactInputParams",
        name: "params",
        type: "tuple",
      },
    ],
    name: "swapExactInput",
    outputs: [{ internalType: "uint256", name: "outputAmount", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
  // 代币状态查询（完整 15 字段 struct）
  {
    inputs: [{ internalType: "address", name: "_token", type: "address" }],
    name: "getTokenV6",
    outputs: [
      {
        components: [
          { internalType: "uint8", name: "status", type: "uint8" },
          { internalType: "uint256", name: "reserve", type: "uint256" },
          { internalType: "uint256", name: "circulatingSupply", type: "uint256" },
          { internalType: "uint256", name: "price", type: "uint256" },
          { internalType: "uint8", name: "tokenVersion", type: "uint8" },
          { internalType: "uint256", name: "r", type: "uint256" },
          { internalType: "uint256", name: "h", type: "uint256" },
          { internalType: "uint256", name: "k", type: "uint256" },
          { internalType: "uint256", name: "dexSupplyThresh", type: "uint256" },
          { internalType: "address", name: "quoteTokenAddress", type: "address" },
          { internalType: "bool", name: "nativeToQuoteSwapEnabled", type: "bool" },
          { internalType: "bytes32", name: "extensionID", type: "bytes32" },
          { internalType: "uint256", name: "taxRate", type: "uint256" },
          { internalType: "address", name: "pool", type: "address" },
          { internalType: "uint256", name: "progress", type: "uint256" },
        ],
        internalType: "struct TokenStateV6",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const

// PancakeSwap V2 Router ABI — 外盘 ETH 交易（税收代币用 SupportingFeeOnTransfer 系列）
export const PANCAKE_ROUTER_ABI = [
  {
    inputs: [
      { internalType: "uint256", name: "amountOutMin", type: "uint256" },
      { internalType: "address[]", name: "path", type: "address[]" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "swapExactETHForTokensSupportingFeeOnTransferTokens",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountIn", type: "uint256" },
      { internalType: "uint256", name: "amountOutMin", type: "uint256" },
      { internalType: "address[]", name: "path", type: "address[]" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "swapExactTokensForETHSupportingFeeOnTransferTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const

// 代币状态枚举
// 0=Invalid, 1=Tradable(内盘), 2=InDuel, 3=Killed, 4=DEX(外盘), 5=Staged
export const TOKEN_STATUS = {
  0: "Invalid",
  1: "Tradable",   // 内盘（Portal bonding curve）
  2: "InDuel",
  3: "Killed",
  4: "DEX",        // 外盘（已毕业到 PancakeSwap）
  5: "Staged",
} as const

export type TokenStatusCode = keyof typeof TOKEN_STATUS
