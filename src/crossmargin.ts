import { Address, DataSourceContext } from '@graphprotocol/graph-ts';
import { NewAccount as NewAccountEvent } from '../generated/subgraphs/futures/crossmargin_factory/MarginAccountFactory';
import {
  OrderPlaced as OrderPlacedEvent,
  OrderFilled as OrderFilledEvent,
  OrderCancelled as OrderCancelledEvent,
} from '../generated/subgraphs/futures/crossmargin_MarginBase/MarginBase';
import { MarginBase } from '../generated/subgraphs/futures/templates';
import { CrossMarginAccount, FuturesOrder } from '../generated/subgraphs/futures/schema';

export function handleNewAccount(event: NewAccountEvent): void {
  const cmAccountAddress = event.params.account as Address;
  let crossMarginAccount = CrossMarginAccount.load(cmAccountAddress.toHex());

  if (crossMarginAccount == null) {
    crossMarginAccount = new CrossMarginAccount(cmAccountAddress.toHex());
    crossMarginAccount.owner = event.params.owner;
    crossMarginAccount.save();
  }

  let context = new DataSourceContext();
  context.setString('owner', event.params.owner.toHex());
  MarginBase.createWithContext(cmAccountAddress, context);
}

export function handleOrderPlaced(event: OrderPlacedEvent): void {
  const marketAsset = event.params.marketKey;

  let sendingAccount = event.params.account;
  let crossMarginAccount = CrossMarginAccount.load(sendingAccount.toHex());
  const account = crossMarginAccount ? crossMarginAccount.owner : sendingAccount;

  const futuresOrderEntityId = `CM-${sendingAccount.toHexString()}-${event.params.orderId.toString()}`;

  let futuresOrderEntity = FuturesOrder.load(futuresOrderEntityId);
  if (futuresOrderEntity == null) {
    futuresOrderEntity = new FuturesOrder(futuresOrderEntityId);
  }

  futuresOrderEntity.orderType =
    event.params.orderType === 0 ? 'Limit' : event.params.orderType === 1 ? 'Stop' : 'Market';
  futuresOrderEntity.status = 'Pending';
  futuresOrderEntity.asset = marketAsset;
  futuresOrderEntity.account = account;
  futuresOrderEntity.size = event.params.sizeDelta;
  futuresOrderEntity.orderId = event.params.orderId;
  futuresOrderEntity.timestamp = event.block.timestamp;

  futuresOrderEntity.save();
}

export function handleOrderFilled(event: OrderFilledEvent): void {
  const futuresOrderEntityId = `CM-${event.params.account.toHexString()}-${event.params.orderId.toString()}`;
  let futuresOrderEntity = FuturesOrder.load(futuresOrderEntityId);
  if (futuresOrderEntity) {
    futuresOrderEntity.status = 'Filled';
    futuresOrderEntity.timestamp = event.block.timestamp;
    futuresOrderEntity.save();
  }
}

export function handleOrderCancelled(event: OrderCancelledEvent): void {
  const futuresOrderEntityId = `CM-${event.params.account.toHexString()}-${event.params.orderId.toString()}`;
  let futuresOrderEntity = FuturesOrder.load(futuresOrderEntityId);
  if (futuresOrderEntity) {
    futuresOrderEntity.status = 'Cancelled';
    futuresOrderEntity.timestamp = event.block.timestamp;
    futuresOrderEntity.save();
  }
}
