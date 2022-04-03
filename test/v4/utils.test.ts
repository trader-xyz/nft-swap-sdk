import { BigNumber, ethers } from 'ethers';
import { NftSwapV4 } from '../../src/sdk/v4/NftSwapV4';

import {
  SignedERC721OrderStruct,
  SwappableAssetV4,
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

const ERC20_ASSET: SwappableAssetV4 = {
  type: 'ERC20',
  tokenAddress: DAI_TOKEN_ADDRESS_TESTNET,
  amount: '100000000000', // 1 USDC
};
const NFT_ASSET: SwappableAssetV4 = {
  type: 'ERC721',
  tokenAddress: TEST_NFT_CONTRACT_ADDRESS,
  tokenId: '11045',
};

describe('NFTSwapV4', () => {
  it('utility functions on class work properly with erc721 sell order', async () => {
    // NOTE(johnrjj) - Assumes USDC and DAI are already approved w/ the ExchangeProxy
    const v4Erc721Order = nftSwapperMaker.buildOrder(
      NFT_ASSET,
      ERC20_ASSET,
      MAKER_WALLET_ADDRESS,
      {
        fees: [
          {
            amount: '6900000000000',
            recipient: '0xaaa1388cD71e88Ae3D8432f16bed3c603a58aD34',
          },
        ],
      }
    );

    const v4Erc721SignedOrder = await nftSwapperMaker.signOrder(v4Erc721Order);

    // Ensure getErc20TotalIncludingFees helper function works properly w/ fees.
    const total = nftSwapperMaker
      .getErc20TotalIncludingFees(v4Erc721SignedOrder)
      .toString();
    const handCountedTotal = BigNumber.from(
      v4Erc721SignedOrder.erc20TokenAmount
    ).add(BigNumber.from(v4Erc721SignedOrder.fees[0].amount));
    expect(total).toBe(handCountedTotal.toString());

    const makerAsset = nftSwapperMaker.getMakerAsset(v4Erc721SignedOrder);
    expect(makerAsset).toEqual(NFT_ASSET);

    const takerAsset = nftSwapperMaker.getTakerAsset(v4Erc721SignedOrder);
    expect(takerAsset).toEqual(ERC20_ASSET);

    const makerBalance = await nftSwapperMaker.fetchBalanceForAsset(
      makerAsset,
      v4Erc721SignedOrder.maker
    );
    expect(makerBalance.gt(0)).toBe(true);

    const makerApprovalStatus = await nftSwapperMaker.loadApprovalStatus(
      makerAsset,
      v4Erc721SignedOrder.maker
    );
    expect(makerApprovalStatus.contractApproved).toBe(true);
  });

  it('utility functions on class work properly with erc721 buy order', async () => {
    // NOTE(johnrjj) - Assumes USDC and DAI are already approved w/ the ExchangeProxy
    const v4Erc721Order = nftSwapperMaker.buildOrder(
      ERC20_ASSET,
      NFT_ASSET,
      MAKER_WALLET_ADDRESS,
      {
        fees: [
          {
            amount: '6900000000000',
            recipient: '0xaaa1388cD71e88Ae3D8432f16bed3c603a58aD34',
          },
        ],
      }
    );

    const v4Erc721SignedOrder = await nftSwapperMaker.signOrder(v4Erc721Order);

    // Ensure getErc20TotalIncludingFees helper function works properly w/ fees.
    const total = nftSwapperMaker
      .getErc20TotalIncludingFees(v4Erc721SignedOrder)
      .toString();
    const handCountedTotal = BigNumber.from(
      v4Erc721SignedOrder.erc20TokenAmount
    ).add(BigNumber.from(v4Erc721SignedOrder.fees[0].amount));
    expect(total).toBe(handCountedTotal.toString());

    const makerAsset = nftSwapperMaker.getMakerAsset(v4Erc721SignedOrder);
    expect(makerAsset).toEqual(ERC20_ASSET);

    const takerAsset = nftSwapperMaker.getTakerAsset(v4Erc721SignedOrder);
    expect(takerAsset).toEqual(NFT_ASSET);

    const makerBalance = await nftSwapperMaker.fetchBalanceForAsset(
      makerAsset,
      v4Erc721SignedOrder.maker
    );
    expect(makerBalance.gt(0)).toBe(true);

    const makerApprovalStatus = await nftSwapperMaker.loadApprovalStatus(
      makerAsset,
      v4Erc721SignedOrder.maker
    );
    expect(makerApprovalStatus.contractApproved).toBe(true);
  });
});
