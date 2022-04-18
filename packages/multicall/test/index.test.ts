import { JsonRpcProvider } from '@ethersproject/providers';
import { expect } from 'chai';
import { multicall } from '../src';

describe('Multicall', () => {
  it('should query', async () => {
    const provider = new JsonRpcProvider('https://kovan.poa.network');
    const [[supply]] = await multicall(
      provider,
      '0xb29deF37F107E036B3DD3174998151c985569cAe',
      [
        {
          target: '0xf3a6679b266899042276804930b3bfbaf807f15b',
          signature: 'totalSupply() returns (uint256)',
        },
      ]
    );

    console.log(supply.toString());

    expect(supply.gt(0)).to.be.true;
  });
});
