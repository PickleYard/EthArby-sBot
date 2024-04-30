require("dotenv").config()

const hre = require("hardhat")

// -- IMPORT HELPER FUNCTIONS & CONFIG -- //
const { getTokenAndContract, getPairContract, calculatePrice } = require('../helpers/helpers')
const { provider, uFactory, uRouter, sFactory, sRouter } = require('../helpers/initialization.js')

// -- CONFIGURE VALUES HERE -- //
const V2_FACTORY_TO_USE = uFactory
const V2_ROUTER_TO_USE = uRouter

const UNLOCKED_ACCOUNT = '0x5396a49cE15a1b1A281816b577a58fe4F87f1868' // IMX account to impersonate 
const AMOUNT = '50000' // 50,000 IMX -- Tokens will automatically be converted to wei

async function main() {
  // Fetch contracts
  const {
    token0Contract,
    token1Contract,
    token0: ARB_AGAINST,
    token1: ARB_FOR
  } = await getTokenAndContract(process.env.ARB_AGAINST, process.env.ARB_FOR, provider)

  const pair = await getPairContract(V2_FACTORY_TO_USE, ARB_AGAINST.address, ARB_FOR.address, provider)

  // Fetch price of SHIB/WETH before we execute the swap
  const priceBefore = await calculatePrice(pair)
  console.log(`Price Before: ${priceBefore}`)

  await manipulatePrice([ARB_AGAINST, ARB_FOR], token0Contract)

  // Fetch price of SHIB/WETH after the swap
  const priceAfter = await calculatePrice(pair)
  console.log(`Price After: ${priceAfter}`)
  
  const data = {
    'Price Before': `1 WETH = ${Number(priceBefore).toFixed(0)} IMX`,
    'Price After': `1 WETH = ${Number(priceAfter).toFixed(0)} IMX`,
  }

  console.table(data)
}

async function manipulatePrice(_path, _token0Contract) {
  console.log(`\nBeginning Swap...\n`)

  console.log(`Input Token: ${_path[0].symbol}`)
  console.log(`Output Token: ${_path[1].symbol}\n`)

  const amount = hre.ethers.parseUnits(AMOUNT, 'ether') // Error here??
  console.log(`Swap Amount: ${amount}`)

  const path = [_path[0].address, _path[1].address]
  console.log(`Swap Path: ${path}`)

  const deadline = Math.floor(Date.now() / 1000) + 60 * 20 // 20 minutes

  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [UNLOCKED_ACCOUNT],
  })

  const signer = await hre.ethers.getSigner(UNLOCKED_ACCOUNT)

  const approval = await _token0Contract.connect(signer).approve(await V2_ROUTER_TO_USE.getAddress(), amount, { gasLimit: 50000 })
  await approval.wait()

  const swap = await V2_ROUTER_TO_USE.connect(signer).swapExactTokensForTokens(amount, 0, path, signer.address, deadline, { gasLimit: 1250000 })
  await swap.wait()

  console.log(`Swap Complete!\n`)
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
