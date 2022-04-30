import unfetch from 'isomorphic-unfetch';
import { stringify } from 'query-string';
import type { SignedNftOrderV4, SignedNftOrderV4Serialized } from './types';
import { serializeNftOrder } from './pure';

export const ORDERBOOK_API_ROOT_URL_PRODUCTION = 'https://api.trader.xyz';

export interface OrderbookRequestOptions {
  rootUrl: string;
}

export interface PostOrderRequestPayload {
  order: SignedNftOrderV4Serialized;
  chainId: string;
  metadata?: Record<string, string>;
}

export interface PostOrderResponsePayload {
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

export interface SearchOrdersResponsePayload {
  orders: Array<PostOrderResponsePayload>;
}

const postOrderToOrderbook = async (
  signedOrder: SignedNftOrderV4,
  chainId: string | number,
  metadata: Record<string, string> = {},
  requestOptions?: Partial<OrderbookRequestOptions>,
  fetchFn: typeof unfetch = unfetch
): Promise<PostOrderResponsePayload> => {
  const payload: PostOrderRequestPayload = {
    order: serializeNftOrder(signedOrder),
    chainId: chainId.toString(10),
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

/**
 * Available query parameters for searching the orderbook
 */
export interface SearchOrdersParams {
  nftTokenId: string | string[];
  erc20Token: string | string[];
  nftToken: string | string[];
  nftType: 'ERC721' | 'ERC1155';
  chainId: string | number | string[] | number[];
  maker: string;
  taker: string;
  nonce: string | string[];
  offset: string | number;
  limit: string | number;
  sellOrBuyNft: 'sell' | 'buy';
  direction: '0' | '1';
  // Defaults to only 'open' orders
  status: 'open' | 'filled' | 'expired' | 'cancelled' | 'all';
  visibility: 'public' | 'private';
  valid: 'valid' | 'all';
}

/**
 * Search through the public hosted orderbook
 * @param filters Optional query param filters
 * @param requestOptions Fetch options/overrides
 * @param fetchFn Optional fetch function override. Uses unfetch by default.
 * @returns
 */
const searchOrderbook = async (
  filters?: Partial<SearchOrdersParams>,
  requestOptions?: Partial<OrderbookRequestOptions>,
  fetchFn: typeof unfetch = unfetch
): Promise<SearchOrdersResponsePayload> => {
  // https://github.com/sindresorhus/query-string#arrayformat
  const stringifiedQueryParams = stringify(filters ?? {}, {
    arrayFormat: 'none',
  });

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
