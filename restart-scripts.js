/**Shuts down everything. Then restarts them again!
 * Unfortunately it's not as robust as it sounds. It uses the
 * host list provided by the coordinator to do the heavy lifting
 * for us. Then it kills each server's script before running the 
 * main scripts used by the home server (namely auto-spread-v2 which
 * will do the job of re-uploading files, running the coordinator, and
 * every hack-daemon on the network).
 * 
 * This script is also used to quickly launch optional scripts.
 * 	Written By: Zharay
 * 	URL: https://github.com/Zharay/BitburnerBotnet
**/

/** @param {NS} ns */
export async function main(ns) {
	ns.disableLog("ALL");

	// Options
	const runStockBot = false;
	const runStockBotV2 = false;
	const runHacknetMgr = false;
	const runBuyServer = false;
	const runCorpo = false;
	const runHackGang = false;
	const enableShare = false;

	// First kill all process on home machine except this script and stock-bot
	ns.tprint("Killing home processes.")
	var processes = ns.ps();
	var isStockBot = false;
	var isCorpo = false;
	var isGang = false;
	processes.forEach( function(x) {
		if (x.filename != "restart-scripts.js" 
				&& x.filename != "stock-bot.js" && x.filename != "stock-bot-v2.js"
				&& x.filename != "corpo.js" && x.filename != "gang-nullsec.js")
			ns.kill(x.pid);
		else if (x.filename == "stock-bot.js" || x.filename == "stock-bot-v2.js")
			isStockBot = true;
		else if (x.filename == "corpo.js")
			isCorpo = true;
		else if (x.filename == "gang-nullsec.js")
			isGang = true;
	} );

	// We can make use port 2 to kill any servers running a hack-daemon!
	if (ns.peek(2) != "NULL PORT DATA") {
		var jHosts = JSON.parse(ns.peek(2));

		jHosts.forEach( (h) => {
			if (h.host == "home")
				return;
				
			ns.tprint("Killing all scripts on [" + h.host + "]");
			ns.killall(h.host);
		});
	}

	// Clear the ports
	ns.tprint("Clearing Ports...");
	for(var i = 1; i <= 20; i++)
		ns.clearPort(i);

	// DOUBLY make sure to kill ports
	ns.tprint("Making sure ports are clear...");
	for(var i = 1; i <= 20; i++) {
		while (await ns.readPort(i) != "NULL PORT DATA") await ns.sleep(500);
	}

	// Tell private servers to share CPU cycles
	if (enableShare) {
		ns.tprint("Telling private servers to start sharing...");
        await ns.tryWritePort(17, "share");
	}

	// Stock bot goes here
	if (!isStockBot && runStockBot) {
		ns.tprint("Starting Stock Bot...");
		ns.run("stock-bot.js", 1);
	}

	// Stock bot goes here
	if (!isStockBot && runStockBotV2) {
		ns.tprint("Starting Stock Bot V2...");
		ns.run("stock-bot-v2.js", 1);
	}

	// Corpo script goes here
	if (!isCorpo && runCorpo) {
		ns.tprint("Starting Corpo Script...");
		ns.run("corpo.js", 1);
	}

	// Gang script goes here
	if (!isGang && runHackGang) {
		ns.tprint("Starting Gang Script...");
		ns.run("gang-nullsec.js", 1);
	}

	// Spread the jank
	ns.tprint("Starting Spread Daemon...");
	ns.run("auto-spread-v2.js", 1);
	await ns.sleep(5000);

	// Start the hacknet script
	if (runHacknetMgr) {
		ns.tprint("Starting Hacknet Manager...");
		ns.run("hacknet-mgr.js", 1);
		await ns.sleep(500);
	}

	// Buy server script goes here
	if (runBuyServer) {
		ns.tprint("Starting Buy Server Script...");
		ns.run("buy-server.js", 1);
	}

	ns.tprint("Done :D !");
}