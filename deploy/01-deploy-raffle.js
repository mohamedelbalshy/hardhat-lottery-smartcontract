const { network, ethers } = require("hardhat");
const {
  developmentChains,
  networkConfig,
} = require("../helper-hardhat-config");
const { verify } = require("../utils/verify");

const FUND_AMOUNT = ethers.utils.parseEther("30"); // 1 ETH or 1^18

module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;
  let vrfCoordinatorV2Address, subscriptionId, vrfCoordinatorV2Mock;

  if (chainId == 31337) {
    // create VRFV2 Subscription
    vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
    vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address;
    const transactionResponse = await vrfCoordinatorV2Mock.createSubscription();
    const transactionReceipt = await transactionResponse.wait();
    subscriptionId = transactionReceipt.events[0].args.subId;

    // Fund the subscription
    // Our mock makes it so we don't actually have to worry about sending fund
    await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT);
  } else {
    vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"];
    subscriptionId = networkConfig[chainId]["subscriptionId"];
  }
  const entranceFee = networkConfig[chainId].entranceFee;
  const keyHash = networkConfig[chainId].keyHash;
  const callbackGasLimit = networkConfig[chainId].callbackGasLimit;
  const interval = networkConfig[chainId].interval;

  const args = [
    vrfCoordinatorV2Address,
    keyHash,
    subscriptionId,
    callbackGasLimit,
    entranceFee,
    interval,
  ];
  const raffle = await deploy("Raffle", {
    from: deployer,
    args,
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  });
  if (chainId == 31337) {
    await vrfCoordinatorV2Mock.addConsumer(
      subscriptionId.toNumber(),
      raffle.address
    );
  }
  log("Raffle Deployed");
  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    log("verifying.....");
    await verify(raffle.address, args);
  }
  log("---------------------------------");
};

module.exports.tags = ["all", "raffle"];
