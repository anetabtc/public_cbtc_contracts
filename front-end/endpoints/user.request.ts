import {
	Constr,
	Lucid,
	Data,
	Address,
	AddressDetails,
	Script,
	fromText,
} from "lucid-cardano";

export const submit = async (
	lucid: Lucid,
	bridgeAmount: number,
	cardanoAddress: string,
	btcAddress: string,
	guardianValidator: Script
) => {
	try {
		const walletAddrDetails: AddressDetails =
			lucid.utils.getAddressDetails(cardanoAddress);
		const guardianValidatorAddr: Address =
			lucid.utils.validatorToAddress(guardianValidator);
		const paymentCred = new Constr(0, [
			walletAddrDetails.paymentCredential?.hash,
		]);
		const stakingCred = walletAddrDetails.stakeCredential?.hash
			? new Constr(0, [
					new Constr(0, [
						new Constr(0, [walletAddrDetails.stakeCredential?.hash]),
					]),
			  ])
			: new Constr(1, []);

		// Supports Address {addressCredential :: Credential,addressStakingCredential :: Maybe StakingCredential}
		const addressAsData = new Constr(0, [paymentCred, stakingCred]);
		const Datum = Data.to(
			new Constr(0, [BigInt(bridgeAmount), fromText(btcAddress), addressAsData])
		);
		const tx = await lucid
			.newTx()
			.payToContract(
				guardianValidatorAddr,
				{ inline: Datum },
				{ lovelace: BigInt(1000000) }
			)
			.complete();

		const signedTx = await tx.sign().complete();

		const txHash = signedTx.submit();
		return txHash;
	} catch (error) {
		if (error instanceof Error) return error;
		return Error(`error : ${JSON.stringify(error)}`);
	}
};
