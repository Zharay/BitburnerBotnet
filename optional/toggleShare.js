/**A simple script to send the share command to the botnet.
 * It does this by sending the word "share" to port 17.
 * Any hack-daemons running on home or private servers will see this
 * and dedicate its resources towards using the ShareCPU script.
 * 
 * 	Written By: Zharay
 * 	URL: https://github.com/Zharay/BitburnerBotnet
**/

/** @param {NS} ns */
export async function main(ns) {
    if (ns.peek(17) == "share") {
        ns.tprint("Telling private servers to stop sharing...");
        await ns.clearPort(17);
    } else {
        ns.tprint("Telling private servers to start sharing...");
        await ns.tryWritePort(17, "share");
    }
	ns.tprint("Have a nice day :)");
}