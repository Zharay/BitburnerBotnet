/**Simple script that toggles a port flag telling our stock-bots to sell everything.
 *  Written By: Zharay
 *  URL: https://github.com/Zharay/BitburnerBotnet
 *  Requires 1.6Gb of RAM to run! (could be done remotely on any server)
 */

/** @param {NS} ns */
export async function main(ns) {
	if (ns.peek(19) == "share") {
        ns.tprint("Clearing liquidation...");
        await ns.clearPort(19);
	ns.tprint("Have a nice day :)");
    } else {
        ns.tprint("Liquidating assets...");
        await ns.tryWritePort(19, "sell");
		ns.tprint("Mo' Money Mo' Money ;)");
    }
}