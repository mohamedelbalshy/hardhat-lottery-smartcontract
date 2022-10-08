//SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;
import '@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol';
import '@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol';
import '@chainlink/contracts/src/v0.8/interfaces/AutomationCompatibleInterface.sol';
import "hardhat/console.sol";


error Raffle__NotEnoughETHEntered();
error Raffle__TransferFailed();
error Raffle__NotOpen();
error Raffle__UpKeepNotNeeded(uint256 currentBalance, uint256 numPlayers, uint256 raffleState);


/**
 * @title A Simple Raffle Contract
 * @author Mohamed Elbalshy
 * @notice This contract is for learning purpose
 * @dev This implements Chainlink VrfConsumerV2 and Chainlink Automation Keepers
 */
contract Raffle is VRFConsumerBaseV2, AutomationCompatibleInterface{


    enum RaffleState {
        OPEN,
        CALCULATING
    }
    uint256 private immutable i_entranceFee;
    address payable [] private s_players;
    uint64 private immutable i_subscriptionId;
    uint256 private s_lastTimeStamp;
    bytes32 private immutable i_keyHash;
    uint32 private immutable i_callbackGasLimit;
    
    VRFCoordinatorV2Interface private  s_vrfCoordinatorV2;
    uint256 private immutable i_interval;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 3;

    // Lottery Variables
    address private s_recentWinner;
    RaffleState private s_raffleState;

    /* Events */
    event RaffleEnter(address indexed player);
    event RequestedRaffleWinner(uint256 indexed requestId);
    event WinnerPicked(address indexed winner);

    constructor(address vrfCoordinatorV2, bytes32 keyHash, uint64 subscriptionId, uint32 gasLimit, uint256 entranceFee, uint256 interval) VRFConsumerBaseV2(vrfCoordinatorV2)  public {
            i_entranceFee = entranceFee;
            i_keyHash = keyHash;
            i_callbackGasLimit = gasLimit;
            s_vrfCoordinatorV2 = VRFCoordinatorV2Interface(vrfCoordinatorV2);
            s_raffleState = RaffleState.OPEN;
            i_interval = interval;
            s_lastTimeStamp = block.timestamp;
            i_subscriptionId = subscriptionId;
    }

    function enterRaffle () public payable{
        if(msg.value < i_entranceFee){
            revert Raffle__NotEnoughETHEntered();
        }
        if(s_raffleState != RaffleState.OPEN){
            revert Raffle__NotOpen();
        }
        s_players.push(payable (msg.sender));
        // Events
        emit RaffleEnter(msg.sender);
    }

    function getEntranceFee() public view returns (uint256){
        return i_entranceFee;
    }

    function getPlayer(uint256 index) public view returns(address) {
        return s_players[index];
    }

  

      function checkUpkeep(
        bytes memory /* checkData */
    ) public override returns (bool upkeepNeeded, bytes memory /*performData*/) {
        bool isOpen = (RaffleState.OPEN == s_raffleState);
        bool timePassed = ((block.timestamp - s_lastTimeStamp) > i_interval);
        bool hasPlayers = (s_players.length > 0);
        bool hasBalance = address(this).balance > 0;
        upkeepNeeded = (isOpen && timePassed && hasBalance && hasPlayers);
    }
   

    function performUpkeep(bytes calldata /*performData*/) external  override {

        (bool upkeepNeeded, ) = checkUpkeep("");
        if(!upkeepNeeded){
            revert Raffle__UpKeepNotNeeded(address(this).balance, s_players.length, uint256(s_raffleState)); 
        }
        s_raffleState = RaffleState.CALCULATING;
        uint256 requestId = s_vrfCoordinatorV2.requestRandomWords(
            i_keyHash,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );
        
        emit RequestedRaffleWinner(requestId);
    }

    function fulfillRandomWords(uint256 /*_requestId*/, uint256[] memory _randomWords) internal override {
        uint256 indexOfWinner = _randomWords[0] % s_players.length;
        address payable recentWinner = s_players[indexOfWinner];
        s_recentWinner = recentWinner;
        s_raffleState = RaffleState.OPEN;
        s_players = new  address payable[](0);
        s_lastTimeStamp = block.timestamp;
        (bool success, ) = recentWinner.call{value: address(this).balance}("");
        if(!success){
            revert Raffle__TransferFailed();
        }
        emit WinnerPicked(recentWinner);

    }

    function getRecentWinner() public view returns(address){
        return s_recentWinner;
    }

    function getRaffleState() public view returns(RaffleState){
        return s_raffleState;
    }
    
    function getNumWords() public pure returns (uint256){
        return NUM_WORDS;
    }
    function getNumberOfPlayers() public view returns(uint256){
        return s_players.length;
    }

    function getLastTimeStamp() public view returns(uint256){
        return s_lastTimeStamp;
    }

    function getRequestConfirmations() public pure returns(uint256){
        return REQUEST_CONFIRMATIONS;
    }
    function getInterval() public view returns(uint256){
        return i_interval;
    }
}
