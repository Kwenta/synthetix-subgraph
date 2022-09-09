import { Address, DataSourceContext } from '@graphprotocol/graph-ts';
import { NewAccount as NewAccountEvent } from '../generated/subgraphs/futures/crossmargin_factory/MarginAccountFactory';
import {
  OrderPlaced as OrderPlacedEvent,
  OrderFilled as OrderFilledEvent,
  OrderCancelled as OrderCancelledEvent,
} from '../generated/subgraphs/futures/crossmargin_MarginBase/MarginBase';
import { MarginBase } from '../generated/subgraphs/futures/templates';
import { CrossMarginAccount } from '../generated/subgraphs/futures/schema';

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
  return;
}

export function handleOrderFilled(event: OrderFilledEvent): void {
  return;
}

export function handleOrderCancelled(event: OrderCancelledEvent): void {
  return;
}
