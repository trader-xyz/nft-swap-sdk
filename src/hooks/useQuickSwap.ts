import { ContractReceipt } from 'ethers';
import { useContext } from 'react';

import { SwapSdkContext } from '../providers/swapSdkProvider';
import { Fee, SignedNftOrderV4Serialized, SwappableAssetV4 } from '../sdk';
import { useCancelOrder } from './useCancelOrder';
import { useCreateOrder } from './useCreateOrder';

/**
 * Get the function to create an order and instantly execute transaction with the matching order of opposite direction
 */
export function useQuickSwap() {
  const { nftSwap } = useContext(SwapSdkContext);

  const createOrder = useCreateOrder();
  const cancelOrder = useCancelOrder();

  /**
   * Create a new order, look up an existing matching order, and execute the transaction (do not work with native currency e.g. ETH)
   * @param makerAsset an asset (ERC20, ERC721, or ERC1155) the user has
   * @param takerAsset an asset (ERC20, ERC721, or ERC1155) the user wants
   * @param makerAddress wallet address of user who creates the order
   * @param chainId id of the chain in which the transaction will be performed
   * @param metadata an optional record object that will be stored with the order in the orderbook
   * @param fees optional array that contents config for fee and royalties
   * @returns a swap transaction receipt if successful and cancel transaction receipt if there are no matching orders
   */
  const quickSwap = async (
    makerAsset: SwappableAssetV4,
    takerAsset: SwappableAssetV4,
    makerAddress: string | undefined,
    chainId: number | string,
    metadata?: Record<string, string>,
    fees?: Fee[]
  ): Promise<ContractReceipt | undefined> => {
    if (!nftSwap) return;

    const newOrder = await createOrder(
      makerAsset,
      takerAsset,
      makerAddress,
      chainId,
      metadata,
      fees
    );
    if (!newOrder) return;

    try {
      let matchingOrder: SignedNftOrderV4Serialized | null = null;

      if (makerAsset.type !== 'ERC20') {
        const ordersData = await nftSwap.getOrders({
          nftToken: makerAsset.tokenAddress,
          nftTokenId: makerAsset.tokenId,
          nftType: makerAsset.type,
        });

        const orderToBuy = ordersData.orders.find(
          (order) => order.sellOrBuyNft === 'buy'
        );
        if (!orderToBuy) {
          const cancelTxReceipt = await cancelOrder(
            newOrder.nonce,
            makerAsset.type
          );
          return cancelTxReceipt;
        }

        matchingOrder = orderToBuy.order;
        const matchTx = await nftSwap.matchOrders(newOrder, matchingOrder);
        const matchTxReceipt = await matchTx.wait();
        return matchTxReceipt;
      }

      if (makerAsset.type === 'ERC20' && takerAsset.type !== 'ERC20') {
        const ordersData = await nftSwap.getOrders({
          nftToken: takerAsset.tokenAddress,
          nftTokenId: takerAsset.tokenId,
          nftType: takerAsset.type,
        });

        const orderToBuy = ordersData.orders.find(
          (order) => order.sellOrBuyNft === 'sell'
        );
        if (!orderToBuy) {
          const cancelTxReceipt = await cancelOrder(
            newOrder.nonce,
            takerAsset.type
          );
          return cancelTxReceipt;
        }

        matchingOrder = orderToBuy.order;
        const matchTx = await nftSwap.matchOrders(matchingOrder, newOrder);
        const matchTxReceipt = await matchTx.wait();
        return matchTxReceipt;
      }

      return undefined;
    } catch (error) {
      console.error(error);
      return undefined;
    }
  };

  return quickSwap;
}
