import unfetch from 'isomorphic-unfetch';
import type { SignedNftOrderV4, SignedNftOrderV4Serialized } from './types';
import { stringify } from '../../utils/query-string';
import { serializeNftOrder } from './pure';

export const ORDERBOOK_API_ROOT_URL_PRODUCTION = 'https://api.trader.xyz';

interface OrderbookRequestOptions {
  rootUrl: string;
}

interface PostOrderRequestPayload {
  order: SignedNftOrderV4Serialized;
  chainId: string;
  metadata?: Record<string, string>;
}

export interface OrderDataPayload {
  erc20Token: string;
  erc20TokenAmount: string;
  nftToken: string;
  nftTokenId: string;
  nftTokenAmount: string;
  nftType: string;
  sellOrBuyNft: 'buy' | 'sell';
  chainId: string;
  order: SignedNftOrderV4Serialized;
  metadata: Record<string, string> | null;
}

type PostOrderResponsePayload = OrderDataPayload;

interface SearchOrdersResponsePayload {
  orders: Array<OrderDataPayload>;
}

const postOrderToOrderbook = async (
  signedOrder: SignedNftOrderV4,
  chainId: string,
  metadata: Record<string, string> = {},
  requestOptions?: Partial<OrderbookRequestOptions>,
  fetchFn: typeof unfetch = unfetch
): Promise<PostOrderResponsePayload> => {
  const payload: PostOrderRequestPayload = {
    order: serializeNftOrder(signedOrder),
    chainId,
    metadata,
  };

  let rootUrl = requestOptions?.rootUrl ?? ORDERBOOK_API_ROOT_URL_PRODUCTION;

  const orderPostResult: PostOrderResponsePayload = await fetchFn(
    `${rootUrl}/orderbook/order`,
    {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  )
    .then(async (res) => {
      if (!res.ok) {
        throw await res.json();
      }
      if (res.status >= 300) {
        throw await res.json();
      }
      return res.json();
    })
    .catch((err) => {
      // err is not a promise
      throw err;
    });

  return orderPostResult;
};

interface SearchParams {
  nonce: string;
}

const searchOrderbook = async (
  filters: Partial<SearchParams>,
  requestOptions?: Partial<OrderbookRequestOptions>,
  fetchFn: typeof unfetch = unfetch
): Promise<SearchOrdersResponsePayload> => {
  const stringifiedQueryParams = stringify(filters);

  let rootUrl = requestOptions?.rootUrl ?? ORDERBOOK_API_ROOT_URL_PRODUCTION;

  const findOrdersResult = await fetchFn(
    `${rootUrl}/orderbook/orders?${stringifiedQueryParams}`
  )
    .then(async (res) => {
      if (!res.ok) {
        throw await res.json();
      }
      if (res.status >= 300) {
        throw await res.json();
      }
      return res.json();
    })
    .catch((err) => {
      // err is not a promise
      throw err;
    });

  return findOrdersResult;
};

export { postOrderToOrderbook, searchOrderbook };
