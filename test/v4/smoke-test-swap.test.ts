import { ethers } from 'ethers';
import { NftSwapV4 } from '../../src/sdk/v4/NftSwapV4';

import { SwappableAsset } from '../../src/sdk/v4/pure';

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

const TAKER_ASSET: SwappableAsset = {
  type: 'ERC20',
  tokenAddress: DAI_TOKEN_ADDRESS_TESTNET,
  amount: '100000000000', // 1 USDC
};
const MAKER_ASSET: SwappableAsset = {
  type: 'ERC721',
  tokenAddress: TEST_NFT_CONTRACT_ADDRESS,
  tokenId: '11045',
};

describe('NFTSwapV4', () => {
  it.only('v4 erc721 test', async () => {
    // NOTE(johnrjj) - Assumes USDC and DAI are already approved w/ the ExchangeProxy

    const v4Erc721Order = nftSwapperMaker.buildOrder(
      MAKER_ASSET,
      TAKER_ASSET,
      'buy',
      MAKER_WALLET_ADDRESS
      // {
      //   // Fix dates and salt so we have reproducible tests
      //   expiration: new Date(3000, 10, 1),
      // }
    );

    console.log('v4Erc721Order.nonce', v4Erc721Order.nonce.toString());

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
    console.log('erc721 signatuee', signedOrder.signature);
    expect(signedOrder.signature.signatureType.toString()).toEqual('2');

    // const fillTx = await nftSwapperMaker.fillSignedOrder(signedOrder);
    // const txReceipt = await fillTx.wait();
    // console.log('erc721 fill tx', txReceipt.transactionHash);

    // expect(txReceipt.transactionHash).toBeTruthy();

    // const normalizedOrder = normalizeOrder(order);
    // const signedOrder = await nftSwapperMaker.signOrder(
    //   normalizedOrder,
    // );

    // const normalizedSignedOrder = normalizeOrder(signedOrder);

    // expect(normalizedSignedOrder.makerAddress.toLowerCase()).toBe(
    //   MAKER_WALLET_ADDRESS.toLowerCase()
    // );

    // Uncomment to actually fill order
    // const tx = await nftSwapperMaker.fillSignedOrder(signedOrder, undefined, {
    //   gasPrice,
    //   gasLimit: '500000',
    //   // HACK(johnnrjj) - Rinkeby still has protocol fees, so we give it a little bit of ETH so its happy.
    //   value: parseEther('0.01'),
    // });

    // const txReceipt = await tx.wait();
    // expect(txReceipt.transactionHash).toBeTruthy();
    // console.log(`Swapped on Rinkeby (txHAsh: ${txReceipt.transactionIndex})`);
  });
});

// https://polygon-mumbai.g.alchemy.com/v2/VMBpFqjMYv2w-MWnc9df92w3R2TpMvSG
