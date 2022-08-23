import { ContractReceipt } from 'ethers';

import { useContext } from 'react';

import {
  ApprovalOverrides,
  FillOrderOverrides,
  SwappableAssetV4,
} from '../../sdk';
import { PayableOverrides, TransactionOverrides } from '../../sdk/common/types';
import { PostOrderResponsePayload } from '../../sdk/v4/orderbook';
import { SwapSdkContext } from '../providers/swapSdkProvider';

/**
 * Get the order fulfillment function
 */
export function useFulfillOrder() {
  const { nftSwap } = useContext(SwapSdkContext);

  /**
   * Fulfills signed order
   * @param order order to fulfill
   * @param takerAddress buyer wallet address
   * @param approvalOverrides optional config for approval status load
   * @param approvalTransactionOverrides optional config for transaction approve
   * @param fillOrderOverrides optional config for order fulfillment
   * @param transactionOverrides optional config for swap transaction
   * @returns a transaction receipt if successful
   */
  const fulfillOrder = async (
    order: PostOrderResponsePayload | undefined,
    takerAddress: string | undefined,
    approvalOverrides?: Partial<ApprovalOverrides>,
    approvalTransactionOverrides?: Partial<TransactionOverrides>,
    fillOrderOverrides?: Partial<FillOrderOverrides>,
    transactionOverrides?: Partial<PayableOverrides>
  ): Promise<ContractReceipt | undefined> => {
    if (!nftSwap) return;
    if (!order) return;
    if (!takerAddress) return;

    let takerAsset: SwappableAssetV4 | null = null;

    switch (order.nftType) {
      case 'ERC20':
        takerAsset = {
          tokenAddress: order.erc20Token,
          amount: order.erc20TokenAmount,
          type: 'ERC20',
        };
        break;
      case 'ERC721':
        takerAsset = {
          tokenAddress: order.nftToken,
          tokenId: order.nftTokenId,
          type: 'ERC721',
        };
        break;
      case 'ERC1155':
        takerAsset = {
          tokenAddress: order.nftToken,
          tokenId: order.nftTokenId,
          amount: order.erc20TokenAmount,
          type: 'ERC1155',
        };
        break;
      default:
        takerAsset = null;
        break;
    }

    if (!takerAsset) return;

    const approvalStatus = await nftSwap.loadApprovalStatus(
      takerAsset,
      takerAddress,
      approvalOverrides
    );
    if (!approvalStatus.contractApproved) {
      const approvalTx = await nftSwap.approveTokenOrNftByAsset(
        takerAsset,
        takerAddress,
        approvalTransactionOverrides
      );
      await approvalTx.wait();
    }

    const fillTx = await nftSwap.fillSignedOrder(
      order.order,
      fillOrderOverrides,
      transactionOverrides
    );
    const fillTxReceipt = await fillTx.wait();

    return fillTxReceipt;
  };

  return fulfillOrder;
}
