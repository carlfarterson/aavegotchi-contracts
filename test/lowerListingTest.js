const { expect } = require('chai');
const { erc721LowerPrice } = require('../scripts/upgrades/upgrade-LowerListingPrice.js');

describe('ERC721 Lower Listing Price', async function() {
  this.timeout(300000);

  let erc721Facet,
      erc1155Facet,
      aavegotchiDiamondAddress,
      ghstERC20,
      maticGhstAddress,
      aavegotchiSeller,
      erc1155Seller,
      ghstWhale,
      owner,
      owner1155,
      buyer;


  before(async function (){
    aavegotchiDiamondAddress = '0x86935F11C86623deC8a25696E1C19a8659CbF95d';
    ghstWhale = '0xBC67F26c2b87e16e304218459D2BB60Dac5C80bC';
    maticGhstAddress = '0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7';
    aavegotchiSeller = '0x10bFc18F848AdB42fe95e330111622D949743177';
    erc1155Seller = '0xA1B9F1AF06134A93FB474E38726D92d171047c07';

    await erc721LowerPrice();

    owner = await ethers.getSigner(aavegotchiSeller);

    erc721Facet = await ethers.getContractAt('ERC721MarketplaceFacet', aavegotchiDiamondAddress, owner);
    erc1155Facet = await ethers.getContractAt('ERC1155MarketplaceFacet', aavegotchiDiamondAddress, owner);
    ghstERC20 = await ethers.getContractAt('ERC20Token', maticGhstAddress, owner);
  });

  it.only('Should permit the lowering of a ERC721 listing without charging a listingFeeInWei', async function() {
    await hre.network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [aavegotchiSeller]
    });

    let beforeOwnerBalance = await ghstERC20.balanceOf(aavegotchiSeller);
    console.log("Owner Before Balance: ", beforeOwnerBalance.toString());
    // console.log("Hello");

    let beforeListingInfo = await erc721Facet.getERC721Listing(80257);
    console.log("Listing Info: ", beforeListingInfo.priceInWei.toString());

    //need to convert pricing to wei
    let lowerPrice = ethers.utils.parseEther("200");
    await erc721Facet.lowerERC721ListingPrice(80257, lowerPrice);

    let afterOwnerBalance = await ghstERC20.balanceOf(aavegotchiSeller);
    console.log("Owner After Balance:  ", afterOwnerBalance.toString());

    expect(beforeOwnerBalance.toString()).to.equal(afterOwnerBalance.toString());

    let afterListingInfo = await erc721Facet.getERC721Listing(80257);
    console.log("Listing Info: ", afterListingInfo.priceInWei.toString());

    expect(lowerPrice).to.equal(afterListingInfo.priceInWei.toString());
  });

  it.only('Should permit the lowering of a ERC1155 listing without charging a listingFeeInWei', async function() {
    await hre.network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [aavegotchiSeller]
    });

    const erc1155Listings = await erc1155Facet.getERC1155Listings(0, 'listed', 10);
    const erc1155Listing = erc1155Listings[0].listingId.toString();
    console.log("Seller Address: ", erc1155Listings[0].seller);
    console.log("Seller Listing ID: ", erc1155Listing);

    let beforeOwnerBalance = await ghstERC20.balanceOf(erc1155Listings[0].seller);

    await hre.network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [erc1155Listings[0].seller]
    });

    owner1155 = await ethers.getSigner(erc1155Listings[0].seller);
    erc1155Facet = await ethers.getContractAt('ERC1155MarketplaceFacet', aavegotchiDiamondAddress, owner1155);

    let notLowerPrice = ethers.utils.parseEther("5000");
    await expect(erc1155Facet.lowerERC1155ListingPrice(erc1155Listing, notLowerPrice.toString())).to.be.revertedWith("ERC1155Marketplace: lowerPrice must be less than current price of listing");
    await expect(erc1155Facet.lowerERC1155ListingPrice(erc1155Listing, 3)).to.be.revertedWith("ERC1155Marketplace: price should be 1 GHST or larger");

    let lowerPrice = ethers.utils.parseEther("5");
    console.log("ERC1155 Prev Price:  ", erc1155Listings[0].priceInWei.toString());
    console.log("ERC1155 Lower Price: ", lowerPrice.toString());

    await erc1155Facet.lowerERC1155ListingPrice(erc1155Listing, lowerPrice);
    let updatedListings = await erc1155Facet.getERC1155Listings(0, 'listed', 10);
    console.log("New Price: ", updatedListings[0].priceInWei.toString());

    let afterOwnerBalance = await ghstERC20.balanceOf(erc1155Listings[0].seller);

    expect(beforeOwnerBalance.toString()).to.equal(afterOwnerBalance.toString());
    expect(lowerPrice.toString()).to.equal(updatedListings[0].priceInWei.toString());

    let newLowerPrice = ethers.utils.parseEther("3");

    await hre.network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [erc1155Listings[0].seller]
    });

    let diffERC1155Facet = await ethers.getContractAt('ERC1155MarketplaceFacet', aavegotchiDiamondAddress, owner);

    await expect(diffERC1155Facet.lowerERC1155ListingPrice(erc1155Listings[1].listingId.toString(), newLowerPrice)).to.be.revertedWith("ERC1155Marketplace: owner not seller");
  });
});
