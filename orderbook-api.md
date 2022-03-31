---
description: >-
  Trader.xyz hosts a free, real-time NFT orderbook that hosts buy and sell NFT
  orders.
---

# Orderbook API

### Overview

Trader.xyz hosts the official orderbook for 0x v4 NFT orders.

Trader.xyz orderbook is an open orderbook that keeps track of off-NFT chain orders and order statuses in real-time. Anyone can add orders to the orderbook as long as they are valid 0x v4 orders.

Having an open orderbook for NFT orders makes it much easier for integrators to build NFT marketplaces and swapping apps -- bring your own frontend and leverage the trader infrastructure. No lock-in and the open orderbook is completely free to use!&#x20;

### Routes:

#### Get Orders

{% swagger method="get" path="/orders" baseUrl="https://api.trader.xyz/orderbook" summary="" %}
{% swagger-description %}
`Fetch NFT buy and sell orders that can be filled via 0x v4`

Use query params to filter for orders
{% endswagger-description %}

{% swagger-parameter in="query" name="nftToken" %}
Contract address for the NFT

(e.g. `0xed5...544` would filter for Azuki on mainnet
{% endswagger-parameter %}

{% swagger-parameter in="query" name="nftTokenId" %}
Token ID for the NFT
{% endswagger-parameter %}

{% swagger-parameter in="query" name="erc20Token" %}
Contract address for the ERC20

(e.g. `0xa`...`06eb48` is USDC on mainnet)
{% endswagger-parameter %}

{% swagger-parameter in="query" name="chainId" %}
Chain Id (

[https://chainid.network/](https://chainid.network)

)
{% endswagger-parameter %}

{% swagger-parameter in="query" name="maker" %}
Maker wallet address
{% endswagger-parameter %}

{% swagger-parameter in="query" name="taker" %}
Taker wallet address
{% endswagger-parameter %}

{% swagger-parameter in="query" name="nonce" %}
Unique nonce for order
{% endswagger-parameter %}

{% swagger-parameter in="query" name="sellOrBuyNft" %}
Filter for either buys (bids) or sells (asks) of NFTs&#x20;

Accepted filter values: 'sell' or 'buy'
{% endswagger-parameter %}

{% swagger-parameter in="query" name="status" %}
Filter by real-time order status

Accepted values: 'open' | 'filled' | 'expired' | 'cancelled' | 'all'
{% endswagger-parameter %}

{% swagger-parameter in="query" name="visibility" %}
Filter by whether an order is public or private (private meaning the order has a specific taker address)

Accepted values: 'public' | 'private'
{% endswagger-parameter %}

{% swagger-parameter in="query" name="offset" %}
Offset fetching orders

Defaults to `0`
{% endswagger-parameter %}

{% swagger-parameter in="query" name="limit" %}
Amount of orders to fetch

Defaults to `200`. Max is `1000`
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Returns an object which includes an `orders` field containing an array of orders" %}
```javascript
{
    "orders": [
      {
        "erc20Token": "0x31f42841c2db5173425b5223809cf3a38fede360",
        "erc20TokenAmount": "100000000000",
        "nftToken": "0x080ac75de7c348ae5898d6f03b894c6b2740179f",
        "nftTokenId": "1",
        "nftTokenAmount": "5",
        "nftType": "ERC1155",
        "sellOrBuyNft": "sell",
        "chainId": "3",
        "order": {
            "direction": 0,
            "erc20Token": "0x31f42841c2db5173425b5223809cf3a38fede360",
            "erc20TokenAmount": "100000000000",
            "erc1155Token": "0x080ac75de7c348ae5898d6f03b894c6b2740179f",
            "erc1155TokenId": "1",
            "erc1155TokenAmount": "5",
            "erc1155TokenProperties": [],
            "expiry": "2524604400",
            "fees": [],
            "maker": "0xabc23f70df4f45dd3df4ec6da6827cb05853ec9b",
            "nonce": "0x95cb442a6c40447397735b97a6265507",
            "signature": {
            "r": "0x40d064b246aaa46f7fc6f0b21d11329d62aa822b9ef0a848a64e68c12c25f8ee",
            "s": "0x74dac794840285584a30c88c37aaafe113642be3133651a375672b695c362861",
            "v": 27,
            "signatureType": 2
            },
            "taker": "0x0000000000000000000000000000000000000000"
        },
        "orderStatus": {
            "status": null,
            "transactionHash": null,
            "blockNumber": null
        },
        "metadata": {}
      },
      // ...more orders
    ]
}
```
{% endswagger-response %}
{% endswagger %}

Upon finding an order you like. use the order field as the order object to fill on 0x v4.

E.g.&#x20;

```typescript
const nftOrders = await fetch(`https://api.trader.xyz/orderbook/orders?chainId=1&nftToken=0x5Af0D9827E0c53E4799BB226655A1de152A425a5&status=open`)

// Find the first order
const nftOrder = nftOrders[0]

const fillableZeroExOrder = nftOrder.order

// Fill order with Swap SDK or ethers/exchange proxy directly:
// Fill via Swap SdK
const swapSdk = new SwapSdkV4(provider, signer);
const tx = await swapSdk.fillSignedOrder(fillableZeroExOrder);

// Fill via ExchangeProxy (need to generate the ExchangeProxy ABI via ethers)
const tx = await exchangeProxy.buyERC721(
  signedOrder,
  signedOrder.signature,
  '0x',
);

```
