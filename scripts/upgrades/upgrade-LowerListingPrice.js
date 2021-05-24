/* global ethers hre */
/* eslint prefer-const: "off" */

const { LedgerSigner } = require('@ethersproject/hardware-wallets')
const { sendToMultisig } = require('../libraries/multisig/multisig.js')

const getSelectors = (contract) => {
  const signatures = Object.keys(contract.interface.functions)
  const selectors = signatures.reduce((acc, val) => {
    if (val !== 'init(bytes)') {
      acc.push(contract.interface.getSighash(val))
    }
    return acc
  }, [])
  return selectors
}

const getSelector = (func) => {
  const abiInterface = new ethers.utils.Interface([func])
  return abiInterface.getSighash(ethers.utils.Fragment.from(func))
}


async function main () {
  const diamondAddress = '0x86935F11C86623deC8a25696E1C19a8659CbF95d';

  let signer;
  let erc721Facet;
  let erc1155Facet;
  let owner = await (await ethers.getContractAt('OwnershipFacet', diamondAddress)).owner();

  const testing = ['hardhat', 'localhost'].includes(hre.network.name);
  // await hre.run('compile');

  if (testing) {
    await hre.network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [owner]
    })
    signer = await ethers.getSigner(owner)
  } else if (hre.network.name === 'matic') {
    signer = new LedgerSigner(ethers.provider)
  } else {
    throw Error('Incorrect network selected')
  }

  const ERC721Facet = await ethers.getContractFactory('contracts/Aavegotchi/facets/ERC721MarketplaceFacet.sol:ERC721MarketplaceFacet');
  erc721Facet = await ERC721Facet.deploy();
  await erc721Facet.deployed();
  console.log('Deployed facet:', erc721Facet.address);

  const ERC1155Facet = await ethers.getContractFactory('contracts/Aavegotchi/facets/ERC1155MarketplaceFacet.sol:ERC1155MarketplaceFacet');
  erc1155Facet = await ERC1155Facet.deploy();
  await erc1155Facet.deployed();
  console.log('Deployed facet:', erc1155Facet.address);

  const newERC721Funcs = [
    getSelector('function lowerERC721ListingPrice(uint256 _listingId, uint256 _lowerPriceInWei) external')
  ]

  let existingERC721Funcs = getSelectors(erc721Facet);
    for (const selector of newERC721Funcs) {
      if (!existingERC721Funcs.includes(selector)) {
        throw Error(`Selector ${selector} not found`);
      }
    }

  existingERC721Funcs = existingERC721Funcs.filter(selector => !newERC721Funcs.includes(selector));

  const newERC1155Funcs = [
    getSelector('function lowerERC1155ListingPrice(uint256 _listingId, uint256 _lowerPriceInWei) external')
  ]

  let existingERC1155Funcs = getSelectors(erc1155Facet);
    for(const selector of newERC1155Funcs) {
      if(!existingERC1155Funcs.includes(selector)){
        throw Error(`Selector ${selector} not found`);
      }
    }

  existingERC1155Funcs = existingERC1155Funcs.filter(selector => !newERC1155Funcs.includes(selector));

  const FacetCutAction = { Add: 0, Replace: 1, Remove: 2 }

  const cut = [
    {
      facetAddress: erc721Facet.address,
      action: FacetCutAction.Add,
      functionSelectors: newERC721Funcs
    },
    {
      facetAddress: erc721Facet.address,
      action: FacetCutAction.Replace,
      functionSelectors: existingERC721Funcs
    },
    {
      facetAddress: erc1155Facet.address,
      action: FacetCutAction.Add,
      functionSelectors: newERC1155Funcs
    },
    {
      facetAddress: erc1155Facet.address,
      action: FacetCutAction.Replace,
      functionSelectors: existingERC1155Funcs
    }
  ]
  console.log(cut);

  const diamondCut = (await ethers.getContractAt('IDiamondCut', diamondAddress)).connect(signer);
let tx;
let receipt;

if(testing) {
  console.log('Diamond cut');
  tx = await diamondCut.diamondCut(cut, ethers.constants.AddressZero, '0x', { gasLimit: 8000000 });
  console.log('Diamond cut tx:', tx.hash)
  receipt = await tx.wait();
  if (!receipt.status) {
     throw Error(`Diamond upgrade failed: ${tx.hash}`)
   }
  console.log('Completed diamond cut: ', tx.hash);

  } else {
     console.log('Diamond cut');
     tx = await diamondCut.populateTransaction.diamondCut(cut, ethers.constants.AddressZero, '0x', { gasLimit: 800000 });
     await sendToMultisig(process.env.DIAMOND_UPGRADER, signer, tx);
  }
}

if(require.main === module){
main()
  .then(() => process.exit(0))
    .catch(error => {
      console.error(error)
      process.exit(1)
  });
}

exports.erc721LowerPrice = main;
