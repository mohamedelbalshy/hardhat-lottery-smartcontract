const { assert, expect } = require("chai");
const { getNamedAccounts, deployments, ethers, network } = require("hardhat");
const {
  developmentChains,
  networkConfig,
} = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Raffle Unit Tests", async function () {
      let raffle, vrfCoordinatorV2Mock, deployer, interval;
      const { chainId } = network.config;
      const raffleEntraceFee = ethers.utils.parseEther("0.2");
      beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer;
        await deployments.fixture("all");
        raffle = await ethers.getContract("Raffle", deployer);
        vrfCoordinatorV2Mock = await ethers.getContract(
          "VRFCoordinatorV2Mock",
          deployer
        );

        interval = await raffle.getInterval();
      });

      describe("constructor", function () {
        it("init raffle correctly", async function () {
          const raffleState = await raffle.getRaffleState();

          assert.equal(raffleState.toString(), "0");
          assert.equal(interval.toString(), networkConfig[chainId].interval);
        });
      });
      describe("enterRaffle", function () {
        it("revert when you don't pay enough", async function () {
          await expect(raffle.enterRaffle()).to.be.revertedWith(
            "Raffle__NotEnoughETHEntered"
          );
        });
        it("recrods players when they enter", async function () {
          await raffle.enterRaffle({ value: raffleEntraceFee });
          const playerFromContract = await raffle.getPlayer(0);
          assert.equal(playerFromContract, deployer);
        });

        it("emits event on enter", async function () {
          await expect(raffle.enterRaffle({ value: raffleEntraceFee })).to.emit(
            raffle,
            "RaffleEnter"
          );
        });
        it("doesnt allow entrace when raffle is calculating", async function () {
          await raffle.enterRaffle({ value: raffleEntraceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          // We pretend to be chainlink keeper
          await raffle.performUpkeep([]);

          await expect(
            raffle.enterRaffle({ value: raffleEntraceFee })
          ).to.be.rejectedWith("Raffle__NotOpen");
        });
      });

      describe("checkUpkeep", function () {
        it("returns false if people haven't sent any ETH", async function () {
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);

          const { upkeedNeeded } = await raffle.callStatic.checkUpkeep([]);
          assert(!upkeedNeeded);
        });

        it("returns false if raffle is calculating ", async function () {
          await raffle.enterRaffle({ value: raffleEntraceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          await raffle.performUpkeep([]);
          const raffleState = await raffle.getRaffleState();
          const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);

          assert.equal(raffleState.toString(), "1");
          assert.equal(upkeepNeeded, false);
        });

        it("returns false if  time has not passed ", async function () {
          await raffle.enterRaffle({ value: raffleEntraceFee });
          await network.provider.send("evm_increaseTime", [0]);
          await network.provider.send("evm_mine", []);
          const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);
          assert.equal(upkeepNeeded, false);
        });

        it("returns true if raffle is open, has players, eth, time has passed ", async function () {
          await raffle.enterRaffle({ value: raffleEntraceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);
          assert.equal(upkeepNeeded, true);
        });
      });
      describe("fullfillRandomWords", function () {
        beforeEach(async function () {
          await raffle.enterRaffle({ value: raffleEntraceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
        });

        it("can only be called after performUpkeep", async function () {
          await expect(
            vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)
          ).to.be.rejectedWith("nonexistent request");

          await expect(
            vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.address)
          ).to.be.rejectedWith("nonexistent request");
        });

        it("picks a winner, reset the lottery, and sends money", async function () {
          const additionalEntrants = 3;
          const startingAccountIndex = 1;
          const accounts = await ethers.getSigners();

          for (
            let i = startingAccountIndex;
            i < startingAccountIndex + additionalEntrants;
            i++
          ) {
            const accountConnectedRaffle = await raffle.connect(accounts[i]);
            await accountConnectedRaffle.enterRaffle({
              value: raffleEntraceFee,
            });
          }
          const startingTimestamp = await raffle.getLastTimeStamp();
          // performUpkeep (mock being chainlink keeper)
          // fullfilmentRandomWords (mock being chainlink VRF)
          // we will have to wait for the fulfillRandomWords to be be called
          await new Promise(async (resolve, reject) => {
            raffle.once("WinnerPicked", async () => {
              console.log("Winner Picked");
              try {
                const recentWinner = await raffle.getRecentWinner();
                console.log("Recent Winner: ", recentWinner);
                const raffleState = await raffle.getRaffleState();
                const endingTimeStamp = await raffle.getLastTimeStamp();
                const numPlayers = await raffle.getNumberOfPlayers();
                assert.equal(numPlayers.toString(), "0");
                assert.equal(raffleState.toString(), "0");
                assert(endingTimeStamp > startingTimestamp);
              } catch (error) {
                reject(error);
              }
              resolve();
            });
            const tx = await raffle.performUpkeep("0x");
            const txReceipt = await tx.wait(1);

            await vrfCoordinatorV2Mock.fulfillRandomWords(
              txReceipt.events[1].args.requestId,
              raffle.address
            );
          });
        });
      });
    });
