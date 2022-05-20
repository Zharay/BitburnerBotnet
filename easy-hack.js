/** @param {NS} ns */
export async function main(ns) {
	var threshModifier = 0.8;

	// Get targets from coordinator
	var gTargets = ns.getPortHandle(1);

	while (gTargets.peek() == "NULL PORT DATA") {
		ns.print("Waiting for targets to be added by coordinator...")
		await ns.sleep(1000);
	}	

	var randWait = 1000 * Math.floor((Math.random() * 30) + 3);
	ns.print("Waiting for [" + (randWait / 1000) + "] seconds");
	await ns.sleep(randWait);

	var jTargets = JSON.parse(gTargets.peek());
	
	var	target = jTargets[0].target;

	var moneyTreshold = ns.getServerMaxMoney(target) * threshModifier;
	var securityThreshold = ns.getServerMinSecurityLevel(target) + 5;

	var fKill = ns.getPortHandle(20);
	
	while (fKill.peek() == "NULL PORT DATA") {
		if (ns.getServerSecurityLevel(target) > securityThreshold) {
			ns.print("Weakening defenses...");
			await ns.weaken(target);
		} else if (ns.getServerMoneyAvailable(target) < moneyTreshold) {
			ns.print("Growing money...");
			await ns.grow(target);
		} else {
			ns.print("Hacking...");
			await ns.hack(target);
		}
	}
}