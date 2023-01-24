import { ethers } from 'ethers';
import { defaultAbiCoder, hexDataSlice, parseEther } from 'ethers/lib/utils';
import { NftSwap, SwappableAsset } from '../../src';
import { verifyOrderSignature } from '../../src/sdk/v3/pure';
import { encodeErc20AssetData } from '../../src/utils/v3/asset-data';
import { normalizeOrder } from '../../src/utils/v3/order';

jest.setTimeout(60 * 1000);

const MAKER_WALLET_ADDRESS = '0xabc23F70Df4F45dD3Df4EC6DA6827CB05853eC9b';
const MAKER_PRIVATE_KEY =
  'fc5db508b0a52da8fbcac3ab698088715595f8de9cccf2467d51952eec564ec9';
// NOTE(johnrjj) - NEVER use these private keys for anything of value, testnets only!

// TODO(johnrjj) - When Rinkeby faucet is working, separate out swap into two accounts.
// Right now we'll just trade between the same account (it works for testing purposes)
// const TAKER_WALLET_ADDRESS = "0xaaa1388cD71e88Ae3D8432f16bed3c603a58aD34";
// const TAKER_PRIVATE_KEY =
//   "a8d6d0643c732663bf5221f83df806a59ed54dbd9be02e226b1a11ff4de83de8";

const USDC_TOKEN_ADDRESS_TESTNET = '0xeb8f08a975ab53e34d8a0330e0d34de942c95926';
const DAI_TOKEN_ADDRESS_TESTNET = '0x6a9865ade2b6207daac49f8bcba9705deb0b0e6d';

const RPC_TESTNET =
  'https://eth-rinkeby.alchemyapi.io/v2/is1WqyAFM1nNFFx2aCozhTep7IxHVNGo';

const MAKER_WALLET = new ethers.Wallet(MAKER_PRIVATE_KEY);
// const TAKER_WALLET = new ethers.Wallet(TAKER_PRIVATE_KEY);

const PROVIDER = new ethers.providers.StaticJsonRpcProvider(RPC_TESTNET);

const MAKER_SIGNER = MAKER_WALLET.connect(PROVIDER);
// const TAKER_PROVIDER = TAKER_WALLET.connect(PROVIDER);

const nftSwapperMaker = new NftSwap(MAKER_SIGNER as any, MAKER_SIGNER, 4);
// const nftSwapperTaker = new NftSwap(TAKER_PROVIDER as any, 4);

const TAKER_ASSET: SwappableAsset = {
  type: 'ERC20',
  tokenAddress: USDC_TOKEN_ADDRESS_TESTNET,
  amount: '100000', // 1 USDC
};
const MAKER_ASSET: SwappableAsset = {
  type: 'ERC20',
  tokenAddress: DAI_TOKEN_ADDRESS_TESTNET,
  amount: '100000000000000000', // 1 DAI
};

describe('NFTSwap', () => {
  xit('swaps 0.1 DAI and 0.1 USDC correctly', async () => {
    // NOTE(johnrjj) - Assumes USDC and DAI are already approved w/ the ExchangeProxy

    const gasPrice = (await PROVIDER.getGasPrice()).mul(2);

    const order = nftSwapperMaker.buildOrder(
      [MAKER_ASSET],
      [TAKER_ASSET],
      MAKER_WALLET_ADDRESS,
      {
        // Fix dates and salt so we have reproducible tests
        expiration: new Date(3000, 10, 1),
      }
    );

    const normalizedOrder = normalizeOrder(order);
    const signedOrder = await nftSwapperMaker.signOrder(
      normalizedOrder,
      MAKER_WALLET_ADDRESS,
      MAKER_SIGNER
    );

    const normalizedSignedOrder = normalizeOrder(signedOrder);

    expect(normalizedSignedOrder.makerAddress.toLowerCase()).toBe(
      MAKER_WALLET_ADDRESS.toLowerCase()
    );

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
