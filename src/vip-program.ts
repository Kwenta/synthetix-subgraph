import { AccumulatedVolumeFee, FeeReimbursed } from '../generated/subgraphs/perps-v3/schema';
import { FeeReimbursed as FeeReimbursedEvent } from '../generated/subgraphs/perps-v3/FeeReimbursement/FeeReimbursementApp';
import { BigInt } from '@graphprotocol/graph-ts';

export function handleFeeReimbursed(event: FeeReimbursedEvent): void {
  const accumulatedVolumeFeeEntity = AccumulatedVolumeFee.load(event.params.accountId.toHex());
  if (accumulatedVolumeFeeEntity) {
    accumulatedVolumeFeeEntity.lastClaimedAt = event.block.timestamp;
    // TODO: Check if this is correct. Should be Zero?
    accumulatedVolumeFeeEntity.claimableFees = accumulatedVolumeFeeEntity.claimableFees.minus(event.params.feeRebate);
    accumulatedVolumeFeeEntity.paidFeesSinceClaimed = BigInt.fromI32(0);
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
