/**Spits out a list of all EXP servers used by the botnet.
 * Requires the coordinator to be up and running for this to work!
 * 	Written By: Zharay
 * 	URL: https://github.com/Zharay/BitburnerBotnet
**/

/** @param {NS} ns */
export async function main(ns) {
	var gExp = ns.getPortHandle(5);
	if (gExp.peek() == "NULL PORT DATA") {
		ns.tprint("No EXP servers found!");
		return;
	}

	var jEXp = JSON.parse(gExp.peek());
	jEXp.sort((a, b) => ns.getServerMaxMoney(b.target) - ns.getServerMaxMoney(a.target));

	for (var i = 0; i < jEXp.length; i++) {
		var target = jEXp[i].target;
		ns.tprint(`Host: ${target}\t (HL ${ns.getServerRequiredHackingLevel(target)})`);
		ns.tprint(`Security: ${ns.nFormat(ns.getServerSecurityLevel(target), "0.00")} / ${ns.getServerMinSecurityLevel(target) + 5}`);
		ns.tprint(`Money: ${ns.nFormat(ns.getServerMoneyAvailable(target), "$0.00a")} / ${ns.nFormat(ns.getServerMaxMoney(target), "$0.00a")}`);
		ns.tprint(`Growth: ${ns.getServerGrowth(target)}`);
		ns.tprint("");
	}	
}