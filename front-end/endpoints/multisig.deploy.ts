import { Constr, Data, fromText, Lucid, toUnit } from "lucid-cardano";
import { ConfigMultiSig } from "./types";
import { buildScripts } from "./utils";

export const submit = async (lucid: Lucid, config: ConfigMultiSig) => {
	const walletUtxos = await lucid.wallet.getUtxos();
	const walletTxHash = walletUtxos[0].txHash;
	const walletOutputIndex = walletUtxos[0].outputIndex;

	const scripts = buildScripts(
		lucid,
		config.keys[0],
		walletTxHash,
		walletOutputIndex
	);
	const multisigValidatorAddr = lucid.utils.validatorToAddress(
		scripts.multiSigValidator
	);

	const multisigPolicyId = lucid.utils.mintingPolicyToId(
		scripts.multiSigMintingPolicy
	);

	const cBTCPolicyId = lucid.utils.mintingPolicyToId(scripts.cBTCMintingPolicy);

	const units = {
		multiSigCert: toUnit(multisigPolicyId, fromText("MultiSigCert")),
		cBTC: toUnit(cBTCPolicyId, fromText("cBTC")),
	};
	const asset = { [units.multiSigCert]: BigInt(1) };

	const Datum = Data.to(
		new Constr(0, [config.keys, BigInt(config.requiredCount)])
	);

	const RedeemerPolicy = Data.to(new Constr(0, [])); // PMintGuardianCrt

	const tx = await lucid
		.newTx()
		.collectFrom([walletUtxos[0]])
		.attachMintingPolicy(scripts.multiSigMintingPolicy)
		.mintAssets(asset, RedeemerPolicy)
		.payToContract(multisigValidatorAddr, { inline: Datum }, asset)
		.complete();

	const signedTx = await tx.sign().complete();
	const txHash = await signedTx.submit();
	return { txHash, scripts, units };
};
