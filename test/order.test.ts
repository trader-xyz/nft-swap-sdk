import { InfuraProvider } from '@ethersproject/providers';
import { AssetProxyId, NftSwap, SwappableAsset } from '../src';
import { hashOrder } from '../src/sdk/v3/pure';
import {
  decodeErc1155AssetData,
  decodeErc20AssetData,
  decodeErc721AssetData,
} from '../src/utils/v3/asset-data';
import { NULL_ADDRESS } from '../src/utils/eth';

describe('NFTSwap', () => {
  const chainId = 4;
  const rpcProvider = new InfuraProvider(4);
  it('builds single asset order correctly', async () => {
    // https://testnets.opensea.io/assets/0x72d391648c4fe374dea6ed5244a306060453364b/1
    const nft1Owner = '0x72d391648c4fe374dea6ed5244a306060453364b';
    const testNft1: SwappableAsset = {
      type: 'ERC721',
      tokenAddress: nft1Owner,
      tokenId: '1',
    };

    // https://testnets.opensea.io/assets/0xfa85acaaff1d2fd159aa8454222da76bdf8fa956/3
    const nft2Owner = '0xfa85acaaff1d2fd159aa8454222da76bdf8fa956';
    const testNft2: SwappableAsset = {
      type: 'ERC721',
      tokenAddress: nft2Owner,
      tokenId: '3',
    };

    const nftSdk = new NftSwap(rpcProvider, rpcProvider as any, chainId);

    const order = nftSdk.buildOrder(
      [testNft1], // maker assets
      [testNft2], // taker assets
      nft1Owner, // maker wallet address
      {
        expiration: new Date(3000, 10),
        salt: '16067189784881358057906593238688655078558518561185118904709866293383414615588',
      }
    );

    const decodedTakerAssetData = decodeErc721AssetData(order.takerAssetData);
    expect(decodedTakerAssetData.tokenAddress.toLowerCase()).toBe(
      testNft2.tokenAddress.toLowerCase()
    );
    expect(decodedTakerAssetData.tokenId.toLowerCase()).toBe(testNft2.tokenId);
    expect(decodedTakerAssetData.assetProxyId.toLowerCase()).toBe(
      AssetProxyId.ERC721
    );

    expect(order.makerAddress).toBe(nft1Owner);
    expect(order.makerAssetAmount.toString()).toEqual('1');
    expect(order.makerAssetData).toBe(
      '0x0257179200000000000000000000000072d391648c4fe374dea6ed5244a306060453364b0000000000000000000000000000000000000000000000000000000000000001'
    );
    expect(order.takerAddress).toBe(NULL_ADDRESS);
    expect(order.takerAssetAmount.toString()).toEqual('1');
    expect(order.takerAssetData).toBe(
      '0x02571792000000000000000000000000fa85acaaff1d2fd159aa8454222da76bdf8fa9560000000000000000000000000000000000000000000000000000000000000003'
    );

    // Ensure doesn't exceed 256 bit number
    expect(order.salt.length).toBeLessThanOrEqual(78);
    // Ensure we always have more than 32 bits of randomness
    expect(order.salt.length).toBeGreaterThanOrEqual(32);
    // Ensure salt is always a string
    expect(typeof order.salt).toBe('string');

    const orderHash = hashOrder(
      order,
      chainId,
      nftSdk.exchangeContract.address
    );
    expect(orderHash.length).toEqual(66);
    expect(orderHash.slice(0, 2)).toBe('0x');
  });

  it('builds single asset order erc1155 with amounts > 1 correctly', async () => {
    const walletAddress = '0x2791bca1f2de4661ed88a30c99a7a9449aa84174';
    const nft1Address = '0x631998e91476da5b870d741192fc5cbc55f5a52e';
    const testNft1: SwappableAsset = {
      type: 'ERC1155',
      tokenAddress: nft1Address,
      tokenId: '65638',
      amount: '14',
    };

    const erc20Address = '0x2791bca1f2de4661ed88a30c99a7a9449aa84174';
    const testErc20: SwappableAsset = {
      type: 'ERC20',
      tokenAddress: erc20Address,
      amount: '100000',
    };

    const nftSdk = new NftSwap(rpcProvider, rpcProvider as any, chainId);

    const order = nftSdk.buildOrder(
      [testNft1], // maker assets
      [testErc20], // taker assets
      '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', // maker wallet address
      {
        expiration: new Date(3000, 10),
        salt: '16067189784881358057906593238688655078558518561185118904709866293383414615588',
      }
    );

    const decodedMakerAssetData = decodeErc1155AssetData(order.makerAssetData);
    expect(decodedMakerAssetData.tokenAddress.toLowerCase()).toBe(
      testNft1.tokenAddress.toLowerCase()
    );
    expect(decodedMakerAssetData.tokenIds[0].toLowerCase()).toBe(
      testNft1.tokenId
    );
    expect(decodedMakerAssetData.assetProxyId.toLowerCase()).toBe(
      AssetProxyId.ERC1155
    );

    const decodedTakerAssetData = decodeErc20AssetData(order.takerAssetData);
    expect(decodedTakerAssetData.tokenAddress.toLowerCase()).toBe(
      testErc20.tokenAddress.toLowerCase()
    );

    expect(order.makerAddress).toBe(walletAddress);
    expect(order.makerAssetAmount.toString()).toEqual('14');
    expect(order.makerAssetData).toBe(
      '0xa7cb5fb7000000000000000000000000631998e91476da5b870d741192fc5cbc55f5a52e000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000100660000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000000'
    );
    expect(order.takerAddress).toBe(NULL_ADDRESS);
    expect(order.takerAssetAmount.toString()).toEqual('100000');
    expect(order.takerAssetData).toBe(
      '0xf47261b00000000000000000000000002791bca1f2de4661ed88a30c99a7a9449aa84174'
    );

    // Ensure doesn't exceed 256 bit number
    expect(order.salt.length).toBeLessThanOrEqual(78);
    // Ensure we always have more than 32 bits of randomness
    expect(order.salt.length).toBeGreaterThanOrEqual(32);
    // Ensure salt is always a string
    expect(typeof order.salt).toBe('string');

    const orderHash = hashOrder(
      order,
      chainId,
      nftSdk.exchangeContract.address
    );
    expect(orderHash.length).toEqual(66);
    expect(orderHash.slice(0, 2)).toBe('0x');
  });

  it('builds single asset order erc1155 with no amounts (defaults to 1) correctly', async () => {
    const walletAddress = '0x2791bca1f2de4661ed88a30c99a7a9449aa84174';
    // https://testnets.opensea.io/assets/0x72d391648c4fe374dea6ed5244a306060453364b/1
    const nft1Address = '0x631998e91476da5b870d741192fc5cbc55f5a52e';
    const testNft1: SwappableAsset = {
      type: 'ERC1155',
      tokenAddress: nft1Address,
      tokenId: '65638',
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
      [testErc20], // taker assets
      '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', // maker wallet address
      {
        expiration: new Date(3000, 10),
        salt: '16067189784881358057906593238688655078558518561185118904709866293383414615588',
      }
    );

    expect(order.makerAddress).toBe(walletAddress);
    expect(order.makerAssetAmount.toString()).toEqual('1');
    expect(order.makerAssetData).toBe(
      '0xa7cb5fb7000000000000000000000000631998e91476da5b870d741192fc5cbc55f5a52e000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000010066000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000'
    );
    expect(order.takerAddress).toBe(NULL_ADDRESS);
    expect(order.takerAssetAmount.toString()).toEqual('100000');
    expect(order.takerAssetData).toBe(
      '0xf47261b00000000000000000000000002791bca1f2de4661ed88a30c99a7a9449aa84174'
    );

    // Ensure doesn't exceed 256 bit number
    expect(order.salt.length).toBeLessThanOrEqual(78);
    // Ensure we always have more than 32 bits of randomness
    expect(order.salt.length).toBeGreaterThanOrEqual(32);
    // Ensure salt is always a string
    expect(typeof order.salt).toBe('string');

    const orderHash = hashOrder(
      order,
      chainId,
      nftSdk.exchangeContract.address
    );
    expect(orderHash.length).toEqual(66);
    expect(orderHash.slice(0, 2)).toBe('0x');
  });
});
