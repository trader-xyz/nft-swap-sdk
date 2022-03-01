import { ethers } from 'ethers';
import { NftSwap, SwappableAsset } from '../../src';
import { OrderStatusV3 } from '../../src/sdk/v3/types';
import { normalizeOrder } from '../../src/utils/v3/order';

jest.setTimeout(60 * 1000);

const MAKER_WALLET_ADDRESS = '0xabc23F70Df4F45dD3Df4EC6DA6827CB05853eC9b';
const MAKER_PRIVATE_KEY =
  'fc5db508b0a52da8fbcac3ab698088715595f8de9cccf2467d51952eec564ec9';
// NOTE(johnrjj) - NEVER use these private keys for anything of value, testnets only!

const WMATIC_TOKEN_ADDRESS_TESTNET =
  '0x9c3c9283d3e44854697cd22d3faa240cfb032889';
const DAI_TOKEN_ADDRESS_TESTNET = '0x001b3b4d0f3714ca98ba10f6042daebf0b1b7b6f';

const RPC_TESTNET =
  'https://polygon-mumbai.g.alchemy.com/v2/VMBpFqjMYv2w-MWnc9df92w3R2TpMvSG';

const MAKER_WALLET = new ethers.Wallet(MAKER_PRIVATE_KEY);

const PROVIDER = new ethers.providers.StaticJsonRpcProvider(RPC_TESTNET);

const MAKER_SIGNER = MAKER_WALLET.connect(PROVIDER);

const nftSwapperMaker = new NftSwap(MAKER_SIGNER as any, MAKER_SIGNER, 80001);

const TAKER_ASSET: SwappableAsset = {
  type: 'ERC20',
  tokenAddress: WMATIC_TOKEN_ADDRESS_TESTNET,
  amount: '10000000000000000', // 1 WMATIC
};
const MAKER_ASSET: SwappableAsset = {
  type: 'ERC20',
  tokenAddress: DAI_TOKEN_ADDRESS_TESTNET,
  amount: '10000000000000000', // 1 DAI
};

describe('NFTSwap', () => {
  fit('checks order status correctly before and after cancel', async () => {
    // NOTE(johnrjj) - Assumes USDC and DAI are already approved w/ the ExchangeProxy

    const gasPrice = (await PROVIDER.getGasPrice()).mul(2);

    // const approvalTxMaker = await nftSwapperMaker.approveTokenOrNftByAsset(
    //   MAKER_ASSET,
    //   MAKER_WALLET_ADDRESS
    // );
    // const makerApprovalTxReceipt = await approvalTxMaker.wait();

    // expect(makerApprovalTxReceipt.transactionHash).toBeTruthy();

    const makerApprovalStatus = await nftSwapperMaker.loadApprovalStatus(
      MAKER_ASSET,
      MAKER_WALLET_ADDRESS
    );
    // expect(makerApprovalStatus.contractApproved).toBe(true);

    // const approvalTxMaker = await nftSwapperMaker.approveTokenOrNftByAsset(
    //   MAKER_ASSET,
    //   MAKER_WALLET_ADDRESS
    // );
    // const approvalTxTaker = await nftSwapperMaker.approveTokenOrNftByAsset(
    //   TAKER_ASSET,
    //   MAKER_WALLET_ADDRESS
    // );

    // const makerApprovalTxReceipt = await approvalTxMaker.wait();
    // console.log(
    //   'makerApprovalTxReceipt',
    //   makerApprovalTxReceipt.transactionHash
    // );
    // const takerApprovalTxReceipt = await approvalTxTaker.wait();
    // console.log(
    //   'takerApprovalTxReceipt',
    //   takerApprovalTxReceipt.transactionHash
    // );

    const order = nftSwapperMaker.buildOrder(
      [MAKER_ASSET],
      [TAKER_ASSET],
      MAKER_WALLET_ADDRESS,
      {
        // Fix dates and salt so we have reproducible tests
        expiration: new Date(3000, 10, 1),
        feeRecipientAddress: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeE',
      }
    );

    const normalizedOrder = normalizeOrder(order);

    expect(normalizedOrder.feeRecipientAddress).toBe(
      '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
    );

    const orderInfo = await nftSwapperMaker.getOrderInfo(normalizedOrder);

    expect(orderInfo.orderStatus).toBe(OrderStatusV3.Fillable);

    const signedOrder = await nftSwapperMaker.signOrder(
      normalizedOrder,
      MAKER_WALLET_ADDRESS,
      MAKER_SIGNER
    );

    const normalizedSignedOrder = normalizeOrder(signedOrder);

    expect(normalizedSignedOrder.makerAddress.toLowerCase()).toBe(
      MAKER_WALLET_ADDRESS.toLowerCase()
    );

    // const cancelTx = await nftSwapperMaker.cancelOrder(normalizedOrder);
    // const cancelTxReceipt = await cancelTx.wait();
    // expect(cancelTxReceipt.transactionHash).toBeTruthy();

    // const orderInfoAfterCancel = await nftSwapperMaker.getOrderInfo(
    //   normalizedOrder
    // );
    // expect(orderInfoAfterCancel.orderStatus).toBe(OrderStatus.Cancelled);

    // // Uncomment to actually fill order
    // const tx = await nftSwapperMaker.fillSignedOrder(signedOrder, undefined, {
    //   gasPrice,
    //   gasLimit: '500000',
    //   // HACK(johnnrjj) - Rinkeby still has protocol fees, so we give it a little bit of ETH so its happy.
    //   value: parseEther('0.0001'),
    // });

    // const txReceipt = await tx.wait();
    // expect(txReceipt.transactionHash).toBeTruthy();
    // console.log(`Swapped on Mumbai (txHAsh: ${txReceipt.transactionHash})`);
  });
});

// https://polygon-mumbai.g.alchemy.com/v2/VMBpFqjMYv2w-MWnc9df92w3R2TpMvSG
