import { SupportedChainIds } from '../sdk/types';

const DEFAUTLT_GAS_BUFFER_MULTIPLES: { [chainId: number]: number } = {
  [SupportedChainIds.Polygon]: 2,
  [SupportedChainIds.PolygonMumbai]: 2,
  [SupportedChainIds.Kovan]: 2,
};

export { DEFAUTLT_GAS_BUFFER_MULTIPLES };
