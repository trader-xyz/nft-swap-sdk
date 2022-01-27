import { SupportedChainIds } from '../../sdk/v3/types';

const DEFAUTLT_GAS_BUFFER_MULTIPLES: { [chainId: number]: number } = {
  [SupportedChainIds.Polygon]: 1.5,
  [SupportedChainIds.PolygonMumbai]: 1.5,
  [SupportedChainIds.Kovan]: 1.5,
};

export { DEFAUTLT_GAS_BUFFER_MULTIPLES };
