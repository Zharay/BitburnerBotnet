function convertMoney (labelValue) {

    // Nine Zeroes for Billions
    return Math.abs(Number(labelValue)) >= 1.0e+9

    ? (Math.abs(Number(labelValue)) / 1.0e+9).toFixed(2) + "B"
    // Six Zeroes for Millions 
    : Math.abs(Number(labelValue)) >= 1.0e+6

    ? (Math.abs(Number(labelValue)) / 1.0e+6).toFixed(2) + "M"
    // Three Zeroes for Thousands
    : Math.abs(Number(labelValue)) >= 1.0e+3

    ? (Math.abs(Number(labelValue)) / 1.0e+3).toFixed(2) + "K"

    : Math.abs(Number(labelValue));
}

/** @param {NS} ns */

export async function main(ns) {

	if (!ns.args.length) {
		ns.tprint("ERROR: Arguements = [ThresholdModifier] [Server]")
		return;
	}

	var threshModifier = 0.75;
	if (ns.args.length > 1) {
		threshModifier = parseFloat(ns.args[0]);
		if (threshModifier <= 0) {
			ns.tprint("ERROR: Threshold is set to [" + threshModifier + "]");
			return;
		}
	}

	while (true) {
		for (var i = 1; i < ns.args.length; i++) {
			var target = ns.args[i];
			
			ns.tprint("Target: " + target);

			if (!ns.serverExists(target)) {
				ns.tprint("ERROR: Server [" + target + "] does not exist");
				continue;
			}

			var moneyTreshold = ns.getServerMaxMoney(target) * threshModifier;
			var securityThreshold = ns.getServerMinSecurityLevel(target) + 5;
		
			ns.tprint("Security: " + ns.getServerSecurityLevel(target) + " / " + securityThreshold);
			ns.tprint("Money: " + convertMoney(ns.getServerMoneyAvailable(target)) + " / " + convertMoney(moneyTreshold) + " (" + convertMoney(ns.getServerMaxMoney(target)) + ")");
			ns.tprint("Growth: " + ns.getServerGrowth(target));
		}

		await ns.sleep(1000);
		return;
	}
}