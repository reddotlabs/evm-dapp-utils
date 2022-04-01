import { Interface, JsonFragment, Fragment } from '@ethersproject/abi';
import { Contract } from '@ethersproject/contracts';
import { JsonRpcProvider } from '@ethersproject/providers';
import pLimit from 'p-limit';

const MulticallAbi = [
  {
    inputs: [
      {
        components: [
          { internalType: 'address', name: 'target', type: 'address' },
          { internalType: 'bytes', name: 'callData', type: 'bytes' },
        ],
        internalType: 'struct Multicall.Call[]',
        name: 'calls',
        type: 'tuple[]',
      },
    ],
    name: 'aggregate',
    outputs: [
      { internalType: 'uint256', name: 'blockNumber', type: 'uint256' },
      { internalType: 'bytes[]', name: 'returnData', type: 'bytes[]' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'blockNumber', type: 'uint256' }],
    name: 'getBlockHash',
    outputs: [{ internalType: 'bytes32', name: 'blockHash', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getCurrentBlockCoinbase',
    outputs: [{ internalType: 'address', name: 'coinbase', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getCurrentBlockDifficulty',
    outputs: [{ internalType: 'uint256', name: 'difficulty', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getCurrentBlockGasLimit',
    outputs: [{ internalType: 'uint256', name: 'gaslimit', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getCurrentBlockTimestamp',
    outputs: [{ internalType: 'uint256', name: 'timestamp', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'addr', type: 'address' }],
    name: 'getEthBalance',
    outputs: [{ internalType: 'uint256', name: 'balance', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getLastBlockHash',
    outputs: [{ internalType: 'bytes32', name: 'blockHash', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
];

export type Call = {
  contract?: Contract;
  method?: string;
  target?: string;
  signature?: string;
  abi?: JsonFragment | Fragment;
  params?: any[];
};

const encodeCallData = (call: Call) => {
  const iface = call.contract
    ? call.contract.interface
    : call.abi
    ? new Interface([call.abi])
    : new Interface([`function ${call.signature}`]);
  const fragment = iface.fragments[0];
  const method = call.method || fragment.name;
  const callData = iface.encodeFunctionData(method, call.params || []);
  return callData;
};

export interface CallResult extends Array<any> {
  [x: string]: any;
}

const decodeReturnData = (call: Call, data: any) => {
  const iface = call.contract
    ? call.contract.interface
    : call.abi
    ? new Interface([call.abi])
    : new Interface([`function ${call.signature}`]);
  const fragment = iface.fragments[0];
  const method = call.method || fragment.name;
  try {
    const result = iface.decodeFunctionResult(method, data);
    return result as CallResult;
  } catch (e) {
    console.warn('Can not decode result of call', {
      address: call.target || call.contract?.address,
      method: call.signature || call.method,
    });

    return [];
  }
};

const multicallInterface = new Interface(MulticallAbi);

export const multicall = async (
  provider: JsonRpcProvider,
  multicallAddress: string,
  calls: Call[],
  options?: { blockTag: number }
): Promise<CallResult[]> => {
  if (!calls || !calls.length) {
    return [];
  }

  const blockTag =
    options?.blockTag == null ? 'latest' : '0x' + options.blockTag.toString(16);
  try {
    const callData = calls.map(call => {
      return [call.target || call.contract?.address, encodeCallData(call)] as [
        string,
        string
      ];
    });

    let returnData: any;
    try {
      const aggregateData = multicallInterface.encodeFunctionData('aggregate', [
        callData,
      ]);

      const response = await provider.send('eth_call', [
        {
          to: multicallAddress,
          data: aggregateData,
        },
        blockTag,
      ]);
      returnData = multicallInterface.decodeFunctionResult(
        'aggregate',
        response
      ).returnData;
    } catch (e) {
      console.warn('Multicall failed. Switch to single mode', e);
      returnData = await singleCall(provider, callData, blockTag);
    }

    return calls.map((call, index) => {
      const data = returnData[index];
      if (!data) {
        console.warn('The call ', call, 'failed and return null data');
        return [];
      } else {
        return decodeReturnData(call, returnData[index]);
      }
    });
  } catch (e) {
    console.warn('Multicall error', e);
    throw new Error('Multicall failed');
  }
};

const limit = pLimit(4);

const singleCall = async (
  provider: JsonRpcProvider,
  calls: [string, string][],
  blockTag: string
) => {
  const queries = calls.map(([target, callData]) =>
    limit(() =>
      provider
        .send('eth_call', [
          {
            to: target,
            data: callData,
          },
          blockTag,
        ])
        .catch(e => {
          console.debug('Call failed', e, target);
          return null;
        })
    )
  );
  return await Promise.all(queries);
};
