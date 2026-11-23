import type { FarmStep, SnapshotProtocol } from './model.ts';

type Route = [action: string, risk: string, exit: string];

const vault: Route = [
  'Inspect the vault’s underlying markets, curator mandate, fees and available withdrawals. Preview a small deposit in the listed asset.',
  'Review share price and withdrawal liquidity weekly. A curator can change allocations and losses can reach depositors.',
  'Preview redemption, check the queue and redeem shares once liquidity is available.',
];
const lending: Route = [
  'Pick a supply market with available withdrawals. Compare utilization, collateral exposure and the supply-rate breakdown, then preview a supply-only position.',
  'Review available liquidity and rate changes weekly. Supply can lose value through bad debt or an asset depeg.',
  'Redeem the supplied asset once liquidity is available. Disable any unneeded allowance after confirming the withdrawal.',
];
const rwa: Route = [
  'Check residency rules, investor eligibility, minimum subscription and accepted settlement assets. Request a quote only if eligible.',
  'Check the issuer, custodian and redemption calendar. NAV may update slowly and redemptions can be gated.',
  'Follow the published redemption window and compare the cash received with the quoted NAV after fees.',
];
const stake: Route = [
  'Check supported stake assets, validator terms and the minimum deposit. Preview a small delegation or stake only if the lock conditions fit.',
  'Track validator performance, slashing exposure and whether a receipt trades below redemption value.',
  'Start undelegation or request redemption, then verify settlement after the applicable unbonding period.',
];
const liquidity: Route = [
  'Inspect the pool pair, fee tier and range policy. Preview a deposit and check how the assets would be split at the current price.',
  'Compare position value after fees against holding both assets. Check whether the position is outside its earning range.',
  'Preview removal, collect accrued fees and check each returned token balance before making a follow-up swap.',
];
const derivative: Route = [
  'Read collateral and settlement rules. Run a paper trade using the quoted spread, margin, funding and liquidation price.',
  'Compare the result against spot exposure after funding and fees. A leveraged position can be liquidated quickly.',
  'If you already opened a position, confirm that closing it leaves no open orders or residual margin before withdrawal.',
];
const bridge: Route = [
  'Preview a transfer you already need. Compare source chain, destination, asset contract, route operator and amount received.',
  'Check finality and recovery instructions before sending. Track the transfer with its source transaction hash.',
  'Verify the receiving balance and reserve the destination fee asset if you need a return transfer.',
];
const routes: Record<string, Route> = {
  'Liquidity Manager': liquidity, Farm: liquidity, 'Yield Aggregator': vault,
  'Leveraged Farming': derivative, Derivatives: derivative, Perpetuals: derivative,
  Bridge: bridge, 'Canonical Bridge': bridge, 'Liquid Staking': stake, 'Liquid Restaking': stake,
  'Dual-Token Stablecoin': [
    'Read how reserve, debt and reward tokens interact. Preview direct acquisition and redemption before considering a mint.',
    'Track the stable asset’s peg and its backing. Incentives can change even while redemption is constrained.',
    'Compare a protocol redemption quote with a secondary-market exit and check settlement fees.',
  ],
  'Prediction Market': [
    'Read the resolution rule, deadline and dispute process for a single market. Record a paper quote for both sides.',
    'Check spread and depth before taking any exposure. A position can lose its full stake at resolution.',
    'Check whether you can close before resolution and document the payout process and fee if you hold through it.',
  ],
  Lending: lending, 'Risk Curators': vault, 'Onchain Capital Allocator': vault, Yield: vault, RWA: rwa,
  Restaking: stake, 'Staking Pool': stake, 'Collateral Markets': stake,
  Dexs: [
    'Preview one small swap in a liquid pair for an asset you intended to acquire. Check route, price impact and minimum received.',
    'Compare the executed amount against the quote. Avoid repeating trades for volume, and account for price exposure and MEV.',
    'Keep the asset only if you need it. If you unwind, quote the reverse swap and account for spread and fees on both legs.',
  ],
  CDP: [
    'Read the collateral ratio, oracle and liquidation rules. Compare acquiring the stable asset directly with opening a collateralized debt position.',
    'If you already need the stable asset, preview the smallest viable mint with a large collateral buffer. Monitor oracle moves and peg daily while debt is open.',
    'Source enough of the debt asset to repay principal and fees, then close the vault and retrieve collateral.',
  ],
  'Stablecoin Wrapper': [
    'Confirm the underlying stable asset and compare the wrap quote with direct acquisition. Verify whether minting is open to your account.',
    'Track the wrapper’s redemption price, underlying peg and idle liquidity. A secondary-market sale may incur a discount.',
    'Request an unwrap and confirm receipt of the underlying. Check any cooldown and daily limits before committing.',
  ],
  'Basis Trading': [
    'Read the vault’s hedge venues, collateral and funding policy. Preview a deposit only if the strategy and redemption terms are disclosed.',
    'Check funding, hedge drift and venue concentration weekly. Negative funding or an exchange outage can erode NAV.',
    'Request redemption and allow for hedge unwind, NAV settlement and any epoch cutoff.',
  ],
  Insurance: [
    'Read whether the product is underwriting or cover. Review covered events, exclusions and the withdrawal or claim process before requesting a quote.',
    'For underwriting, monitor pool exposure and reserve losses. For cover, retain policy evidence and track expiration.',
    'Use the withdrawal window for underwriting or the documented claim process for a covered event.',
  ],
  Chain: [
    'Find a documented application or transfer you already need on this network. Confirm the fee asset and destination before previewing a small transfer.',
    'Verify amount and finality on the network explorer. Check route availability and preserve enough fee asset for the return leg.',
    'Confirm the receiving network supports the asset before routing it back. Budget for the return leg before entering.',
  ],
  CeDeFi: [
    'Check who controls custody, eligible assets, deposit minimum and withdrawal terms before creating a position.',
    'Review counterparty concentration, settlement delays and the withdrawal status before adding exposure.',
    'Request a small withdrawal and reconcile the settled amount after custody and network fees.',
  ],
};
const observations: Record<string, string> = {
  'steakhouse-financial': 'In the vault directory, compare Steakhouse-curated markets by underlying, borrower exposure and available liquidity. On Base, verify the selected vault actually names Steakhouse as curator.',
  gauntlet: 'Distinguish the Gauntlet curator from the underlying lending venue. Compare the market allocation and caps of any two available Gauntlet vaults before choosing one.',
  veda: 'Identify the specific Veda-powered vault and its front-end operator. Read the supported deposit assets, share-price source and redemption queue for that vault.',
  'nonce-capital': 'Confirm the vault identifies Nonce Capital as curator. Compare the largest individual allocation with available redemption liquidity.',
  'bittensor-dtao': 'For a dTAO subnet, compare TAO-to-alpha quotes and pool depth before previewing a position. Keep principal small because a subnet’s alpha can fall against TAO.',
  symbiotic: 'Identify the collateral vault and the networks or operators it delegates to. Check whether slashing applies to that vault and how long withdrawal epochs last.',
  'plume-vaults': 'Identify the particular vault behind the Plume record and verify whether it takes deposits on the chain you intend to use. Review the underlying asset issuer separately.',
  curvance: 'On Monad, compare supply-only markets and verify available cash. Leave the collateral toggle off if you have no reason to borrow.',
  tydro: 'On Ink, compare available supply-market cash with utilization and reserve liquidity before choosing an asset.',
  'lightning-network': 'If you already need to pay a merchant, validate a small Lightning invoice and its expiry. Use a wallet with clear routing fees and check whether it holds funds in custody.',
  'lofty': 'Review a specific property’s offering terms, ownership structure and resale liquidity before paying anything. Property exposure can be illiquid even when represented on-chain.',
  'firelight': 'Review the Flare product’s staking or cover terms and any receipt redemption constraints. Confirm current product access and check whether underwriting exposure applies.',
  'mezo-earn': 'Identify the Mezo pool or vault behind the record. Verify incentive terms, the underlying position and any exit lock directly in its documentation.',
  'reti-pooling': 'Compare Algorand pool operator terms, deposit minimum and payout split. Check the pool’s withdrawal policy before staking.',
};

const review: Route = [
  'Identify the exact product behind the TVL record in its official documentation. Verify supported actions, minimum size and whether it accepts users.',
  'Read the asset, custody or contract risks and capture an entry and exit quote. If either side is unclear, keep this as a research item.',
  'Only return for a documented use case. If you entered, reconcile the returned assets and fees after closing the position.',
];
const payment: Route = [
  'If you already have a reason to send a payment, validate the invoice and compare the quoted total against another route.',
  'Check expiry, finality and custody model. Save the receipt and check the amount received before repeating.',
  'Leave only the balance you need for actual payments. Review the provider’s settlement or withdrawal terms.',
];

export function farmSteps(protocol: SnapshotProtocol): FarmStep[] {
  const chain = protocol.chains.length ? protocol.chains.slice(0, 3).join(', ') : 'chain unreported';
  const route = protocol.category === 'Payments' ? payment : routes[protocol.category ?? ''] ?? review;
  const regulated = route === rwa || route === review || route === derivative || protocol.category === 'CeDeFi';
  const budget = regulated
    ? '$0 to research; if eligible, check the actual minimum and all service fees'
    : '$25–$100 example principal if permitted by the minimum; quote entry and exit fees before signing';
  return [
    {
      text: `Find the product for ${protocol.name} through official documentation. Match deployment and asset against the recorded network list (${chain}). Skip if the product, eligibility or official entry point cannot be verified.`,
      cost: '$0 to verify', time: '10–15 min',
    },
    {
      text: observations[protocol.slug] ?? route[0],
      cost: budget, time: '10–25 min to research and quote',
    },
    {
      text: route[1],
      cost: '$0 to review; any deployed principal is at risk', time: '5–10 min per review',
    },
    {
      text: route[2],
      cost: 'get a fee quote first; a $5 round trip costs 10% on a $50 position',
      time: '10–20 min active; settlement can take minutes to weeks depending on route',
    },
    {
      text: 'Save the quote or receipt and check only published rewards terms. Treat unverified rewards as zero in your budget and check current token status before relying on the snapshot.',
      cost: '$0', time: '5 min',
    },
  ];
}
