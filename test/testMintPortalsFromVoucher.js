const { expect } = require("chai");
const { mintPortalsFromVoucher } = require("../scripts/upgrades/upgrade-mintPortalsFromVoucher.js");

const diamondAddress = "0x86935F11C86623deC8a25696E1C19a8659CbF95d";
let daoFacet, shopFacet, aavegotchiFacet, aavegotchiGameFacet, voucherContract;
let owner, account, accountAddress, tx;
const testId = 0;
const testAmount = 10;
const initialHauntSize = "10000";
const portalPrice = ethers.utils.parseEther("0.00001");

describe("Deploying Contracts", async function() {
  this.timeout(300000);

  before(async function() {
    await mintPortalsFromVoucher();

    const accounts = await ethers.getSigners();
    account = accounts[0];
    accountAddress = await account.getAddress();

    owner = await (
      await ethers.getContractAt("OwnershipFacet", diamondAddress)
    ).owner();
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [owner]
    });
    owner = await ethers.getSigner(owner);

    daoFacet = await ethers.getContractAt("DAOFacet", diamondAddress);
    shopFacet = await (await ethers.getContractAt("ShopFacet", diamondAddress)).connect(account);
    aavegotchiGameFacet = await (await ethers.getContractAt("AavegotchiGameFacet", diamondAddress)).connect(account);
    aavegotchiFacet = await (await ethers.getContractAt("contracts/Aavegotchi/facets/AavegotchiFacet.sol:AavegotchiFacet", diamondAddress)).connect(account);

    const ERC1155VoucherFactory = await ethers.getContractFactory("ERC1155Voucher");
    voucherContract = await ERC1155VoucherFactory.deploy();
    await voucherContract.deployed();
    console.log("Deployed voucher contract for test");

    tx = await (await daoFacet.connect(owner)).setVoucherContract(voucherContract.address);
    const result = await tx.wait();
    if (!result.status) {
      throw Error(`Error:: ${tx.hash}`);
    }

    tx = await (await voucherContract.setApprovalForAll(diamondAddress, true)).wait();
  });

  it("Should reject if non-owner account try to set voucher contract", async function() {
    await expect((await daoFacet.connect(account)).setVoucherContract(voucherContract.address)).to.be.revertedWith("LibDiamond: Must be contract owner");
  });

  it("Voucher Contract should mint 100 ERC1155", async function() {
    const balance = await voucherContract.balanceOf(accountAddress, testId);
    expect(balance).to.equal(ethers.utils.parseEther("100"));
  });

  it("Should reject if the account try to mint more than 20 portals", async function() {
    await expect(shopFacet.mintPortalsFromVoucher(testId, 21)).to.be.revertedWith("ShopFacet: Can't mint more than 20 at once");
  });

  it("Should reject if current haunt is 1", async function() {
    await expect(shopFacet.mintPortalsFromVoucher(testId, testAmount)).to.be.revertedWith("ShopFacet: Exceeded max number of aavegotchis for this haunt");
  });

  it("Diamond should be approved for all", async function() {
    const isApproved = await voucherContract.isApprovedForAll(accountAddress, diamondAddress);
    expect(isApproved).to.equal(true);
  });

  it("Should mint portals from voucher", async function() {
    await (await (await daoFacet.connect(owner)).createHaunt(initialHauntSize, portalPrice, "0x000000")).wait();
    const haunt = await aavegotchiGameFacet.currentHaunt();
    const currentHauntId = haunt["hauntId_"].toNumber();
    expect(currentHauntId).to.equal(2);

    const beforeBalance = await voucherContract.balanceOf(accountAddress, testId);
    const beforePortals = await aavegotchiFacet.allAavegotchisOfOwner(accountAddress);

    await (await shopFacet.mintPortalsFromVoucher(testId, testAmount)).wait();

    const afterBalance = await voucherContract.balanceOf(accountAddress, testId);
    expect(afterBalance).to.equal(beforeBalance.sub(testAmount));

    const afterPortals = await aavegotchiFacet.allAavegotchisOfOwner(accountAddress);
    expect(afterPortals.length).to.equal(beforePortals.length + testAmount);
  });
});
