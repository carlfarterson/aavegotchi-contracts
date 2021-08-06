const { LedgerSigner } = require("@ethersproject/hardware-wallets");
async function main() {
  const aavegotchiDiamondAddress = "0x86935F11C86623deC8a25696E1C19a8659CbF95d";
  const Reinhardt = "0x69aC8b337794dAD862C691b00ccc3a89F1F3293d"; //kindly reconfirm
  let signer, tx;
  const owner = await (
    await ethers.getContractAt("OwnershipFacet", aavegotchiDiamondAddress)
  ).owner();
  console.log(owner);
  const testing = ["hardhat", "localhost"].includes(hre.network.name);
  if (testing) {
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [owner],
    });

    signer = await ethers.provider.getSigner(owner);
  } else if (hre.network.name === "matic") {
    signer = new LedgerSigner(ethers.provider);
  } else {
    throw Error("Incorrect network selected");
  }
  const Aagents = [57, 58, 59];
  const itemsTransferFacet = (
    await ethers.getContractAt("ItemsTransferFacet", aavegotchiDiamondAddress)
  ).connect(signer);

  tx = await itemsTransferFacet.safeBatchTransferFrom(
    aavegotchiDiamondAddress,
    Reinhardt,
    Aagents,
    [1, 1, 1],
    "0x00"
  );
  console.log(tx);
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
