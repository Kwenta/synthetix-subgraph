import { BigInt, log, store } from '@graphprotocol/graph-ts';
import {
  AccumulatedVolumeFee,
  DailyTrade,
  FeeReimbursed,
  FuturesTrade,
  SmartMarginAccount,
} from '../generated/subgraphs/perps/schema';
import {
  FeeReimbursed as FeeReimbursedEvent,
  FeeRebateAccumulated as FeeRebateAccumulatedEvent,
} from '../generated/subgraphs/perps/FeeReimbursementApp/FeeReimbursementApp';
import { FeeRebateClaimed as FeeRebateClaimedEvent } from '../generated/subgraphs/perps/FeeReimbursementClaim/FeeReimbursementClaim';
import { ZERO, computeVipFeeRebate, getStartOfDay, getVipTier } from './lib/helpers';

export function handleFeeReimbursed(event: FeeReimbursedEvent): void {
  let smartMarginAccount = SmartMarginAccount.load(event.params.account.toHex());
  if (!smartMarginAccount) {
    return;
  }

  const accumulatedVolumeFeeEntity = AccumulatedVolumeFee.load(event.params.account.toHex());
  if (accumulatedVolumeFeeEntity) {
    accumulatedVolumeFeeEntity.allTimeRebates = accumulatedVolumeFeeEntity.allTimeRebates.plus(event.params.feeRebate);
    accumulatedVolumeFeeEntity.lastClaimedAt = event.block.timestamp;
    accumulatedVolumeFeeEntity.lastClaimedAtBlockNumber = event.block.number;
    if (accumulatedVolumeFeeEntity.totalFeeRebate.gt(event.params.feeRebate)) {
      accumulatedVolumeFeeEntity.totalFeeRebate = accumulatedVolumeFeeEntity.totalFeeRebate.minus(
        event.params.feeRebate,
      );
    } else {
      log.error('totalFeeRebate less than feeRebate: {} {} {}', [
        accumulatedVolumeFeeEntity.totalFeeRebate.toString(),
        event.params.feeRebate.toString(),
        event.params.account.toHex(),
      ]);
      accumulatedVolumeFeeEntity.totalFeeRebate = ZERO;
    }
    accumulatedVolumeFeeEntity.paidFeesSinceClaimed = BigInt.fromI32(0);
    accumulatedVolumeFeeEntity.tradesSinceClaimed = 0;
    accumulatedVolumeFeeEntity.save();
  }

  const feeReimbursedEntity = new FeeReimbursed(event.transaction.hash.toHex());

  feeReimbursedEntity.account = event.params.account;
  feeReimbursedEntity.feeRebate = event.params.feeRebate;
  feeReimbursedEntity.timestamp = event.block.timestamp;
  feeReimbursedEntity.blockNumber = event.block.number;
  feeReimbursedEntity.txHash = event.transaction.hash.toHex();

  feeReimbursedEntity.save();
}

export function handleFeeRebateClaimed(event: FeeRebateClaimedEvent): void {
  const feeReimbursedEntity = FeeReimbursed.load(event.transaction.hash.toHex());
  if (feeReimbursedEntity) {
    feeReimbursedEntity.rebateTokenPrice = event.params.price;
    feeReimbursedEntity.save();
  }
}

export function handleFeeRebateAccumulated(event: FeeRebateAccumulatedEvent): void {
  const accumulatedVolumeFeeEntity = AccumulatedVolumeFee.load(event.params.account.toHex());

  if (!accumulatedVolumeFeeEntity) {
    return;
  }

  accumulatedVolumeFeeEntity.lastFeeRebateAccumulatedAt = event.block.timestamp;
  accumulatedVolumeFeeEntity.lastFeeAccumulatedStartBlockNumber = event.params.startBlockNumber;

  let startOfDay = ZERO;
  for (let i = 0; i < accumulatedVolumeFeeEntity.tradesIds.length; i++) {
    const tradeEntity = FuturesTrade.load(accumulatedVolumeFeeEntity.tradesIds[i]);
    if (!tradeEntity) {
      continue;
    }

    if (
      tradeEntity.blockNumber >= event.params.startBlockNumber &&
      tradeEntity.blockNumber <= event.params.endBlockNumber
    ) {
      startOfDay = getStartOfDay(tradeEntity.timestamp);
      break;
    }
  }

  if (startOfDay == ZERO) {
    return;
  }

  const dailyTradeEntity = DailyTrade.load(event.params.account.toHex() + '-' + startOfDay.toString());

  if (!dailyTradeEntity) {
    return;
  }

  for (let i = 0; i < dailyTradeEntity.tradesIds.length; i++) {
    const tradeEntity = FuturesTrade.load(dailyTradeEntity.tradesIds[i]);
    if (!tradeEntity) {
      continue;
    }

    const tier = getVipTier(dailyTradeEntity.thirtyDayVolume);
    const feeRebate = computeVipFeeRebate(tradeEntity.feesPaid, tier);
    tradeEntity.vipTier = tier;
    tradeEntity.feeRebate = feeRebate;
    accumulatedVolumeFeeEntity.paidFeesSinceClaimed = accumulatedVolumeFeeEntity.paidFeesSinceClaimed.plus(
      tradeEntity.feesPaid,
    );
    accumulatedVolumeFeeEntity.totalFeeRebate = accumulatedVolumeFeeEntity.totalFeeRebate.plus(feeRebate);
    accumulatedVolumeFeeEntity.tier = tier;

    accumulatedVolumeFeeEntity.save();
    tradeEntity.save();
    store.remove('DailyTrade', dailyTradeEntity.id);
  }
}
