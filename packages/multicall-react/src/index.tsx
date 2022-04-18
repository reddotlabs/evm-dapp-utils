import React, { ReactNode } from 'react';
import { JsonRpcProvider } from '@ethersproject/providers';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { QueuedMulticall } from './queued-multicall';
import { Call } from '@reddotlabs/multicall';
export { QueuedMulticall } from './queued-multicall';

const Context = createContext<QueuedMulticall>(null as any);

export const QueuedMulticallProvider: React.FC<{
  rpcProvider: JsonRpcProvider | null | undefined;
  multicallAddress: string;
  children: ReactNode;
}> = ({ children, rpcProvider, multicallAddress }) => {
  const [queue, setQueue] = useState<QueuedMulticall>(null as any);

  useEffect(() => {
    if (!rpcProvider) {
      return;
    }

    const v = new QueuedMulticall(rpcProvider, multicallAddress);
    setQueue(v);

    return () => {
      v.dispose();
    };
  }, [rpcProvider]);

  useEffect(() => {
    (window as any).__multicall = queue;
  }, [queue]);

  return <Context.Provider value={queue}>{children}</Context.Provider>;
};

export const useMulticallQueue = () => useContext(Context);

export const useMulticall = () => {
  const queue = useContext(Context);
  const invoke = useCallback(
    (calls: Call[]) => {
      return queue?.enqueue(calls);
    },
    [queue]
  );

  return queue ? invoke : null;
};
