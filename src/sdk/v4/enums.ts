export enum TradeDirection {
  /**
   * Sell orders are orders where direction is set to TradeDirection.SELL_NFT, which indicates that a maker wishes to sell an ERC721 token that they possess.
   */
  SellNFT = 0,
  /**
   * Buy orders are where direction is set to TradeDirection.BUY_NFT, which indicates that a maker wishes to buy an ERC721 token that they do not possess.
   */
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

/**
 * Buy orders are where direction is set to TradeDirection.BUY_NFT, which indicates that a maker wishes to buy an ERC721 token that they do not possess.
 * Sell orders are orders where direction is set to TradeDirection.SELL_NFT, which indicates that a maker wishes to sell an ERC721 token that they possess.
 */
export const DIRECTION_MAPPING: DirectionMap = {
  [TradeDirection.BuyNFT]: 'buy',
  [TradeDirection.SellNFT]: 'sell',
};
