import {
	Assets,
	Emulator,
	fromText,
	generatePrivateKey,
	generateSeedPhrase,
	Lucid,
	toUnit,
} from "lucid-cardano";
import * as multisig_update from "../multisig.update";
import * as multisig_deploy from "../multisig.deploy";
import * as multisig_fullfill from "../multisig.fullfill";
import * as user_request from "../user.request";
import * as user_burn from "../user.burn";
import * as utils from "../utils";

import { ConfigFullFill, ConfigMultiSig, ConfigUpdateMultiSig } from "../types";

const generateAccountPrivateKey = async (assets: Assets) => {
	const privKey = generatePrivateKey();
	const address = await (await Lucid.new(undefined, "Custom"))
		.selectWalletFromPrivateKey(privKey)
		.wallet.address();

	return {
		privateKey: privKey,
		address: address,
		assets: assets,
	};
};

const generateAccountSeedPhrase = async (assets: Assets) => {
	const seedPhrase = generateSeedPhrase();
	return {
		seedPhrase,
		address: await (await Lucid.new(undefined, "Custom"))
			.selectWalletFromSeed(seedPhrase)
			.wallet.address(),
		assets,
	};
};

// Run emulator with user address with staking credential
export const run = async () => {
	console.log("[State]: initializing Emulator");
	//TODO: use generateAccountSeedPhrase instead
	const signers = {
		account1: await generateAccountPrivateKey({
			lovelace: BigInt(1000000000),
		}),
		account2: await generateAccountPrivateKey({
			lovelace: BigInt(1000000000),
		}),
		account3: await generateAccountPrivateKey({
			lovelace: BigInt(1000000000),
		}),
		account11: await generateAccountPrivateKey({
			lovelace: BigInt(1000000000),
		}),
		account12: await generateAccountPrivateKey({
			lovelace: BigInt(1000000000),
		}),
		account13: await generateAccountPrivateKey({
			lovelace: BigInt(1000000000),
		}),
	};
	const user = {
		account1: await generateAccountSeedPhrase({ lovelace: BigInt(1000000000) }),
	};

	const emulator = new Emulator([
		signers.account1,
		signers.account2,
		signers.account3,
		signers.account11,
		signers.account12,
		signers.account13,
		user.account1,
	]);

	console.log("[INFO] Emulator Ledger:", emulator.ledger);

	const lucid = await Lucid.new(emulator);

	console.log("[State] Initializing Multisig");

	// Set initial signers, at the moment the MultiSigMintPolicy takes one signer to initialize the datum
	const multiSigConfig: ConfigMultiSig = {
		requiredCount: 1,
		keys: [
			lucid.utils.paymentCredentialOf(signers.account1.address).hash,
			// lucid.utils.paymentCredentialOf(signers.account2.address).hash,
			// lucid.utils.paymentCredentialOf(signers.account3.address).hash,
		],
	};
	console.log("[INFO] Initial Configuration", multiSigConfig);

	// initialize and submit MultiSigCert NFT with Datums
	lucid.selectWalletFromPrivateKey(signers.account1.privateKey);
	const deployments = await multisig_deploy.submit(lucid, multiSigConfig);

	const scripts = deployments.scripts;
	emulator.awaitBlock(4);
	console.log("[INFO] Endpoint result (multisig_deploy.submit): ", deployments);
	console.log(
		"[INFO] New UTXO at multisigValidator: ",
		await lucid.utxosAt(
			lucid.utils.validatorToAddress(scripts.multiSigValidator)
		)
	);

	console.log("[State] Updating Multisig");
	// Set MultiSigCert NFT , old and new signers
	const configUpdate: ConfigUpdateMultiSig = {
		unit: deployments.units.multiSigCert,
		multiSigValidator: scripts.multiSigValidator,
		oldKeys: [lucid.utils.paymentCredentialOf(signers.account1.address).hash],
		newConfig: {
			requiredCount: 2,
			keys: [
				lucid.utils.paymentCredentialOf(signers.account11.address).hash,
				lucid.utils.paymentCredentialOf(signers.account12.address).hash,
				lucid.utils.paymentCredentialOf(signers.account13.address).hash,
			],
		},
	};
	console.log("[INFO] Setting Configuration Update", configUpdate);

	// Build update transaction
	const updateTx = await multisig_update.build(lucid, configUpdate);

	// Select original signer to witness the tx
	lucid.selectWalletFromPrivateKey(signers.account1.privateKey);
	const witness1 = await multisig_update.signWitness(
		lucid,
		updateTx.toString()
	);

	//Assemble and submit old signer tx
	await multisig_update.assemble(lucid, updateTx.toString(), [witness1]);

	emulator.awaitBlock(4);

	console.log(
		"[INFO] New UTXO at multisigValidator: ",
		await lucid.utxosAt(
			lucid.utils.validatorToAddress(scripts.multiSigValidator)
		)
	);

	console.log("[State] User Requesting cBTC");

	lucid.selectWalletFromSeed(user.account1.seedPhrase);

	// This Address has Staking Credential
	const myAddress = await lucid.wallet.address();
	const bridgeAmount = 10;
	console.log(`Requesting ${bridgeAmount} cBTC to ${myAddress}`);
	const resultSubmit = await user_request.submit(
		lucid,
		bridgeAmount,
		myAddress,
		"15U6C9gZs5G3i11gTfmhqCaKK6V7bqGdmi",
		scripts.guardianValidator
	);

	emulator.awaitBlock(4);

	console.log("[INFO] Endpoint result (user_request.submit): ", resultSubmit);
	console.log(
		"[INFO] New UTXO at guardianValidator: ",
		await lucid.utxosAt(
			lucid.utils.validatorToAddress(scripts.guardianValidator)
		)
	);

	console.log("[State] Getting Valid Datum and UTXO");

	const validDatumUtxoList = await utils.getValidDatums(
		lucid,
		scripts.guardianValidator
	);
	if (!validDatumUtxoList?.length) {
		console.log("[INFO] No valid datums at Guardian Script");
		return null;
	}
	console.log("[INFO] validDatumUtxoList: ", validDatumUtxoList);

	const configSign: ConfigFullFill = {
		unit: deployments.units.multiSigCert,
		scripts: scripts,
		keys: [
			lucid.utils.paymentCredentialOf(signers.account11.address).hash,
			lucid.utils.paymentCredentialOf(signers.account12.address).hash,
			lucid.utils.paymentCredentialOf(signers.account13.address).hash,
		],
	};

	lucid.selectWalletFromPrivateKey(signers.account11.privateKey);

	const fulfillTx = await multisig_fullfill.build(
		lucid,
		[validDatumUtxoList[0]],
		configSign
	);

	lucid.selectWalletFromPrivateKey(signers.account11.privateKey);
	const witness11 = await multisig_fullfill.signWitness(
		lucid,
		fulfillTx.toString()
	);

	lucid.selectWalletFromPrivateKey(signers.account12.privateKey);
	const witness12 = await multisig_fullfill.signWitness(
		lucid,
		fulfillTx.toString()
	);

	lucid.selectWalletFromPrivateKey(signers.account13.privateKey);
	const witness13 = await multisig_fullfill.signWitness(
		lucid,
		fulfillTx.toString()
	);

	const assembleTx = await multisig_fullfill.assemble(
		lucid,
		fulfillTx.toString(),
		[witness11, witness12, witness13]
	);

	emulator.awaitBlock(4);

	lucid.selectWalletFromSeed(user.account1.seedPhrase);

	console.log(
		`[INFO] Received ${bridgeAmount} cBTC at user wallet: `,
		await lucid.wallet.getUtxos()
	);

	const burnAmount = -5;
	const btcAddress = "15U6C9gZs5G3i11gTfmhqCaKK6V7bqGdmi";
	const resultBurn = await user_burn.submit(
		lucid,
		burnAmount,
		btcAddress,
		deployments.scripts.cBTCMintingPolicy
	);
	console.log(resultBurn);

	emulator.awaitBlock(4);

	console.log(
		`[INFO] Burnt ${burnAmount} cBTC at user wallet: `,
		await lucid.wallet.getUtxos()
	);
};

// Run emulator with user address withouth staking credential
export const run2 = async () => {
	console.log("[State]: initializing Emulator");
	//TODO: use generateAccountSeedPhrase instead
	const signers = {
		account1: await generateAccountPrivateKey({
			lovelace: BigInt(1000000000),
		}),
		account2: await generateAccountPrivateKey({
			lovelace: BigInt(1000000000),
		}),
		account3: await generateAccountPrivateKey({
			lovelace: BigInt(1000000000),
		}),
		account11: await generateAccountPrivateKey({
			lovelace: BigInt(1000000000),
		}),
		account12: await generateAccountPrivateKey({
			lovelace: BigInt(1000000000),
		}),
		account13: await generateAccountPrivateKey({
			lovelace: BigInt(1000000000),
		}),
	};
	const user = {
		account1: await generateAccountPrivateKey({ lovelace: BigInt(1000000000) }),
	};

	const emulator = new Emulator([
		signers.account1,
		signers.account2,
		signers.account3,
		signers.account11,
		signers.account12,
		signers.account13,
		user.account1,
	]);

	console.log("[INFO] Emulator Ledger:", emulator.ledger);

	const lucid = await Lucid.new(emulator);

	console.log("[State] Initializing Multisig");

	// Set initial signers, at the moment the MultiSigMintPolicy takes one signer to initialize the datum
	const multiSigConfig: ConfigMultiSig = {
		requiredCount: 1,
		keys: [
			lucid.utils.paymentCredentialOf(signers.account1.address).hash,
			// lucid.utils.paymentCredentialOf(signers.account2.address).hash,
			// lucid.utils.paymentCredentialOf(signers.account3.address).hash,
		],
	};
	console.log("[INFO] Initial Configuration", multiSigConfig);

	// initialize and submit MultiSigCert NFT with Datums
	lucid.selectWalletFromPrivateKey(signers.account1.privateKey);
	const deployments = await multisig_deploy.submit(lucid, multiSigConfig);

	const scripts = deployments.scripts;
	emulator.awaitBlock(4);
	console.log("[INFO] Endpoint result (multisig_deploy.submit): ", deployments);
	console.log(
		"[INFO] New UTXO at multisigValidator: ",
		await lucid.utxosAt(
			lucid.utils.validatorToAddress(scripts.multiSigValidator)
		)
	);

	console.log("[State] Updating Multisig");
	// Set MultiSigCert NFT , old and new signers
	const configUpdate: ConfigUpdateMultiSig = {
		unit: deployments.units.multiSigCert,
		multiSigValidator: scripts.multiSigValidator,
		oldKeys: [lucid.utils.paymentCredentialOf(signers.account1.address).hash],
		newConfig: {
			requiredCount: 2,
			keys: [
				lucid.utils.paymentCredentialOf(signers.account11.address).hash,
				lucid.utils.paymentCredentialOf(signers.account12.address).hash,
				lucid.utils.paymentCredentialOf(signers.account13.address).hash,
			],
		},
	};
	console.log("[INFO] Setting Configuration Update", configUpdate);

	// Build update transaction
	const updateTx = await multisig_update.build(lucid, configUpdate);

	// Select original signer to witness the tx
	lucid.selectWalletFromPrivateKey(signers.account1.privateKey);
	const witness1 = await multisig_update.signWitness(
		lucid,
		updateTx.toString()
	);

	//Assemble and submit old signer tx
	await multisig_update.assemble(lucid, updateTx.toString(), [witness1]);

	emulator.awaitBlock(4);

	console.log(
		"[INFO] New UTXO at multisigValidator: ",
		await lucid.utxosAt(
			lucid.utils.validatorToAddress(scripts.multiSigValidator)
		)
	);

	console.log("[State] User Requesting cBTC");

	lucid.selectWalletFromPrivateKey(user.account1.privateKey);

	// This Address has Staking Credential
	const myAddress = await lucid.wallet.address();
	const bridgeAmount = 10;
	console.log(`Requesting ${bridgeAmount} cBTC to ${myAddress}`);
	const resultSubmit = await user_request.submit(
		lucid,
		bridgeAmount,
		myAddress,
		"15U6C9gZs5G3i11gTfmhqCaKK6V7bqGdmi",
		scripts.guardianValidator
	);

	emulator.awaitBlock(4);

	console.log("[INFO] Endpoint result (user_request.submit): ", resultSubmit);
	console.log(
		"[INFO] New UTXO at guardianValidator: ",
		await lucid.utxosAt(
			lucid.utils.validatorToAddress(scripts.guardianValidator)
		)
	);

	console.log("[State] Getting Valid Datum and UTXO");

	const validDatumUtxoList = await utils.getValidDatums(
		lucid,
		scripts.guardianValidator
	);
	if (!validDatumUtxoList?.length) {
		console.log("[INFO] No valid datums at Guardian Script");
		return null;
	}
	console.log("[INFO] validDatumUtxoList: ", validDatumUtxoList);

	const configSign: ConfigFullFill = {
		unit: deployments.units.multiSigCert,
		scripts: scripts,
		keys: [
			lucid.utils.paymentCredentialOf(signers.account11.address).hash,
			lucid.utils.paymentCredentialOf(signers.account12.address).hash,
			lucid.utils.paymentCredentialOf(signers.account13.address).hash,
		],
	};

	lucid.selectWalletFromPrivateKey(signers.account11.privateKey);

	const fulfillTx = await multisig_fullfill.build(
		lucid,
		[validDatumUtxoList[0]],
		configSign
	);

	lucid.selectWalletFromPrivateKey(signers.account11.privateKey);
	const witness11 = await multisig_fullfill.signWitness(
		lucid,
		fulfillTx.toString()
	);

	lucid.selectWalletFromPrivateKey(signers.account12.privateKey);
	const witness12 = await multisig_fullfill.signWitness(
		lucid,
		fulfillTx.toString()
	);

	lucid.selectWalletFromPrivateKey(signers.account13.privateKey);
	const witness13 = await multisig_fullfill.signWitness(
		lucid,
		fulfillTx.toString()
	);

	const assembleTx = await multisig_fullfill.assemble(
		lucid,
		fulfillTx.toString(),
		[witness11, witness12, witness13]
	);

	emulator.awaitBlock(4);

	lucid.selectWalletFromPrivateKey(user.account1.privateKey);

	console.log(
		`[INFO] Received ${bridgeAmount} cBTC at user wallet: `,
		await lucid.wallet.getUtxos()
	);

	const burnAmount = -5;
	const btcAddress = "15U6C9gZs5G3i11gTfmhqCaKK6V7bqGdmi";
	const resultBurn = await user_burn.submit(
		lucid,
		burnAmount,
		btcAddress,
		deployments.scripts.cBTCMintingPolicy
	);
	console.log(resultBurn);

	emulator.awaitBlock(4);

	console.log(
		`[INFO] Burnt ${burnAmount} cBTC at user wallet: `,
		await lucid.wallet.getUtxos()
	);
};