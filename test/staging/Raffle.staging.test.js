const { assert, expect } = require("chai");
const { getNamedAccounts, deployments, ethers, network } = require("hardhat");
const {
  developmentChains,
  networkConfig,
} = require("../../helper-hardhat-config");

developmentChains.includes(network.name)
  ? describe.skip
  : describe("Raffle Staging Tests", async function () {
      let raffle, deployer, raffleEntraceFee;

      beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer;
        raffle = await ethers.getContract("Raffle", deployer);
        raffleEntraceFee = await raffle.getEntranceFee();
      });

      describe("fulfillRandomWords", function () {
        it("works with live chainlink keepers and chainlink VRF, we get a random winner", async function () {
          // enter raffle
          const startingTimestamp = await raffle.getLastTimeStamp();
          const accounts = await ethers.getSigners();

          await new Promise(async (resolve, reject) => {
            raffle.once("WinnerPicked", async () => {
              console.log("WinnerPicked event fired!");
              try {
                const recentWinner = await raffle.getRecentWinner();
                const raffleState = await raffle.getRaffleState();
                const winnerEndingBalance = await accounts[0].getBalance();
                const endingTimeStamp = await raffle.getLastTimeStamp();
                await expect(raffle.getPlayer(0)).to.be.reverted;
                assert.equal(recentWinner.toString(), accounts[0].address);
                assert.equal(raffleState, 0);
                assert.equal(
                  winnerEndingBalance.toString(),
                  winnerStartingBalance.add(raffleEntraceFee).toString()
                );
                assert(endingTimeStamp > startingTimestamp);
                resolve();
              } catch (e) {
                reject(e);
              }
            });

            await raffle.enterRaffle({ value: raffleEntraceFee });
            const winnerStartingBalance = await accounts[0].getBalance();
          });
        });
      });
    });
