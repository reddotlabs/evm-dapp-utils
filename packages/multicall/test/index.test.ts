import { JsonRpcProvider } from '@ethersproject/providers';
import { defaultAbiCoder } from '@ethersproject/abi';
import { expect } from 'chai';
import { multicall } from '../src';

const requests = [];
let mockResponse: any;
const provider = {
  send: (method: string, params: any) => {
    requests.push({ method, params });
    return Promise.resolve(mockResponse);
  },
} as JsonRpcProvider;
const multicallAddress = '0x5ACc2D6F034EC3E05EA9A8085c847662F3774Cef';

const mock = (result: string) => {
  mockResponse = result;
};

describe('Multicall', () => {
  it('should send', async () => {
    mock(defaultAbiCoder.encode(['uint256'], ['10000']));

    const [[res]] = await multicall(provider, multicallAddress, [
      {
        target: '0x5ACc2D6F034EC3E05EA9A8085c847662F3774Cef',
        signature: 'balanceOf() returns(uint256)',
      },
    ]);

    expect(res.toString()).equal('10000');
  });

  it.only('should query block tag', async () => {
    const provider = new JsonRpcProvider('https://rpc.ankr.com/fantom');
    const [[supply]] = await multicall(
      provider,
      '0xbBd86C5C617C73346EFb506ea7bE650B2A83a800',
      [
        {
          target: '0x04068da6c83afcfa0e13ba15a6696662335d5b75',
          signature: 'totalSupply() returns (uint256)',
        },
      ],
      {
        blockTag: 3150600,
      }
    );

    expect(supply.gt(0)).to.be.true;
  });
});
