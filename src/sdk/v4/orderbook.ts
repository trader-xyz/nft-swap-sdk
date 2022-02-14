import unfetch from 'isomorphic-unfetch';
import type { SignedNftOrderV4, SignedNftOrderV4Serialized } from './types';
import { stringify } from '../../utils/query-string';
import { serializeNftOrder } from './pure';

const PRODUCTION_ORDERBOOK_API_ROOT_URL = 'https://api.trader.xyz';

interface OrderbookRequestOptions {
  rootUrl: string;
}

interface PostOrderRequestPayload {
  order: SignedNftOrderV4Serialized;
  chainId: number;
  metadata?: Record<string, string>;
}

const postOrderToOrderbook = async (
  signedOrder: SignedNftOrderV4,
  chainId: number,
  metadata: Record<string, string> = {},
  requestOptions?: Partial<OrderbookRequestOptions>,
  fetchFn: typeof unfetch = unfetch
) => {
  const payload: PostOrderRequestPayload = {
    order: serializeNftOrder(signedOrder),
    chainId,
    metadata,
  };

  let rootUrl = requestOptions?.rootUrl ?? PRODUCTION_ORDERBOOK_API_ROOT_URL;

  const orderPostResult = await fetchFn(`${rootUrl}/orderbook/order`, {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
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
) => {
  const stringifiedQueryParams = stringify(filters);

  let rootUrl = requestOptions?.rootUrl ?? PRODUCTION_ORDERBOOK_API_ROOT_URL;

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
