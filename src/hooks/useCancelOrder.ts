import { BigNumberish, ContractReceipt } from 'ethers'
import { useContext } from 'react'

import { SwapSdkContext } from '../providers/swapSdkProvider'

/**
 * Get a function to cancel an order by nonce and type
 */
export function useCancelOrder() {
  const { nftSwap } = useContext(SwapSdkContext)

  /**
   * Cancel an order by nonce and type
   * @param nonce nonce of the order to be cancel
   * @param orderType type of token from the order (ERC721 or ERC1155)
   * @returns a transaction receipt if successful
   */
  const cancelOrder = async (
    nonce: BigNumberish,
    orderType: 'ERC721' | 'ERC1155'
  ): Promise<ContractReceipt | undefined> => {
    if (!nftSwap) return

    try {
      const cancelTx = await nftSwap.cancelOrder(nonce, orderType)
      const cancelTxReceipt = await cancelTx.wait()
      return cancelTxReceipt
    } catch (error) {
      console.error(error)
      return undefined
    }
  }

  return cancelOrder
}
