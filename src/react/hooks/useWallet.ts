import { useContext } from 'react';
import { SwapSdkContext } from '../providers/swapSdkProvider';

export const useWallet = () => {
  const {
    provider,
    signer,
    network,
    chainId,
    account,
    balance,
    connectWallet,
    disconnectWallet,
  } = useContext(SwapSdkContext);

  return {
    provider,
    signer,
    network,
    chainId,
    account,
    balance,
    connectWallet,
    disconnectWallet,
  };
};
