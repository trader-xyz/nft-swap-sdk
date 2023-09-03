import { useContext } from 'react';

import {
  SignedNftOrderV4,
  UserFacingERC20AssetDataSerializedV4,
} from '../../sdk';
import { SwapSdkContext } from '../providers/swapSdkProvider';

export interface NftCollection {
  tokenAddress: string;
  type: 'ERC721' | 'ERC1155';
}

/**
 * Get the function to create order from a specific collection
 */
export function useCreateBasedOrder() {
  const { nftSwap } = useContext(SwapSdkContext);

  /**
   * Create an order with any NFT from specific collection maker has and post it in the orderbook if successful
   * @param erc20Asset an object that contains the type "ERC20", the amount to sell and the address of the token
   * @param nftCollectionAsset an object that contains the type of NFT to sell (ERC721 or ERC1155) and NFT collection address
   * @param makerAddress wallet address of order creator
   * @param chainId id of the chain in which the transaction will be performed
   * @param metadata an optional record object that will be stored with the order in the orderbook
   * @returns signed order
   */
  const createBasedOrder = async (
    erc20Asset: UserFacingERC20AssetDataSerializedV4,
    nftCollectionAsset: NftCollection,
    makerAddress: string | undefined,
    chainId: number | string,
    metadata?: Record<string, string>
  ): Promise<SignedNftOrderV4 | undefined> => {
    if (!nftSwap) return;
    if (!makerAddress) return;

    try {
      const collectionBasedOrder = nftSwap.buildCollectionBasedOrder(
        erc20Asset,
        nftCollectionAsset,
        makerAddress
      );

      const signedOrder = await nftSwap.signOrder(collectionBasedOrder);
      await nftSwap.postOrder(signedOrder, chainId, metadata);
      return signedOrder;
    } catch (error) {
      console.error(error);
      return undefined;
    }
  };

  return createBasedOrder;
}
