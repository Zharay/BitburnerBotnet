/** @param {NS} ns */
export async function main(ns) {
	ns.disableLog("ALL");

	ns.tprint("Killing home processes.")
	var processes = ns.ps();
	var isStockBot = false;
	processes.forEach( function(x) {
		if (x.filename != "restart-scripts.js" && x.filename != "stock-bot.js") 
			ns.kill(x.pid);
		else if (x.filename == "stock-bot.js")
			isStockBot = true;
	} );

	if (ns.peek(2) != "NULL PORT DATA") {
		var jHosts = JSON.parse(ns.peek(2));

		jHosts.forEach( (h) => {
			if (h.host == "home")
				return;
				
			ns.tprint("Killing all scripts on [" + h.host + "]");
			ns.killall(h.host);
		});
	}

	ns.tprint("Clearing Ports...");
	for(var i = 1; i <= 20; i++)
		ns.clearPort(i);

	ns.tprint("Making sure ports are clear...");
	for(var i = 1; i <= 20; i++) {
		while (await ns.readPort(i) != "NULL PORT DATA") await ns.sleep(500);
	}

	if (!isStockBot) {
		ns.tprint("Starting Stock Bot...");
		ns.run("stock-bot.js", 1);
	}

	ns.tprint("Starting Spread Daemon...");
	ns.run("auto-spread-v2.js", 1);

	await ns.sleep(5000);

	ns.tprint("Starting Hacknet Manager...");
	ns.run("hacknet-mgr.js", 1);

	await ns.sleep(500);

	ns.tprint("Starting Buy Server Script...");
	ns.run("buy-server.js", 1);

	
	ns.tprint("Done :D !");

}