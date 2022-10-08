const { run } = require("hardhat");

async function verify(contractAddress, args) {
  console.log("verifying contract");
  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: args,
    });
    console.log("contract verified");
  } catch (error) {
    if (error.message.includes("already verified")) {
      console.log("Contract already verified");
    } else {
      console.log(error);
    }
  }
}

module.exports = { verify };
