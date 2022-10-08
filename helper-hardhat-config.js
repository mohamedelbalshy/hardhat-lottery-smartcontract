const { ethers } = require("hardhat");

const networkConfig = {
  1: {
    name: "mainnet",
    vrfCoordinatorV2: "0x271682DEB8C4E0901D1a1550aD2e64D568E69909",
    keyHash:
      "0x8af398995b04c28e9951adb9721ef74c74f93e6a478f39e7e0777be13527e7ef",
    entranceFee: ethers.utils.parseEther("0.1"),

    callbackGasLimit: 100000,
  },
  5: {
    name: "goerli",
    vrfCoordinatorV2: "0x2ca8e0c643bde4c2e08ab1fa0da3401adad7734d",
    keyHash:
      "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
    entranceFee: ethers.utils.parseEther("0.1"),
    subscriptionId: "3531",
    callbackGasLimit: "500000",
    interval: "30",
  },
  31337: {
    name: "hardhat",
    vrfCoordinatorV2: "0x2ca8e0c643bde4c2e08ab1fa0da3401adad7734d",
    keyHash:
      "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
    entranceFee: ethers.utils.parseEther("0.1"),
    callbackGasLimit: "500000",
    interval: "30",
  },
};

const developmentChains = ["hardhat", "localhost"];

module.exports = {
  networkConfig,
  developmentChains,
};
