import { NftSwapV4 } from '../../src/sdk/v4/NftSwapV4';

jest.setTimeout(120 * 1000);

describe('NFTSwapV4', () => {
  it('should be able to instantiate without any arguments', async () => {

    const nftSWapper = new NftSwapV4(
      undefined as any,
      undefined as any,
    );

    expect(nftSWapper).toBeTruthy()
  });
});
