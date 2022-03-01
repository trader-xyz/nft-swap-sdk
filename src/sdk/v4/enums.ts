export enum TradeDirection {
  SellNFT = 0,
  BuyNFT = 1,
}

export enum OrderStatusV4 {
  Invalid = 0,
  Fillable = 1,
  Unfillable = 2,
  Expired = 3,
}

export type DirectionMap = {
  [key in TradeDirection]: 'buy' | 'sell' | undefined;
};

export const DIRECTION_MAPPING: DirectionMap = {
  [TradeDirection.BuyNFT]: 'buy',
  [TradeDirection.SellNFT]: 'sell',
};
