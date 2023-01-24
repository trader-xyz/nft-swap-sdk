import { ethers } from 'ethers';
import { first } from 'lodash';
import { NftSwapV4 } from '../../src/sdk/v4/NftSwapV4';

import {
  postOrderToOrderbook,
  searchOrderbook,
} from '../../src/sdk/v4/orderbook';
import { SwappableAssetV4 } from '../../src/sdk';
import getUnixTime from 'date-fns/getUnixTime';
import sub from 'date-fns/sub';

jest.setTimeout(90 * 1000);

const MAKER_WALLET_ADDRESS = '0xabc23F70Df4F45dD3Df4EC6DA6827CB05853eC9b';
const MAKER_PRIVATE_KEY =
  'fc5db508b0a52da8fbcac3ab698088715595f8de9cccf2467d51952eec564ec9';
// NOTE(johnrjj) - NEVER use these private keys for anything of value, testnets only!

const WETH_TOKEN_ADDRESS_TESTNET = '0xc778417e063141139fce010982780140aa0cd5ab';
const DAI_TOKEN_ADDRESS_TESTNET = '0x31f42841c2db5173425b5223809cf3a38fede360';
const TEST_NFT_CONTRACT_ADDRESS = '0xf5de760f2e916647fd766b4ad9e85ff943ce3a2b'; // https://ropsten.etherscan.io/token/0xf5de760f2e916647fd766b4ad9e85ff943ce3a2b?a=0xabc23F70Df4F45dD3Df4EC6DA6827CB05853eC9b

const RPC_TESTNET =
  'https://eth-ropsten.alchemyapi.io/v2/is1WqyAFM1nNFFx2aCozhTep7IxHVNGo';

const MAKER_WALLET = new ethers.Wallet(MAKER_PRIVATE_KEY);
// const TAKER_WALLET = new ethers.Wallet(TAKER_PRIVATE_KEY);

const PROVIDER = new ethers.providers.StaticJsonRpcProvider(RPC_TESTNET);

const MAKER_SIGNER = MAKER_WALLET.connect(PROVIDER);
// const TAKER_PROVIDER = TAKER_WALLET.connect(PROVIDER);

const ROPSTEN_CHAIN_ID = 3;

const nftSwapperMaker = new NftSwapV4(
  MAKER_SIGNER as any,
  MAKER_SIGNER,
  ROPSTEN_CHAIN_ID
);
// const nftSwapperTaker = new NftSwap(TAKER_PROVIDER as any, 4);

const TAKER_ASSET: SwappableAssetV4 = {
  type: 'ERC20',
  tokenAddress: DAI_TOKEN_ADDRESS_TESTNET,
  amount: '100000000000', // 1 USDC
};
const MAKER_ASSET: SwappableAssetV4 = {
  type: 'ERC721',
  tokenAddress: TEST_NFT_CONTRACT_ADDRESS,
  tokenId: '11045',
};

describe('NFTSwapV4', () => {
  it('orderbook should return orders', async () => {
    const orders = await nftSwapperMaker.getOrders();

    expect(orders.orders.length).toBeGreaterThan(0);
  });

  xit('v4 erc721 test with orderbook e2e', async () => {
    // NOTE(johnrjj) - Assumes USDC and DAI are already approved w/ the ExchangeProxy
    const v4Erc721Order = nftSwapperMaker.buildOrder(
      MAKER_ASSET,
      TAKER_ASSET,
      MAKER_WALLET_ADDRESS
    );

    const signedOrder = await nftSwapperMaker.signOrder(v4Erc721Order);

    const testMetadata = { testData: 'unit-test' };

    const createdOrder = await postOrderToOrderbook(
      signedOrder,
      ROPSTEN_CHAIN_ID.toString(10),
      testMetadata
    );

    expect(createdOrder.order.nonce).toEqual(v4Erc721Order.nonce);

    const orderSearch = await searchOrderbook({
      nonce: signedOrder.nonce.toString(),
    });
    const maybeOrder = first(orderSearch.orders);

    expect(maybeOrder?.order.nonce).toEqual(signedOrder.nonce);
    expect(maybeOrder?.metadata).toEqual(testMetadata);

    // const orderTofill = (maybeOrder as any).order as SignedNftOrderV4Serialized
    // const fillTx = await nftSwapperMaker.fillSignedOrder(orderTofill);
    // const txReceipt = await fillTx.wait();
    // console.log(`Swapped on Ropsten (txHAsh: ${txReceipt.transactionIndex})`);
  });

  xit('v4 orderbook rejects invalid order (maker token address on non-existant token)', async () => {
    const invalidOrder = nftSwapperMaker.buildOrder(
      // Has 'invalid' erc721 token address
      {
        ...MAKER_ASSET,
        tokenAddress: '0x5Af0D9827E0c53E4799BB226655A1de152A425a5',
      },
      TAKER_ASSET,
      MAKER_WALLET_ADDRESS
    );

    const invalidSignedOrder = await nftSwapperMaker.signOrder(invalidOrder);

    const testMetadata = { testData: 'unit-test' };

    const postOrderPromiseThatShouldFail = nftSwapperMaker.postOrder(
      invalidSignedOrder,
      ROPSTEN_CHAIN_ID.toString(10),
      testMetadata
    );
    try {
      await postOrderPromiseThatShouldFail;
      expect('this line to never be hit').toBeFalsy();
    } catch (e) {
      expect(e).toEqual({
        errorCode: 'ERROR_FETCHING_ORDER_DATA',
        errorMessage:
          'Error looking up maker balance and approval data. Order may be using incorrect/bad token 0x5af0d9827e0c53e4799bb226655a1de152a425a5, chainId: 3.',
      });
    }
  });

  xit('v4 orderbook rejects invalid order (signature invalid)', async () => {
    const validOrder = nftSwapperMaker.buildOrder(
      MAKER_ASSET,
      TAKER_ASSET,
      MAKER_WALLET_ADDRESS
    );

    const signedValidOrder = await nftSwapperMaker.signOrder(validOrder);

    const invalidSignedOrder = { ...signedValidOrder };
    // intentionally invalidate (otherwise valid) signature
    invalidSignedOrder.signature.r =
      '0xe071f804c045fa2065c188151192ce1239ec03c2252ffebb2ef57fa72ecad822';

    const testMetadata = { testData: 'unit-test' };

    // const postOrderPromiseThatShouldFail = nftSwapperMaker.postOrder(
    //   invalidSignedOrder,
    //   ROPSTEN_CHAIN_ID.toString(10),
    //   testMetadata
    // );
    // try {
    //   await postOrderPromiseThatShouldFail;
    //   expect('this line to never be hit').toBeFalsy();
    // } catch (e) {
    //   expect(e).toEqual({
    //     errorCode: 'INVALID_ORDER_SIGNATURE',
    //     errorMessage: 'Signature on signed order is invalid',
    //   });
    // }
  });

  xit('v4 orderbook rejects invalid order (order expired)', async () => {
    const expiredOrder = nftSwapperMaker.buildOrder(
      MAKER_ASSET,
      TAKER_ASSET,
      MAKER_WALLET_ADDRESS,
      {
        // Make order expire yesterday
        expiry: getUnixTime(sub(new Date(), { days: 1 })),
      }
    );

    const signedExpiredOrder = await nftSwapperMaker.signOrder(expiredOrder);

    const testMetadata = { testData: 'unit-test' };

    const postOrderPromiseThatShouldFail = nftSwapperMaker.postOrder(
      signedExpiredOrder,
      ROPSTEN_CHAIN_ID.toString(10),
      testMetadata
    );
    try {
      await postOrderPromiseThatShouldFail;
      expect('this line to never be hit').toBeFalsy();
    } catch (e: any) {
      expect(e.errorCode).toBe('ORDER_EXPIRED');
    }
  });
});
