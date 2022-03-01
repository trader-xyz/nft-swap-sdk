import { SupportedChainIdsV3 } from '../../sdk/v3/types';

const DEFAUTLT_GAS_BUFFER_MULTIPLES: { [chainId: number]: number } = {
  [SupportedChainIdsV3.Polygon]: 1.5,
  [SupportedChainIdsV3.PolygonMumbai]: 1.5,
  [SupportedChainIdsV3.Kovan]: 1.5,
};

export { DEFAUTLT_GAS_BUFFER_MULTIPLES };
