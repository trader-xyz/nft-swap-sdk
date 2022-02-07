import { ethers } from 'hardhat';
import { Signer } from 'ethers';
import { expect } from 'chai';
describe('Token', function () {
  let accounts: Signer[];

  beforeEach(async function () {
    accounts = await ethers.getSigners();
  });

  it('should do something right', async function () {
    // Do something with the accounts
    const addy = await accounts[0].getAddress();
    expect(addy.toLowerCase()).equal(
      '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'.toLowerCase()
    );
  });
});
