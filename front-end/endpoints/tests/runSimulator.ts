import { Lucid } from "lucid-cardano";
import * as multisig_update from "../multisig.update";
import * as multisig_deploy from "../multisig.deploy";
import * as multisig_fullfill from "../multisig.fullfill";
import {
	ConfigFullFill,
	ConfigMultiSig,
	ConfigUpdateMultiSig,
	DeployedScripts,
} from "../types";
import * as utils from "../utils";
import * as user_request from "../user.request";
import * as user_burn from "../user.burn";
import { deployments } from "../config.deployment";

// Accounts generated with utils.generateAddressSeedPhrase()
// These account have StakingCredential
import { signers } from "./signers";

// Accounts generated with utils.generateAddressSeedPhrase()
// These account have StakingCredential
import { user } from "./users";

// Only run this once to mint multisig nft and set datum with cosigners at multisig script
export const deploy = async (lucid: Lucid) => {
	const multiSigConfig: ConfigMultiSig = {
		requiredCount: 1,
		keys: [lucid.utils.paymentCredentialOf(signers.account1.address).hash],
	};

	console.log(multiSigConfig);

	const deployments = await multisig_deploy.submit(lucid, multiSigConfig);

	console.log(deployments);
};



export const update = async (lucid: Lucid) => {
	const configUpdate: ConfigUpdateMultiSig = {
		unit: deployments.units.multiSigCert,
		multiSigValidator: deployments.scripts.multiSigValidator,
		oldKeys: [lucid.utils.paymentCredentialOf(signers.account1.address).hash],
		newConfig: {
			requiredCount: 2,
			keys: [
				lucid.utils.paymentCredentialOf(signers.account1.address).hash,
				lucid.utils.paymentCredentialOf(signers.account2.address).hash,
				lucid.utils.paymentCredentialOf(signers.account3.address).hash,
			],
		},
	};
	console.log(configUpdate);
	lucid.selectWalletFromSeed(signers.account1.seedPhrase);

	const updateTx = await multisig_update.build(lucid, configUpdate);

	lucid.selectWalletFromSeed(signers.account1.seedPhrase);
	const witness1 = await multisig_update.signWitness(
		lucid,
		updateTx.toString()
	);

	// lucid.selectWalletFromSeed(signers.account2.seedPhrase);
	// const witness2 = await multisig_update.signWitness(
	// 	lucid,
	// 	updateTx.toString()
	// );

	// lucid.selectWalletFromSeed(signers.account3.seedPhrase);
	// const witness3 = await multisig_update.signWitness(
	// 	lucid,
	// 	updateTx.toString()
	// );

	const assembleTx = await multisig_update.assemble(
		lucid,
		updateTx.toString(),
		// [witness1,witness2, witness3]
		[witness1]
	);

	console.log(assembleTx);
};

// Fullfill requests from users
export const fullfil = async (lucid: Lucid) => {
	const configSign: ConfigFullFill = {
		unit: deployments.units.multiSigCert,
		scripts: deployments.scripts,
		keys: [
			lucid.utils.paymentCredentialOf(signers.account1.address).hash,
			lucid.utils.paymentCredentialOf(signers.account2.address).hash,
			lucid.utils.paymentCredentialOf(signers.account3.address).hash,
		],
	};

	lucid.selectWalletFromSeed(signers.account1.seedPhrase);

	// Get Valid Datums from Guardian Script
	const validDatumUtxoList = await utils.getValidDatums(
		lucid,
		deployments.scripts.guardianValidator
	);
	if (!validDatumUtxoList?.length) {
		console.log("No valid datums at Guardian Script");
		return null;
	}
	console.log("validDatumUtxoList: ", validDatumUtxoList);

	// Build transaction with Valid Datums and UTXOs
	// Guardian Minter, Guardian Script and Guardian Multisig are inlcuded
	const fulfillTx = await multisig_fullfill.build(
		lucid,
		[validDatumUtxoList[0]],
		configSign
	);

	lucid.selectWalletFromSeed(signers.account1.seedPhrase);
	const witness1 = await multisig_fullfill.signWitness(
		lucid,
		fulfillTx.toString()
	);

	lucid.selectWalletFromSeed(signers.account2.seedPhrase);
	const witness2 = await multisig_fullfill.signWitness(
		lucid,
		fulfillTx.toString()
	);

	lucid.selectWalletFromSeed(signers.account3.seedPhrase);
	const witness3 = await multisig_fullfill.signWitness(
		lucid,
		fulfillTx.toString()
	);

	const assembleTx = await multisig_fullfill.assemble(
		lucid,
		fulfillTx.toString(),
		[witness1, witness2, witness3]
	);

	console.log(assembleTx);
};

export const request = async (lucid: Lucid) => {
	lucid.selectWalletFromSeed(user.account1.seedPhrase);

	// This Address has Staking Credential
	const myAddress = await lucid.wallet.address();
	const bridgeAmount = 10;
	const btcAddress = "15U6C9gZs5G3i11gTfmhqCaKK6V7bqGdmi";
	console.log(`Requesting ${bridgeAmount} BTC to ${myAddress}`);
	lucid.utils.paymentCredentialOf(myAddress)
	
	const result = await user_request.submit(
		lucid,
		bridgeAmount,
		lucid.utils.credentialToAddress(lucid.utils.paymentCredentialOf(myAddress)),
		btcAddress,
		deployments.scripts.guardianValidator
	);
	console.log(result);
};

export const burn = async (lucid: Lucid) => {
	lucid.selectWalletFromSeed(user.account1.seedPhrase);
	const burnAmount = -12;
	const btcAddress = "15U6C9gZs5G3i11gTfmhqCaKK6V7bqGdmi";
	const result = await user_burn.submit(
		lucid,
		burnAmount,
		btcAddress,
		deployments.scripts.cBTCMintingPolicy
	);
	console.log(result);
};
