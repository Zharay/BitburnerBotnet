/**A script for sending the kill command to any scripts that accepts it.
 * Sends the word "kill" to port 20. 
 * Mainly used to kill all hack-daemons of the botnet.
 * 
 * 	Written By: Zharay
 * 	URL: https://github.com/Zharay/BitburnerBotnet
**/

/** @param {NS} ns */
export async function main(ns) {
	ns.tprint("Sending Kill Command...");
	await ns.tryWritePort(20, "die");
	ns.tprint("Have a nice day :)");
}