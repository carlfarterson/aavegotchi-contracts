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
      ghstWhale,
      owner,
      buyer;


  before(async function (){
    aavegotchiDiamondAddress = '0x86935F11C86623deC8a25696E1C19a8659CbF95d';
    ghstWhale = '0xBC67F26c2b87e16e304218459D2BB60Dac5C80bC';
    maticGhstAddress = '0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7';
    aavegotchiSeller = '0x10bFc18F848AdB42fe95e330111622D949743177';

    await erc721LowerPrice();

    owner = await ethers.getSigner(aavegotchiSeller);

    erc721Facet = await ethers.getContractAt('ERC721MarketplaceFacet', aavegotchiDiamondAddress, owner);
    erc1155Facet = await ethers.getContractAt('ERC1155MarketplaceFacet', aavegotchiDiamondAddress, owner);
    ghstERC20 = await ethers.getContractAt('ERC20Token', maticGhstAddress, owner);

    await hre.network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [aavegotchiSeller]
    });
  });

  it.only('Should permit the lowering of a ERC721 listing without charging a listingFeeInWei', async function (){
    let beforeOwnerBalance = await ghstERC20.balanceOf(aavegotchiSeller);
    console.log("Owner Before Balance: ", beforeOwnerBalance.toString());
    // console.log("Hello");

    let beforeListingInfo = await erc721Facet.getERC721Listing(80257);
    console.log("Listing Info: ", beforeListingInfo.priceInWei.toString());

    //need to convert pricing to wei
    let lowerPrice = ethers.utils.parseEther("200");
    await erc721Facet.lowerERC721ListingPrice(80257, lowerPrice );

    let afterOwnerBalance = await ghstERC20.balanceOf(aavegotchiSeller);
    console.log("Owner After Balance:  ", afterOwnerBalance.toString());

    expect(beforeOwnerBalance.toString()).to.equal(afterOwnerBalance.toString());

    let afterListingInfo = await erc721Facet.getERC721Listing(80257);
    console.log("Listing Info: ", afterListingInfo.priceInWei.toString());

    expect(lowerPrice).to.equal(afterListingInfo.priceInWei.toString());
  });
});
