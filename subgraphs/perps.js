const { getCurrentNetwork, getContractDeployments } = require('./utils/network');

const manifest = [];

// get config
const currentNetwork = getCurrentNetwork();

const mainnetConfig = {
  managerStartBlock: 52456507,
  factories: [
    {
      address: '0xf1BC9852e89e0b6ABa81548A10c0afF9ACa95CaA',
      startBlock: 89109827,
    },
    {
      address: '0x8234F990b149Ae59416dc260305E565e5DAfEb54',
      startBlock: 92005505,
    },
  ],
  events: [
    {
      address: '0x64Db098EDbB149DBe99900c96CC73b6F9A1Af2db',
      startBlock: 89109878,
    },
    {
      address: '0x6ba8eb350c72a665b841da90f03401539e7d765f',
      startBlock: 92005518,
    },
    {
      address: '0x11193470df30B37Af9fc5Ec696c240D878bdfb42',
      startBlock: 105932574,
    },
    {
      address: '0xB753d2EE5dcA1fF39A83CA3Ec500656c31Be940b',
      startBlock: 107960610,
    },
    {
      address: '0xc3d16e00833355b48d2fD69D838c6ACF004cf4b6',
      startBlock: 111335504,
    },
    {
      address: '0x6B32d15a6Cb77ea227A6Fb19532b2de542c45AC6',
      startBlock: 120448500,
    },
  ],
  // TODO: Update VIP addresses once prod is deployed
  vip: {
    feeReimbursementApp: {
      address: '0xaEf0d60e1352F624174367E4834a1ADb34cA1D60',
      startBlock: 123118006,
    },
    feeReimbursementClaim: {
      address: '0x62d221a16a9aCEf93d4f906de51Bd7Ad957DDC4d',
      startBlock: 123153550,
    },
  },
};

const sepoliaConfig = {
  managerStartBlock: 5104367,
  factories: [
    {
      address: '0xF877315CfC91E69e7f4c308ec312cf91D66a095F',
      startBlock: 7761214,
    },
  ],
  events: [
    {
      address: '0xd5fE5beAa04270B32f81Bf161768c44DF9880D11',
      startBlock: 7761214,
    },
  ],
  vip: {
    feeReimbursementApp: {
      address: '0xaEf0d60e1352F624174367E4834a1ADb34cA1D60',
      startBlock: 123118006,
    },
    feeReimbursementClaim: {
      address: '0x966e8B1627a042c14605746679D9c1708E885ff9',
      startBlock: 123108552,
    },
  },
};

const config = currentNetwork === 'optimism' ? mainnetConfig : sepoliaConfig;

// futures market manager
getContractDeployments('FuturesMarketManager').forEach((a, i) => {
  manifest.push({
    kind: 'ethereum/contract',
    name: `futures_FuturesMarketManager_${i}`,
    network: currentNetwork,
    source: {
      address: a.address,
      startBlock: config.managerStartBlock,
      abi: 'FuturesMarketManager',
    },
    mapping: {
      kind: 'ethereum/events',
      apiVersion: '0.0.6',
      language: 'wasm/assemblyscript',
      file: '../src/perps.ts',
      entities: ['FuturesMarket'],
      abis: [
        {
          name: 'FuturesMarket',
          file: '../abis/FuturesMarket.json',
        },
        {
          name: 'FuturesMarketManager',
          file: '../abis/FuturesMarketManager.json',
        },
      ],
      eventHandlers: [
        {
          event: 'MarketAdded(address,indexed bytes32,indexed bytes32)',
          handler: 'handleV2MarketAdded',
        },
        {
          event: 'MarketRemoved(address,indexed bytes32,indexed bytes32)',
          handler: 'handleMarketRemoved',
        },
      ],
    },
  });
});

// perps v2 markets
const perpsMarketTemplate = {
  kind: 'ethereum/contract',
  name: 'PerpsMarket',
  network: currentNetwork,
  source: {
    abi: 'PerpsV2MarketProxyable',
  },
  mapping: {
    kind: 'ethereum/events',
    apiVersion: '0.0.6',
    language: 'wasm/assemblyscript',
    file: '../src/perps.ts',
    entities: ['FuturesMarket', 'FuturesPosition', 'FuturesTrade'],
    abis: [
      {
        name: 'PerpsV2MarketProxyable',
        file: '../abis/PerpsV2MarketProxyable.json',
      },
    ],
    eventHandlers: [
      {
        event: 'MarginTransferred(indexed address,int256)',
        handler: 'handleMarginTransferred',
      },
      {
        event: 'PositionModified(indexed uint256,indexed address,uint256,int256,int256,uint256,uint256,uint256)',
        handler: 'handlePositionModified',
      },
      {
        event: 'PositionModified(indexed uint256,indexed address,uint256,int256,int256,uint256,uint256,uint256,int256)',
        handler: 'handlePositionModifiedV2',
      },
      {
        event: 'PositionLiquidated(uint256,address,address,int256,uint256,uint256)',
        handler: 'handlePositionLiquidated',
      },
      {
        event: 'PositionLiquidated(uint256,address,address,int256,uint256,uint256,uint256,uint256)',
        handler: 'handlePositionLiquidatedV2',
      },
      {
        event: 'DelayedOrderSubmitted(indexed address,bool,int256,uint256,uint256,uint256,uint256,uint256,bytes32)',
        handler: 'handleDelayedOrderSubmitted',
      },
      {
        event: 'DelayedOrderRemoved(indexed address,bool,uint256,int256,uint256,uint256,uint256,bytes32)',
        handler: 'handleDelayedOrderRemoved',
      },
      {
        event: 'FundingRecomputed(int256,int256,uint256,uint256)',
        handler: 'handleFundingRecomputed',
      },
      {
        event: 'PerpsTracking(indexed bytes32,bytes32,bytes32,int256,uint256)',
        handler: 'handlePerpsTracking',
      },
    ],
  },
};

// smart margin factory
config.factories.forEach((factory, ind) => {
  manifest.push({
    kind: 'ethereum/contract',
    name: `smartmargin_factory_${ind}`,
    network: getCurrentNetwork(),
    source: {
      address: factory.address,
      startBlock: factory.startBlock,
      abi: 'Factory',
    },
    mapping: {
      kind: 'ethereum/events',
      apiVersion: '0.0.6',
      language: 'wasm/assemblyscript',
      file: '../src/smartmargin.ts',
      entities: ['Factory'],
      abis: [
        {
          name: 'Factory',
          file: '../abis/Factory.json',
        },
      ],
      eventHandlers: [
        {
          event: 'NewAccount(indexed address,indexed address,bytes32)',
          handler: 'handleNewAccount',
        },
      ],
    },
  });
});

// smart margin events
config.events.forEach((events, ind) => {
  manifest.push({
    kind: 'ethereum/contract',
    name: `smartmargin_events_${ind}`,
    network: getCurrentNetwork(),
    source: {
      address: events.address,
      startBlock: events.startBlock,
      abi: 'Events',
    },
    mapping: {
      kind: 'ethereum/events',
      apiVersion: '0.0.6',
      language: 'wasm/assemblyscript',
      file: '../src/smartmargin.ts',
      entities: ['Events'],
      abis: [
        {
          name: 'Events',
          file: '../abis/Events.json',
        },
      ],
      eventHandlers: [
        {
          event: 'Deposit(indexed address,indexed address,uint256)',
          handler: 'handleDeposit',
        },
        {
          event: 'Withdraw(indexed address,indexed address,uint256)',
          handler: 'handleWithdraw',
        },
        {
          event: 'DelegatedAccountAdded(indexed address,indexed address)',
          handler: 'handleDelegatedAccountAdded',
        },
        {
          event: 'DelegatedAccountRemoved(indexed address,indexed address)',
          handler: 'handleDelegatedAccountRemoved',
        },
        // smart margin v1
        {
          event: 'ConditionalOrderPlaced(indexed address,uint256,bytes32,int256,int256,uint256,uint8,uint256,bool)',
          handler: 'handleOrderPlaced',
        },
        // smart margin v2
        {
          event:
            'ConditionalOrderPlaced(indexed address,indexed uint256,indexed bytes32,bytes32,int256,int256,uint256,uint8,uint256,bool)',
          handler: 'handleOrderPlacedV2',
        },
        // smart margin v1
        {
          event: 'ConditionalOrderCancelled(indexed address,uint256,uint8)',
          handler: 'handleOrderCancelled',
        },
        // smart margin v2
        {
          event: 'ConditionalOrderCancelled(indexed address,indexed uint256,indexed bytes32,uint8)',
          handler: 'handleOrderCancelled',
        },
        // smart margin v1
        {
          event: 'ConditionalOrderFilled(indexed address,uint256,uint256,uint256)',
          handler: 'handleOrderV1Filled',
        },
        // smart margin v2
        {
          event: 'ConditionalOrderFilled(indexed address,indexed uint256,indexed bytes32,uint256,uint256)',
          handler: 'handleOrderV2Filled',
        },
        // smart margin v2.0.2
        {
          event: 'ConditionalOrderFilled(indexed address,indexed uint256,indexed bytes32,uint256,uint256,uint8)',
          handler: 'handleOrderV2FilledWithPriceOracle',
        },
        // smart margin v2.1.4
        {
          event: 'OrderFlowFeeImposed(indexed address,uint256)',
          handler: 'handleOrderFlowFeeImposed',
        },
      ],
    },
  });
});

// VIP Events
manifest.push({
  kind: 'ethereum/contract',
  name: 'FeeReimbursementApp',
  network: currentNetwork,
  source: {
    address: config.vip.feeReimbursementApp.address,
    abi: 'FeeReimbursementApp',
    startBlock: config.vip.feeReimbursementApp.startBlock,
  },
  mapping: {
    kind: 'ethereum/events',
    apiVersion: '0.0.6',
    language: 'wasm/assemblyscript',
    file: '../src/vip-program.ts',
    entities: ['FeeReimbursement, AccumulatedVolumeFee'],
    abis: [
      {
        name: 'FeeReimbursementApp',
        file: '../abis/FeeReimbursementApp.json',
      },
    ],
    eventHandlers: [
      {
        event: 'FeeReimbursed(address,uint248)',
        handler: 'handleFeeReimbursed',
      },
      {
        event: 'FeeRebateAccumulated(address,uint248,uint248,uint248,uint64,uint64)',
        handler: 'handleFeeRebateAccumulated',
      },
    ],
  },
});

// VIP Claim trigger
manifest.push({
  kind: 'ethereum/contract',
  name: 'FeeReimbursementClaim',
  network: currentNetwork,
  source: {
    address: config.vip.feeReimbursementClaim.address,
    abi: 'FeeReimbursementClaim',
    startBlock: config.vip.feeReimbursementClaim.startBlock,
  },
  mapping: {
    kind: 'ethereum/events',
    apiVersion: '0.0.6',
    language: 'wasm/assemblyscript',
    file: '../src/vip-program.ts',
    entities: ['FeeReimbursement, AccumulatedVolumeFee'],
    abis: [
      {
        name: 'FeeReimbursementClaim',
        file: '../abis/FeeReimbursementClaim.json',
      },
    ],
    eventHandlers: [
      {
        event: 'FeeRebateClaimed(indexed address,int256)',
        handler: 'handleFeeRebateClaimed',
      },
    ],
  },
});

module.exports = {
  specVersion: '0.0.4',
  description: 'Kwenta Perps API',
  repository: 'https://github.com/kwenta/kwenta-subgraph',
  schema: {
    file: './perps.graphql',
  },
  dataSources: manifest,
  templates: [perpsMarketTemplate],
};
