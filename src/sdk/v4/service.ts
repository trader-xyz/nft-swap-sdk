import { WebSocketProvider } from '@ethersproject/providers';
import { IZeroEx__factory } from '../../contracts';

const wsRpcUrl =
  'wss://eth-ropsten.alchemyapi.io/v2/VuZFpCVovv9O7loDSu37v5HeRuyN-8gJ';

const zeroExContractAddress = '0xdef1c0ded9bec7f1a1670819833240f027b25eff';

const wsProvider = new WebSocketProvider(wsRpcUrl);

const startAsync = async () => {
  const zeroExContract = IZeroEx__factory.connect(
    zeroExContractAddress,
    wsProvider
  );

  const topics: Array<string | string[]> = [
    ...(zeroExContract.filters.ERC721OrderFilled().topics ?? []),
    ...(zeroExContract.filters.ERC1155OrderFilled().topics ?? []),
    ...(zeroExContract.filters.ERC721OrderCancelled().topics ?? []),
    ...(zeroExContract.filters.ERC1155OrderCancelled().topics ?? []),
  ];

  wsProvider.on(zeroExContract.filters.ERC721OrderFilled(), (e) => {
    console.log('ERC721OrderFilled:e', e);
  });

  wsProvider.on(zeroExContract.filters.ERC1155OrderFilled(), (e) => {
    console.log('ERC1155OrderFilled:e', e);
  });

  wsProvider.on(zeroExContract.filters.ERC721OrderCancelled(), (e) => {
    console.log('ERC721OrderCancelled:e', e);
  });

  wsProvider.on(zeroExContract.filters.ERC1155OrderCancelled(), (e) => {
    console.log('ERC1155OrderCancelled:e', e);
  });

  const logs = await wsProvider.getLogs({
    toBlock: '',
    fromBlock: '',
    topics: topics,
  });
};

export { startAsync };
