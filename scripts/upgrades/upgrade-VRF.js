/* global ethers hre */
/* eslint prefer-const: "off" */

const { LedgerSigner } = require("@ethersproject/hardware-wallets");
const { sendToMultisig } = require("../libraries/multisig/multisig.js");

function getSelectors(contract) {
  const signatures = Object.keys(contract.interface.functions);
  const selectors = signatures.reduce((acc, val) => {
    if (val !== "init(bytes)") {
      acc.push(contract.interface.getSighash(val));
    }
    return acc;
  }, []);
  return selectors;
}

async function main() {
  const diamondAddress = "0x86935F11C86623deC8a25696E1C19a8659CbF95d";
  let signer;
  let facet;
  let owner = await (
    await ethers.getContractAt("OwnershipFacet", diamondAddress)
  ).owner();
  const testing = ["hardhat", "localhost"].includes(hre.network.name);
  if (testing) {
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [owner],
    });
    signer = await ethers.getSigner(owner);
  } else if (hre.network.name === "matic") {
    signer = new LedgerSigner(ethers.provider);
  } else {
    throw Error("Incorrect network selected");
  }

  console.log("Deploying facets");

  const gameFacet = await ethers.getContractFactory("AavegotchiGameFacet");
  let deployedGameFacet = await gameFacet.deploy();
  await deployedGameFacet.deployed();
  console.log("Deployed facet:", deployedGameFacet.address);

  let existingGameFuncs = getSelectors(deployedGameFacet);

  const FacetCutAction = { Add: 0, Replace: 1, Remove: 2 };

  const cut = [
    {
      facetAddress: deployedGameFacet.address,
      action: FacetCutAction.Replace,
      functionSelectors: existingGameFuncs,
    },
  ];

  if (testing) {
    const vrfFacet = await ethers.getContractFactory("VrfFacet");
    facet = await vrfFacet.deploy();
    await facet.deployed();
    console.log("Deployed facet:", facet.address);
    let existingVrfFuncs = getSelectors(facet);
    cut.push({
      facetAddress: facet.address,
      action: FacetCutAction.Replace,
      functionSelectors: existingVrfFuncs,
    });
  }

  console.log(cut);

  const diamondCut = (
    await ethers.getContractAt("IDiamondCut", diamondAddress)
  ).connect(signer);

  if (testing) {
    const tx = await diamondCut.diamondCut(
      cut,
      ethers.constants.AddressZero,
      "0x"
    );
    console.log("Diamond cut tx:", tx.hash);
    const receipt = await tx.wait();
    if (!receipt.status) {
      throw Error(`Diamond upgrade failed: ${tx.hash}`);
    }
  } else {
    tx = await diamondCut.populateTransaction.diamondCut(
      cut,
      ethers.constants.AddressZero,
      "0x",
      { gasLimit: 800000, gasPrice: 5000000000 }
    );
    console.log("tx:", tx);

    //verify facet
    await run("verifyFacet", {
      apikey: process.env.POLYGON_API_KEY,
      contract: deployedGameFacet.address,
      facet: "AavegotchiGameFacet",
    });

    await sendToMultisig(process.env.DIAMOND_UPGRADER, signer, tx);
    console.log("Sent to multisig");
  }
}

main()
  .then(() => console.log("Upgrade complete!"))
  .catch((error) => {
    console.error(error);
  });

exports.VRFUpgrade = main;
