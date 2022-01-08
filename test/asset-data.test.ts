import { InfuraProvider } from '@ethersproject/providers';
import { AssetProxyId, NftSwap, SwappableAsset } from '../src';
import { hashOrder } from '../src/sdk/pure';
import {
  decodeAssetData,
  decodeErc1155AssetData,
  decodeErc20AssetData,
  decodeErc721AssetData,
  decodeMultiAssetData,
} from '../src/utils/asset-data';
import { NULL_ADDRESS } from '../src/utils/eth';

describe('NFTSwap', () => {
  const chainId = 4;
  const rpcProvider = new InfuraProvider(4);

  it('decodes multiasset data', async () => {
    const walletAddress = '0x2791bca1f2de4661ed88a30c99a7a9449aa84174';
    // https://testnets.opensea.io/assets/0x72d391648c4fe374dea6ed5244a306060453364b/1
    const nft1Address = '0x631998e91476da5b870d741192fc5cbc55f5a52e';
    const testNft1: SwappableAsset = {
      type: 'ERC1155',
      tokenAddress: nft1Address,
      tokenId: '65638',
      amount: '14',
    };

    // https://testnets.opensea.io/assets/0xfa85acaaff1d2fd159aa8454222da76bdf8fa956/3
    const erc20Address = '0x2791bca1f2de4661ed88a30c99a7a9449aa84174';
    const testErc20: SwappableAsset = {
      type: 'ERC20',
      tokenAddress: erc20Address,
      amount: '100000',
    };

    const nftSdk = new NftSwap(rpcProvider, rpcProvider as any, chainId);

    const order = nftSdk.buildOrder(
      [testNft1], // maker assets
      [testErc20, testNft1], // taker assets
      '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', // maker wallet address
      {
        expiration: new Date(3000, 10),
        salt: '16067189784881358057906593238688655078558518561185118904709866293383414615588',
      }
    );

    const decodedTakerAssetData = decodeMultiAssetData(order.takerAssetData);
    // expect(decodedTakerAssetData.tokenAddress.toLowerCase()).toBe(
    //   testNft2.tokenAddress.toLowerCase()
    // );
    // expect(decodedTakerAssetData.tokenId.toLowerCase()).toBe(testNft2.tokenId);
    expect(decodedTakerAssetData.assetProxyId.toLowerCase()).toBe(
      AssetProxyId.MultiAsset
    );

    const generalAssetDataDecode = decodeAssetData(order.takerAssetData);

    const canFillWithEth = nftSdk.checkIfOrderCanBeFilledWithNativeToken(order);
    expect(canFillWithEth).toBe(false); // Multiasset orders cant fill with ETH/native token
    // const decodedTakerAssetData = decodeErc20AssetData(order.takerAssetData);
    // console.log('decodedTakerAssetData', decodedTakerAssetData);
    // expect(decodedTakerAssetData.tokenAddress.toLowerCase()).toBe(testErc20.tokenAddress.toLowerCase())
  });
});
