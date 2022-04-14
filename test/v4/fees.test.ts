import { BigNumber, ethers } from 'ethers';
import { FAKE_ETH_ADDRESS, NftSwapV4 } from '../../src/sdk/v4/NftSwapV4';

import { SwappableAssetV4 } from '../../src/sdk/v4/types';
import { SignedERC721OrderStruct } from '../../src/sdk/v4/types';
import { NULL_ADDRESS } from '../../src/utils/eth';

jest.setTimeout(90 * 1000);

const MAKER_WALLET_ADDRESS = '0xabc23F70Df4F45dD3Df4EC6DA6827CB05853eC9b';
const MAKER_PRIVATE_KEY =
  'fc5db508b0a52da8fbcac3ab698088715595f8de9cccf2467d51952eec564ec9';

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

const DAI_ASSET: SwappableAssetV4 = {
  type: 'ERC20',
  tokenAddress: DAI_TOKEN_ADDRESS_TESTNET,
  amount: '420000000000000', // 1 USDC
};

const ETH_ASSET: SwappableAssetV4 = {
  type: 'ERC20',
  tokenAddress: FAKE_ETH_ADDRESS,
  amount: '420000000000000', // 1 USDC
};

const NFT_ASSET: SwappableAssetV4 = {
  type: 'ERC721',
  tokenAddress: TEST_NFT_CONTRACT_ADDRESS,
  tokenId: '11045',
};

describe('NFTSwapV4', () => {
  it('erc20 fee', async () => {
    // NOTE(johnrjj) - Assumes USDC and DAI are already approved w/ the ExchangeProxy
    const v4Erc721Order = nftSwapperMaker.buildOrder(
      NFT_ASSET,
      DAI_ASSET,
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

    const signedOrder = (await nftSwapperMaker.signOrder(
      v4Erc721Order
    )) as SignedERC721OrderStruct;

    expect(signedOrder.fees[0].recipient).toEqual(
      '0xaaa1388cD71e88Ae3D8432f16bed3c603a58aD34'.toLowerCase()
    );

    // Ensure getErc20TotalIncludingFees helper function works properly w/ fees.
    const total = nftSwapperMaker
      .getErc20TotalIncludingFees(signedOrder)
      .toString();
    const handCountedTotal = BigNumber.from(signedOrder.erc20TokenAmount).add(
      BigNumber.from(signedOrder.fees[0].amount)
    );
    expect(total).toBe(handCountedTotal.toString());

    // // Uncomment to actually fill order
    // const tx = await nftSwapperMaker.fillSignedOrder(signedOrder);
    // const txReceipt = await tx.wait();
    // expect(txReceipt.transactionHash).toBeTruthy();
    // console.log(`Swapped tx with fees on Ropsten (txHAsh: ${txReceipt.transactionHash})`);
  });

  it('eth w/ fee', async () => {
    // NOTE(johnrjj) - Assumes USDC and DAI are already approved w/ the ExchangeProxy
    const v4Erc721Order = nftSwapperMaker.buildOrder(
      NFT_ASSET,
      ETH_ASSET,
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

    const signedOrder = (await nftSwapperMaker.signOrder(
      v4Erc721Order
    )) as SignedERC721OrderStruct;

    expect(signedOrder.fees[0].recipient).toEqual(
      '0xaaa1388cD71e88Ae3D8432f16bed3c603a58aD34'.toLowerCase()
    );

    // Ensure getErc20TotalIncludingFees helper function works properly w/ fees.
    const total = nftSwapperMaker
      .getErc20TotalIncludingFees(signedOrder)
      .toString();
    const handCountedTotal = BigNumber.from(signedOrder.erc20TokenAmount).add(
      BigNumber.from(signedOrder.fees[0].amount)
    );
    expect(total).toBe(handCountedTotal.toString());

    // Uncomment to actually fill order
    // const tx = await nftSwapperMaker.fillSignedOrder(signedOrder);
    // const txReceipt = await tx.wait();
    // expect(txReceipt.transactionHash).toBeTruthy();
    // console.log(
    //   `Swapped tx eth with fees on Ropsten (txHAsh: ${txReceipt.transactionHash})`
    // );
  });

  it('eth w/ multiple fees', async () => {
    // NOTE(johnrjj) - Assumes USDC and DAI are already approved w/ the ExchangeProxy
    const v4Erc721Order = nftSwapperMaker.buildOrder(
      NFT_ASSET,
      ETH_ASSET,
      MAKER_WALLET_ADDRESS,
      {
        fees: [
          {
            amount: '6900000000000',
            recipient: '0xaaa1388cD71e88Ae3D8432f16bed3c603a58aD34',
          },
          {
            amount: '7000000000000',
            recipient: '0xbbb5A0ceB2344B6566a8e945872D2Ba8Fb04E58E',
          },
        ],
      }
    );

    const signedOrder = (await nftSwapperMaker.signOrder(
      v4Erc721Order
    )) as SignedERC721OrderStruct;

    expect(signedOrder.fees[0].recipient).toEqual(
      '0xaaa1388cD71e88Ae3D8432f16bed3c603a58aD34'.toLowerCase()
    );
    expect(signedOrder.fees[1].recipient).toEqual(
      '0xbbb5A0ceB2344B6566a8e945872D2Ba8Fb04E58E'.toLowerCase()
    );

    // Ensure getErc20TotalIncludingFees helper function works properly w/ fees.
    const computedTotal = nftSwapperMaker
      .getErc20TotalIncludingFees(signedOrder)
      .toString();

    expect(computedTotal).toBe('433900000000000');

    const handCountedTotal = BigNumber.from(signedOrder.erc20TokenAmount)
      .add(BigNumber.from(signedOrder.fees[0].amount))
      .add(BigNumber.from(signedOrder.fees[1].amount))
      .toString();

    expect(handCountedTotal).toBe('433900000000000');

    // Uncomment to actually fill order
    const tx = await nftSwapperMaker.fillSignedOrder(signedOrder);
    const txReceipt = await tx.wait();
    expect(txReceipt.transactionHash).toBeTruthy();
    console.log(
      `Swapped tx eth with multiple fees on Ropsten (txHAsh: ${txReceipt.transactionHash})`
    );
  });
});
