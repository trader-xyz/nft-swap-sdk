import { ethers } from 'ethers';
import { NftSwapV4 } from '../../src/sdk/v4/NftSwapV4';

import {
  SignedERC1155OrderStruct,
  SwappableAssetV4,
} from '../../src/sdk/v4/types';

jest.setTimeout(90 * 1000);

const MAKER_WALLET_ADDRESS = '0xabc23F70Df4F45dD3Df4EC6DA6827CB05853eC9b';
const MAKER_PRIVATE_KEY =
  'fc5db508b0a52da8fbcac3ab698088715595f8de9cccf2467d51952eec564ec9';

const DAI_TOKEN_ADDRESS_TESTNET = '0x31f42841c2db5173425b5223809cf3a38fede360';
const TEST_NFT_CONTRACT_ADDRESS = '0x080ac75de7c348ae5898d6f03b894c6b2740179f'; // https://ropsten.etherscan.io/address/0x080ac75de7c348ae5898d6f03b894c6b2740179f

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
  amount: '100000000000', // 0.00001 DAI
};

const ERC721_ASSET: SwappableAssetV4 = {
  type: 'ERC1155',
  tokenAddress: TEST_NFT_CONTRACT_ADDRESS,
  tokenId: '1',
  amount: '5',
};

describe('NFTSwapV4', () => {
  it('V4 ERC1155 test', async () => {
    // NOTE(johnrjj) - Assumes USDC and DAI are already approved w/ the ExchangeProxy
    const v4Erc1155Order = nftSwapperMaker.buildOrder(
      ERC721_ASSET,
      ERC20_ASSET,
      MAKER_WALLET_ADDRESS
    );

    expect(v4Erc1155Order.nonce.toString().includes('-')).toBeFalsy();

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

    const signedOrder = await nftSwapperMaker.signOrder(v4Erc1155Order);

    // Cast to assert easily
    const signedOrderErc1155 = signedOrder as SignedERC1155OrderStruct;

    expect(signedOrderErc1155.erc1155Token).toBe(ERC721_ASSET.tokenAddress);

    expect(signedOrderErc1155.erc1155TokenAmount.toString()).toBe(
      ERC721_ASSET.amount
    );
    expect(signedOrderErc1155.erc1155TokenId.toString()).toBe(
      ERC721_ASSET.tokenId
    );
    expect(signedOrderErc1155.erc20Token).toBe(ERC20_ASSET.tokenAddress);
    expect(signedOrderErc1155.erc20TokenAmount).toBe(ERC20_ASSET.amount);
    expect(signedOrderErc1155.direction.toString()).toBe('0');

    await nftSwapperMaker.postOrder(signedOrder, '3');
    // Uncomment to fill
    // const fillTx = await nftSwapperMaker.fillSignedOrder(signedOrder);
    // const txReceipt = await fillTx.wait();
    // console.log('ERC1155 Fill Tx', txReceipt.transactionHash);
    // expect(txReceipt.transactionHash).toBeTruthy();
    // console.log(`ERC1155<>ERC20 Swapped on Ropsten (txHAsh: ${txReceipt.transactionIndex})`);
  });
});
