import { SupportedChainIds } from '../sdk/types';

const DEFAUTLT_GAS_BUFFER_MULTIPLES: { [chainId: number]: number } = {
  [SupportedChainIds.Polygon]: 1.5,
  [SupportedChainIds.PolygonMumbai]: 1.5,
  [SupportedChainIds.Kovan]: 1.5,
};

export { DEFAUTLT_GAS_BUFFER_MULTIPLES };
