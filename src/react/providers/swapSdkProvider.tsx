import type { JsonRpcSigner } from '@ethersproject/providers';
import { ethers } from 'ethers';
import { createContext, ReactNode, useEffect, useState } from 'react';
import { NftSwapV4 } from '../../sdk';

declare global {
  interface Window {
    ethereum: any;
  }
}

export interface ISwapSdkConfig {
  reloadOnNetworkChange?: boolean;
  rerenderOnNetworkChange?: boolean;
  reloadOnAccountChange?: boolean;
  rerenderOnAccountChange?: boolean;
}

interface ISwapSdkContext {
  nftSwap?: NftSwapV4;

  provider?: ethers.providers.Web3Provider;
  signer?: JsonRpcSigner;
  network?: ethers.providers.Network;
  chainId?: number;
  account?: string;
  balance?: ethers.BigNumber;

  connectWallet?: () => Promise<void>;
  disconnectWallet?: () => void;
}

const INITIAL_VALUE = {
  nftSwap: undefined,

  provider: undefined,
  signer: undefined,
  network: undefined,
  chainId: undefined,
  account: undefined,
  balance: undefined,

  connectWallet: undefined,
  disconnectWallet: undefined,
};

export const SwapSdkContext = createContext<ISwapSdkContext>(INITIAL_VALUE);

interface ISwapSdkProviderProps {
  config?: ISwapSdkConfig;
  children?: ReactNode;
}

export const SwapSdkProvider = (props: ISwapSdkProviderProps) => {
  const { config, children } = props;

  const [nftSwap, setNftSwap] = useState<NftSwapV4 | undefined>(
    INITIAL_VALUE.nftSwap
  );

  const [provider, setProvider] = useState<
    ethers.providers.Web3Provider | undefined
  >(INITIAL_VALUE.provider);
  const [signer, setSigner] = useState<JsonRpcSigner | undefined>(
    INITIAL_VALUE.signer
  );
  const [network, setNetwork] = useState<ethers.providers.Network | undefined>(
    INITIAL_VALUE.network
  );
  const [chainId, setChainId] = useState<number | undefined>(
    INITIAL_VALUE.chainId
  );
  const [account, setAccount] = useState<string | undefined>(
    INITIAL_VALUE.account
  );
  const [balance, setBalance] = useState<ethers.BigNumber | undefined>(
    INITIAL_VALUE.balance
  );

  const [rerender, setRerender] = useState(false);

  /** Connect browser wallet to dapp */
  const connectWallet = async () => {
    if (!window) throw new Error('Window is undefined');

    const web3Provider = new ethers.providers.Web3Provider(
      window.ethereum,
      'any'
    );
    await web3Provider.send('eth_requestAccounts', []);
    setProvider(web3Provider);

    const web3Signer = web3Provider.getSigner();
    setSigner(web3Signer);

    const web3WalletAddress = await web3Signer.getAddress();
    setAccount(web3WalletAddress);

    const web3WalletBalance = await web3Signer.getBalance();
    setBalance(web3WalletBalance);

    const web3Network = web3Provider.network;
    setNetwork(web3Network);

    const web3ChainId = await web3Signer.getChainId();
    setChainId(web3ChainId);
  };

  /** Disconnect browser wallet from dapp */
  const disconnectWallet = () => {
    setProvider(undefined);
    setSigner(undefined);
    setAccount(undefined);
    setBalance(undefined);
    setNetwork(undefined);
    setChainId(undefined);
    setNftSwap(undefined);
  };

  /* Create Swap SDK instance */
  useEffect(() => {
    if (!provider) {
      console.warn('Swap SDK init: provider is undefined');
      return;
    }
    if (!signer) {
      console.warn('Swap SDK init: signer is undefined');
      return;
    }
    if (!account) {
      console.warn('Swap SDK init: wallet address is undefined');
      return;
    }

    const nftSwapInstance = new NftSwapV4(provider, signer, chainId);
    setNftSwap(nftSwapInstance);
  }, [provider, signer, chainId, account, rerender]);

  /* Subscribe on network change event */
  useEffect(() => {
    if (!provider) {
      console.warn('Network change event handler: provider is undefined');
      return;
    }

    provider.on('network', (newNetwork: any, oldNetwork: any) => {
      if (!oldNetwork) return;

      setNetwork(newNetwork);

      if (!config) return;

      if (config.reloadOnNetworkChange) {
        window.location.reload();
      }
      if (config.rerenderOnNetworkChange) {
        setRerender((prev) => !prev);
      }
    });
  }, [provider]);

  /* Subscribe on account change event */
  useEffect(() => {
    if (!provider) {
      console.warn('Account change event handler: provider is undefined');
      return;
    }

    window.ethereum.on('accountsChanged', (accounts: string[]) => {
      const newAccount = accounts[0];
      if (!newAccount) {
        disconnectWallet();
        return;
      }

      if (newAccount === account) {
        return;
      }

      setAccount(newAccount);

      if (!config) return;

      if (config.reloadOnAccountChange) {
        window.location.reload();
      }
      if (config.rerenderOnAccountChange) {
        setRerender((prev) => !prev);
      }
    });
  }, [provider]);

  /* Subscribe on disconnect wallet event */
  useEffect(() => {
    if (!provider) {
      console.warn('Disconnect event handler: provider is undefined');
      return;
    }

    window.ethereum.on('disconnect', () => disconnectWallet());
  }, [provider]);

  /** Defined values for context provider */
  const swapSdkProviderValue: ISwapSdkContext = {
    nftSwap,

    provider,
    signer,
    network,
    chainId,
    account,
    balance,

    connectWallet,
    disconnectWallet,
  };

  return (
    <SwapSdkContext.Provider value={swapSdkProviderValue}>
      {children}
    </SwapSdkContext.Provider>
  );
};
