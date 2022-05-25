/** @param {NS} ns */
export async function main(ns) {
	ns.disableLog("ALL");

	// Options
	const skipStockBot = true;
	const skipBuyServer = true;

	// First kill all process on home machine except this script and stock-bot
	ns.tprint("Killing home processes.")
	var processes = ns.ps();
	var isStockBot = false;
	processes.forEach( function(x) {
		if (x.filename != "restart-scripts.js" && x.filename != "stock-bot.js" && x.filename != "stock-bot-v2.js") 
			ns.kill(x.pid);
		else if (x.filename == "stock-bot.js" || x.filename != "stock-bot-v2.js")
			isStockBot = true;
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

	// Stock bot goes here
	if (!isStockBot && !skipStockBot) {
		ns.tprint("Starting Stock Bot...");
		ns.run("stock-bot.js", 1);
	}

	// Spread the jank
	ns.tprint("Starting Spread Daemon...");
	ns.run("auto-spread-v2.js", 1);

	await ns.sleep(5000);

	// Start the hacknet script
	ns.tprint("Starting Hacknet Manager...");
	ns.run("hacknet-mgr.js", 1);

	await ns.sleep(500);

	// Buy server script goes here
	if (!skipBuyServer) {
		ns.tprint("Starting Buy Server Script...");
		ns.run("buy-server.js", 1);
	}

	ns.tprint("Done :D !");
}