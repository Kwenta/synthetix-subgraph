import { FeeReimbursed as FeeReimbursedEvent } from '../generated/subgraphs/perps-v3/FeeReimbursement/FeeReimbursementApp';
import { BigInt } from '@graphprotocol/graph-ts';
import { AccumulatedVolumeFee, FeeReimbursed } from '../generated/subgraphs/perps/schema';

export function handleFeeReimbursed(event: FeeReimbursedEvent): void {
  const accumulatedVolumeFeeEntity = AccumulatedVolumeFee.load(event.params.accountId.toHex());
  if (accumulatedVolumeFeeEntity) {
    accumulatedVolumeFeeEntity.allTimeRebates = accumulatedVolumeFeeEntity.allTimeRebates.plus(event.params.feeRebate);
    accumulatedVolumeFeeEntity.lastClaimedAt = event.block.timestamp;
    accumulatedVolumeFeeEntity.totalFeeRebate = accumulatedVolumeFeeEntity.totalFeeRebate.minus(event.params.feeRebate);
    accumulatedVolumeFeeEntity.paidFeesSinceClaimed = BigInt.fromI32(0);
    accumulatedVolumeFeeEntity.tradesSinceClaimed = 0;
    accumulatedVolumeFeeEntity.save();
  }

  const feeReimbursedEntity = new FeeReimbursed(event.params.accountId.toHex() + '-' + event.transaction.hash.toHex());
  feeReimbursedEntity.accountId = event.params.accountId;
  feeReimbursedEntity.feeRebate = event.params.feeRebate;
  feeReimbursedEntity.timestamp = event.block.timestamp;
  feeReimbursedEntity.startBlockNumber = event.params.startBlockNumber;
  feeReimbursedEntity.endBlockNumber = event.params.endBlockNumber;
  feeReimbursedEntity.from = event.params.startYearMonthDay;
  feeReimbursedEntity.to = event.params.endYearMonthDay;

  feeReimbursedEntity.save();
}
