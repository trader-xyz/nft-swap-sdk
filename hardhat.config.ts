// import "hardhat-jest-plugin";
// require("hardhat-jest-plugin");
// import { task } from "hardhat/config";
import '@nomiclabs/hardhat-waffle';
// require("@nomiclabs/hardhat-waffle");

/**
 * @type import('hardhat/config').HardhatUserConfig
 */

module.exports = {
  solidity: '0.7.3',
  networks: {
    hardhat: {
      forking: {
        url: 'https://eth-ropsten.alchemyapi.io/v2/is1WqyAFM1nNFFx2aCozhTep7IxHVNGo',
      },
    },
  },
};
