import { useContext } from 'react';

import { SwapSdkContext } from '../providers/swapSdkProvider';
import { Fee, SignedNftOrderV4, SwappableAssetV4 } from '../sdk';

/**
 * Get the order creation function
 */
export function useCreateOrder() {
  const { nftSwap } = useContext(SwapSdkContext);

  /**
   * Create an order and post it in the orderbook if successful
   * @param makerAsset an asset (ERC20, ERC721, or ERC1155) the user has
   * @param takerAsset an asset (ERC20, ERC721, or ERC1155) the user wants
   * @param makerAddress wallet address of user who creates the order
   * @param chainId id of the chain in which the transaction will be performed
   * @param metadata an optional record object that will be stored with the order in the orderbook
   * @param fees optional array that contents config for fee and royalties
   * @returns signed order
   */
  const createOrder = async (
    makerAsset: SwappableAssetV4,
    takerAsset: SwappableAssetV4,
    makerAddress: string | undefined,
    chainId: number | string,
    metadata?: Record<string, string>,
    fees?: Fee[]
  ): Promise<SignedNftOrderV4 | undefined> => {
    if (!nftSwap) return;
    if (!makerAddress) return;

    const approvalStatus = await nftSwap.loadApprovalStatus(
      makerAsset,
      makerAddress
    );
    if (!approvalStatus.contractApproved) {
      const approvalTx = await nftSwap.approveTokenOrNftByAsset(
        makerAsset,
        makerAddress
      );
      await approvalTx.wait();
    }

    let signedOrder: SignedNftOrderV4 | null = null;

    if (makerAsset.type === 'ERC20' && takerAsset.type === 'ERC721') {
      const ercToNftOrder = nftSwap.buildOrder(
        makerAsset,
        takerAsset,
        makerAddress,
        {
          fees,
        }
      );
      signedOrder = await nftSwap.signOrder(ercToNftOrder);
    }
    if (makerAsset.type === 'ERC721' && takerAsset.type === 'ERC20') {
      const nftToErcOrder = nftSwap.buildOrder(
        makerAsset,
        takerAsset,
        makerAddress,
        {
          fees,
        }
      );
      signedOrder = await nftSwap.signOrder(nftToErcOrder);
    }
    if (makerAsset.type === 'ERC20' && takerAsset.type === 'ERC1155') {
      const ercToMtOrder = nftSwap.buildOrder(
        makerAsset,
        takerAsset,
        makerAddress,
        {
          fees,
        }
      );
      signedOrder = await nftSwap.signOrder(ercToMtOrder);
    }
    if (makerAsset.type === 'ERC1155' && takerAsset.type === 'ERC20') {
      const mtToErcOrder = nftSwap.buildOrder(
        makerAsset,
        takerAsset,
        makerAddress,
        {
          fees,
        }
      );
      signedOrder = await nftSwap.signOrder(mtToErcOrder);
    }

    if (!signedOrder) return;

    await nftSwap.postOrder(signedOrder, chainId, metadata);
    return signedOrder;
  };

  return createOrder;
}
