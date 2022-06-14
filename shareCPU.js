/**Share() script.
 * It will continuously run share() which typically only lasts for 10 seconds.
 * It will only stop when the share command is no longer set (or kill command is set)
 * Can only be ran on home or private servers and requires the hack-daemon!
 * 	Written By: Zharay
 *  URL: https://github.com/Zharay/BitburnerBotnet
**/

/** @param {NS} ns */
export async function main(ns) {
	while (ns.peek(17) != "NULL PORT DATA" && ns.peek(20) == "NULL PORT DATA") {
		await ns.share();
		await ns.sleep(1000);
	}
}