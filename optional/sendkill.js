/** @param {NS} ns */
export async function main(ns) {
	ns.tprint("Sending Kill Command...");
	await ns.tryWritePort(20, "die");
	ns.tprint("Have a nice day :)");
}