import { BigNumber, ethers } from 'ethers';
import { NftSwapV4 } from '../../src/sdk/v4/NftSwapV4';

import {
  SwappableAssetV4,
  UserFacingERC721AssetDataSerializedV4,
} from '../../src/sdk/v4/types';

jest.setTimeout(120 * 1000);

const MAKER_WALLET_ADDRESS = '0xabc23F70Df4F45dD3Df4EC6DA6827CB05853eC9b';
const MAKER_PRIVATE_KEY =
  'fc5db508b0a52da8fbcac3ab698088715595f8de9cccf2467d51952eec564ec9';
// NOTE(johnrjj) - NEVER use these private keys for anything of value, testnets only!

const DAI_TOKEN_ADDRESS_TESTNET = '0x31f42841c2db5173425b5223809cf3a38fede360';
const TEST_NFT_CONTRACT_ADDRESS = '0xf5de760f2e916647fd766b4ad9e85ff943ce3a2b'; // https://ropsten.etherscan.io/token/0xf5de760f2e916647fd766b4ad9e85ff943ce3a2b?a=0xabc23F70Df4F45dD3Df4EC6DA6827CB05853eC9b

const RPC_TESTNET =
  'https://eth-ropsten.alchemyapi.io/v2/is1WqyAFM1nNFFx2aCozhTep7IxHVNGo';

const MAKER_WALLET = new ethers.Wallet(MAKER_PRIVATE_KEY);

const PROVIDER = new ethers.providers.StaticJsonRpcProvider(RPC_TESTNET);

const MAKER_SIGNER = MAKER_WALLET.connect(PROVIDER);

const ROPSTEN_CHAIN_ID = 3;

const nftSwapperMaker = new NftSwapV4(
  MAKER_SIGNER as any,
  MAKER_SIGNER,
  ROPSTEN_CHAIN_ID
);

const ERC20_ASSET: SwappableAssetV4 = {
  type: 'ERC20',
  tokenAddress: DAI_TOKEN_ADDRESS_TESTNET,
  amount: '100000000000', // 1 USDC
} as const;
const NFT_ASSET: UserFacingERC721AssetDataSerializedV4 = {
  type: 'ERC721',
  tokenAddress: TEST_NFT_CONTRACT_ADDRESS,
  tokenId: '11045',
} as const;

describe('NFTSwapV4', () => {
  it('custom expiry as unix timestamp number works', async () => {
    const v4Erc721Order = nftSwapperMaker.buildOrder(
      NFT_ASSET,
      ERC20_ASSET,
      MAKER_WALLET_ADDRESS,
      {
        expiry: 2420696969,
      }
    );

    const v4Erc721SignedOrder = await nftSwapperMaker.signOrder(v4Erc721Order);
    expect(v4Erc721SignedOrder.expiry.toString()).toEqual('2420696969');
  });

  it('custom expiry as unix timestamp string works', async () => {
    const v4Erc721Order = nftSwapperMaker.buildOrder(
      NFT_ASSET,
      ERC20_ASSET,
      MAKER_WALLET_ADDRESS,
      {
        expiry: '2420696969',
      }
    );

    const v4Erc721SignedOrder = await nftSwapperMaker.signOrder(v4Erc721Order);
    expect(v4Erc721SignedOrder.expiry.toString()).toEqual('2420696969');
  });

  it('custom expiry as Date object works', async () => {
    const v4Erc721Order = nftSwapperMaker.buildOrder(
      NFT_ASSET,
      ERC20_ASSET,
      MAKER_WALLET_ADDRESS,
      {
        expiry: new Date(2030, 1, 11),
      }
    );

    const v4Erc721SignedOrder = await nftSwapperMaker.signOrder(v4Erc721Order);

    const expiryBn = BigNumber.from(v4Erc721SignedOrder.expiry);
    // Depending on where this test is run it'll vary by a few hours. This assets on a valid range (24hrs)
    expect(expiryBn.sub('1897016400').abs().toNumber()).toBeLessThan(24_000);
  });
});
