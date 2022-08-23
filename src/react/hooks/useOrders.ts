import { useContext, useEffect, useState } from 'react';

import {
  PostOrderResponsePayload,
  SearchOrdersParams,
} from '../../sdk/v4/orderbook';
import { SwapSdkContext } from '../providers/swapSdkProvider';

/**
 * Get orders from the Trader.xyz Open NFT Orderbook
 * @param searchParams optional conditions to search for specific orders
 * @returns an array of orders and a function to refresh it
 */
export function useOrders(searchParams?: Partial<SearchOrdersParams>) {
  const { signer, nftSwap } = useContext(SwapSdkContext);

  const [orders, setOrders] = useState<PostOrderResponsePayload[]>();

  const fetchOrders = async (): Promise<void> => {
    if (!signer) return;
    if (!nftSwap) return;

    try {
      const fetchedOrdersData = await nftSwap.getOrders(searchParams);
      const fetchedOrders = fetchedOrdersData.orders;
      setOrders(fetchedOrders);
    } catch (error: any) {
      console.error(`Unable to load orders:\n${error.message}`);
      setOrders(undefined);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [signer, nftSwap]);

  return [orders, fetchOrders] as [
    PostOrderResponsePayload[] | undefined,
    () => Promise<void>
  ];
}
