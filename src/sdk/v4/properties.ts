import { NULL_ADDRESS } from '../../utils/eth';
import { PropertyStruct } from './types';

/**
 * Contract-based orders property validator.
 * Add this to your order's tokenProperties to make it a collection order
 */
export const CONTRACT_ORDER_VALIDATOR: PropertyStruct = {
  propertyValidator: NULL_ADDRESS,
  propertyData: [],
};
