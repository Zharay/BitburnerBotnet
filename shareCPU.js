/** @param {NS} ns */
export async function main(ns) {
	while (ns.peek(17) != "NULL PORT DATA" && ns.peek(20) == "NULL PORT DATA") {
		await ns.share();
		await ns.sleep(1000);
	}
}