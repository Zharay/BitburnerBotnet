/** A more in-depth server information script
 * With provided threshold, you can obtain all the info you need on the servers you want
 * 
 * Usage: run optional/getServerStatus.js [ThresholdModifier] [Server] [Server] ...
 * Example: run optional/getServerStatus.js 0.8 n00dles harakiri-sushi
 * 
 * Written By: Zharay
 * URL: https://github.com/Zharay/BitburnerBotnet
**/

/** @param {NS} ns */
export async function main(ns) {

	if (!ns.args.length) {
		ns.tprint("ERROR: Arguements = [ThresholdModifier] [Server] [Server] [Server]...")
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

			ns.tprint(`RAM: ${ns.getServerRam(target)}`);
			ns.tprint("Security: " + ns.getServerSecurityLevel(target) + " / " + securityThreshold);
			ns.tprint("Money: " + ns.nFormat(ns.getServerMoneyAvailable(target), "$0.00a") + " / " + ns.nFormat(moneyTreshold, "$0.00a") + " (" + ns.nFormat(ns.getServerMaxMoney(target), "$0.00a") + ")");
			ns.tprint("Growth: " + ns.getServerGrowth(target));
		}

		await ns.sleep(1000);
		return;
	}
}