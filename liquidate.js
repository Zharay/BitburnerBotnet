/** @param {NS} ns */
export async function main(ns) {
	ns.tprint("Liquidating assets...");
	await ns.tryWritePort(19, "sell");
	ns.tprint("Mo' Money Mo' Money ;)");
}