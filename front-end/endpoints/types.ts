import { Data, KeyHash, Script, TxHash, Unit, UTxO } from "lucid-cardano";

export type ValidDatumUTXO = {
	datum: { bridgeAmount: bigint; cardanoAddress: string; btcAddress: string };
	utxo: UTxO;
};

export type AnyDatumUTXO = {
	isValid: boolean;
	datum: { amountDeposit: bigint; address: string } | Data;
	utxo: UTxO;
};

export type ConfigMultiSig = {
	keys: KeyHash[];
	requiredCount: number;
};

export type ConfigUpdateMultiSig = {
	multiSigValidator: Script;
	unit: Unit;
	oldKeys: KeyHash[];
	newConfig: ConfigMultiSig;
};

export type ConfigFullFill = {
	unit: Unit;
	scripts: DeployedScripts;
	keys: KeyHash[];
};

export type DeployedScripts = {
	multiSigValidator: Script;
	multiSigMintingPolicy: Script;
	guardianValidator: Script;
	cBTCMintingPolicy: Script;
};

export type Deployments = {
	txHash: TxHash;
	scripts: DeployedScripts;
	units: {
		multiSigCert: Unit;
		cBTC: Unit;
	};
};
