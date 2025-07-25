import type { Identity } from '@dfinity/agent';
import { IDL } from '@dfinity/candid';
import { Ed25519KeyIdentity } from '@dfinity/identity';
import { AccountIdentifier } from '@dfinity/ledger-icp';
import type { _SERVICE as LedgerActor } from '@dfinity/ledger-icp/dist/candid/ledger';
// @ts-expect-error init is not packaged / exposed
import { idlFactory, init } from '@dfinity/ledger-icp/dist/candid/ledger.idl.js';
import type { CanisterFixture, PocketIc } from '@dfinity/pic';
import { assertNonNullish } from '@dfinity/utils';
import { LEDGER_ID } from '../constants/ledger-tests.contants';
import { download } from './setup-tests.utils';

const IC_VERSION = 'b0ade55f7e8999e2842fe3f49df163ba224b71a2';
const url = `https://download.dfinity.systems/ic/${IC_VERSION}/canisters/ledger-canister.wasm.gz`;

export const setupLedger = async ({
	pic,
	controller
}: {
	pic: PocketIc;
	controller: Identity;
}): Promise<CanisterFixture<LedgerActor>> => {
	const destination = await download({
		wasm: 'ledger.wasm.gz',
		url
	});

	const minter = Ed25519KeyIdentity.generate();

	const minterAccountIdentifier = AccountIdentifier.fromPrincipal({
		principal: minter.getPrincipal()
	}).toHex();

	const ledgerAccountIdentifier = AccountIdentifier.fromPrincipal({
		principal: controller.getPrincipal()
	}).toHex();

	const initArgs = {
		send_whitelist: [],
		token_symbol: ['ICP'],
		transfer_fee: [{ e8s: 10_000n }],
		minting_account: minterAccountIdentifier,
		maximum_number_of_accounts: [],
		accounts_overflow_trim_quantity: [],
		transaction_window: [],
		max_message_size_bytes: [],
		icrc1_minting_account: [],
		archive_options: [],
		initial_values: [[ledgerAccountIdentifier, { e8s: 100_000_000_000n }]],
		token_name: ['Internet Computer'],
		feature_flags: []
	};

	// Type definitions generated by Candid are not clean enough.
	const arg = IDL.encode(init({ IDL }), [{ Init: initArgs }]);

	const subnet = await pic.getNnsSubnet();

	assertNonNullish(subnet);

	const { actor, ...rest } = await pic.setupCanister<LedgerActor>({
		idlFactory,
		wasm: destination,
		sender: controller.getPrincipal(),
		arg,
		targetCanisterId: LEDGER_ID,
		targetSubnetId: subnet.id
	});

	actor.setIdentity(controller);

	return {
		actor,
		...rest
	};
};
