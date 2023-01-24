import { ethers } from 'ethers';
import { NftSwapV4, SupportedChainIdsV4 } from '../../src/sdk/v4/NftSwapV4';

import {
  SignedERC721OrderStruct,
  SwappableAssetV4,
} from '../../src/sdk/v4/types';

jest.setTimeout(240 * 1000);

const MAKER_WALLET_ADDRESS = '0xabc23F70Df4F45dD3Df4EC6DA6827CB05853eC9b';
const MAKER_PRIVATE_KEY =
  'fc5db508b0a52da8fbcac3ab698088715595f8de9cccf2467d51952eec564ec9';
// NOTE(johnrjj) - NEVER use these private keys for anything of value, testnets only!

const DAI_TOKEN_ADDRESS_TESTNET = '0x001b3b4d0f3714ca98ba10f6042daebf0b1b7b6f'; // https://mumbai.polygonscan.com/token/0x001b3b4d0f3714ca98ba10f6042daebf0b1b7b6f?a=0xabc23F70Df4F45dD3Df4EC6DA6827CB05853eC9b
const TEST_NFT_CONTRACT_ADDRESS = '0xf5de760f2e916647fd766b4ad9e85ff943ce3a2b'; // https://mumbai.polygonscan.com/token/0xf5de760f2e916647fd766b4ad9e85ff943ce3a2b?a=0xabc23F70Df4F45dD3Df4EC6DA6827CB05853eC9b
const RPC_TESTNET =
  'https://polygon-mumbai.g.alchemy.com/v2/VMBpFqjMYv2w-MWnc9df92w3R2TpMvSG';

const MAKER_WALLET = new ethers.Wallet(MAKER_PRIVATE_KEY);
// const TAKER_WALLET = new ethers.Wallet(TAKER_PRIVATE_KEY);

const PROVIDER = new ethers.providers.StaticJsonRpcProvider(RPC_TESTNET);

const MAKER_SIGNER = MAKER_WALLET.connect(PROVIDER);
// const TAKER_PROVIDER = TAKER_WALLET.connect(PROVIDER);

const POLYGON_MUMBAI_CHAIN_ID = SupportedChainIdsV4.PolygonMumbai;

const nftSwapperMaker = new NftSwapV4(
  MAKER_SIGNER as any,
  MAKER_SIGNER,
  POLYGON_MUMBAI_CHAIN_ID
);
// const nftSwapperTaker = new NftSwap(TAKER_PROVIDER as any, 4);

const TAKER_ASSET: SwappableAssetV4 = {
  type: 'ERC20',
  tokenAddress: DAI_TOKEN_ADDRESS_TESTNET,
  amount: '100000000000', // 1 DAO
};
const MAKER_ASSET: SwappableAssetV4 = {
  type: 'ERC721',
  tokenAddress: TEST_NFT_CONTRACT_ADDRESS,
  tokenId: '324295',
};

describe('NFTSwapV4', () => {
  it('mumbai e2e test', async () => {
    // NOTE(johnrjj) - Assumes USDC and DAI are already approved w/ the ExchangeProxy

    const v4Erc721Order = nftSwapperMaker.buildOrder(
      MAKER_ASSET,
      TAKER_ASSET,
      MAKER_WALLET_ADDRESS
      // {
      //   // Fix dates and salt so we have reproducible tests
      //   expiration: new Date(3000, 10, 1),
      // }
    );

    // console.log('v4Erc721Order.nonce', v4Erc721Order.nonce.toString());

    expect(v4Erc721Order.nonce.toString().includes('-')).toBeFalsy();

    // const makerapprovalTx = await nftSwapperMaker.approveTokenOrNftByAsset(
    //   MAKER_ASSET,
    //   MAKER_WALLET_ADDRESS,
    // )
    // const makerApprovalTxHash = await (await makerapprovalTx.wait()).transactionHash
    //   console.log('maker approval tx hash', makerApprovalTxHash)

    // const takerApprovalTx = await nftSwapperMaker.approveTokenOrNftByAsset(
    //   TAKER_ASSET,
    //   MAKER_WALLET_ADDRESS,
    // )

    // const takerApprovalTxHash = await (await takerApprovalTx.wait()).transactionHash
    // console.log('taker approval tx hash', takerApprovalTxHash)

    const signedOrder = await nftSwapperMaker.signOrder(v4Erc721Order);

    // Cast to assert easily
    const signedOrderErc1155 = signedOrder as SignedERC721OrderStruct;

    expect(signedOrderErc1155.erc721Token).toBe(MAKER_ASSET.tokenAddress);
    expect(signedOrderErc1155.erc721TokenId.toString()).toBe(
      MAKER_ASSET.tokenId
    );

    expect(signedOrderErc1155.erc20Token).toBe(TAKER_ASSET.tokenAddress);
    expect(signedOrderErc1155.erc20TokenAmount).toBe(TAKER_ASSET.amount);

    expect(signedOrderErc1155.direction.toString()).toBe('0');

    // await nftSwapperMaker.postOrder(signedOrder, SupportedChainIdsV4.PolygonMumbai);

    // const maybeOrders = await nftSwapperMaker.getOrders({
    //   nonce: signedOrder.nonce.toString(10),
    // })

    // const maybeOrder = maybeOrders.orders[0];
    // const maybeOrder = { order: signedOrderErc1155 }

    // // expect(maybeOrder.order.nonce).toEqual(signedOrder.nonce.toString(10))

    // // expect(maybeOrder.order.signature.signatureType.toString()).toEqual('2');

    // const fillTx = await nftSwapperMaker.fillSignedOrder(maybeOrder.order);

    // // const fillTx = await nftSwapperMaker.fillSignedOrder(signedOrder);

    // const txReceipt = await fillTx.wait();
    // console.log('erc721 fill tx', txReceipt.transactionHash);

    // expect(txReceipt.transactionHash).toBeTruthy();

    // console.log(`Swapped on Polygon Mumbai (txHash: ${txReceipt.transactionHash})`);
  });
});
