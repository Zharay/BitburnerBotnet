/**A script for sending a kill command to a specific hack-daemon in the network.
 * It does this by sending the server's name to port 18.
 * If the hack-daemon see's its hostname on this port, it will shutdown.
 * 
 * 	Written By: Zharay
 * 	URL: https://github.com/Zharay/BitburnerBotnet
**/

/** @param {NS} ns */
export async function main(ns) {
	ns.disableLog("ALL");
	
	var host = "";
	if (ns.args.length) {
		host = ns.args[0];
	} else {
		ns.tprint("ERROR: No host set!");
		ns.tprint("run killServer.js [hostname]");
		return;
	}

	if (!ns.serverExists(host)) {
		ns.tprint(`ERROR: Host [${host}] does not exist!`)
		ns.tprint("run killServer.js [hostname]");
		return;
	}

	await ns.tryWritePort(18, host);
	ns.tprint(`Send kill request to [${host}]!`);
}