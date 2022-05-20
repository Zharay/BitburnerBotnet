/** @param {NS} ns */
export async function main(ns) {
	ns.disableLog("ALL");
	var memLevel = 4;				// 4 = 16GB
	const maxLevel = 20; 				// True maximum is 20 (1048576GB = 1 Petrabyte) 
	const spendPercentage = 0.02; 	// Percentage of maximum money to spend on server upgrades.
	const ramUsageThreshold = 0.8;	// Percentage of global ram used in hacks. If it goes beyond this, upgrade for more capacity.
	const waitInterval = 1000*60*5; 	// Time to wait between cycles (in ms)

	var fKill = ns.getPortHandle(20);
	var gRam = ns.getPortHandle(4);
	var upgradeCount = 0;

	ns.print("Waiting for coordinator...");
	while (!ns.scriptRunning("coordinator.js", "home"))
		await ns.sleep(1000);

	var pservers = ns.getPurchasedServers();

	// Get the current memory level
	for(var i = 1; i < pservers.length; i++) {
		if(ns.getServerMaxRam(pservers[0]) != ns.getServerMaxRam(pservers[i])) {
			memLevel = Math.log2(ns.getServerMaxRam(pservers[0]) > ns.getServerMaxRam(pservers[i]) ? ns.getServerMaxRam(pservers[0]) : ns.getServerMaxRam(pservers[i]));
		}
	}
	if (memLevel == 4 && pservers.length > 0)
		memLevel = Math.log2(ns.getServerMaxRam(pservers[0])) + 1;
	
	ns.print(`Starting with Memory Level: ${memLevel} (${ns.nFormat(Math.pow(2, memLevel) * Math.pow(1000,3), "0.00b")})`);

	while (memLevel <= maxLevel && fKill.peek() == "NULL PORT DATA") {
		pservers = ns.getPurchasedServers();
		var globalRamUsage = 0;
		var globalMaxRam = 0;
		var globalUsedRam = 0;
		
		// Get the current ram usage. [Note: DO NOT use port 4 for this. It is VERY slow]
		pservers.forEach(p => {
			globalUsedRam += ns.getServerUsedRam(p);
			globalMaxRam += ns.getServerMaxRam(p);
		})
		if (globalMaxRam) globalRamUsage = globalUsedRam / globalMaxRam;
		else globalRamUsage = 1.0;
		
		// Buy servers until we reach cap
		if (pservers.length < 24) {
			ns.print(" ");
			ns.print("Not at maximum server count. Attempting to buy some...");

			while ((ns.getServerMoneyAvailable("home") * spendPercentage) > ns.getPurchasedServerCost(Math.pow(2, memLevel))) {
				ns.print("Purchasing a [" + Math.pow(2, memLevel) + "GB] server...");
				
				var hostname = ns.purchaseServer("pserv-" + Math.pow(2, memLevel), Math.pow(2, memLevel));	
				if (!ns.serverExists(hostname)) {
					ns.print("ERROR: Failed to buy server! (Maxed out?)");
					break;
				}
				
				var files = ["hack-daemon.js", "easy-hack.js", "weaken.js", "grow.js", "hack.js", "raze.js"];
				ns.print("Copying files to server...");
				await ns.scp(files, hostname); 
				
				ns.print("Running Hack-Daemon...");
				ns.exec("hack-daemon.js", hostname, 1);
			}

			ns.print("Warning: Not enough money. ( " + ns.nFormat(ns.getServerMoneyAvailable("home") * spendPercentage, "$0.000a") + " / " + ns.nFormat(ns.getPurchasedServerCost(Math.pow(2, memLevel)), "$0.000a") + " )");

		// Buy servers only if we are not up to our ram threshold
		} else if (globalRamUsage >= ramUsageThreshold) {

			ns.print(`Private server ram is at [${ns.nFormat(globalRamUsage, "0.00%")}]. Attempting to upgrade...`);

			for(var i = 0; i < pservers.length; i++) {
				if ((ns.getServerMoneyAvailable("home") * spendPercentage) > ns.getPurchasedServerCost(Math.pow(2, memLevel)) && globalRamUsage >= ramUsageThreshold) {
					if (ns.getServerMaxRam(pservers[i]) < Math.pow(2, memLevel)) {
						ns.print("Going to remove " + pservers[i] + " (" + pservers[i].split("-")[1] + " GB)");
						
						ns.print("Killing hack-daemon.js...")
						ns.scriptKill("hack-daemon.js", pservers[i]);

						ns.print("Telling coordinator we deleted [" + pservers[i] + "]")
						await ns.tryWritePort(12, pservers[i]);
						
						ns.print("Killing for tasks...")
						var processes = ns.ps(pservers[i]);
						var task = {"target" : "", "host" : "", "task" : "", "done" : true, "threads" : 0, "ram" : 0, "security" : 0};

						// This whole bit is a mirror of what each task would do when they finish. The coordinator needs to know that they are done.
						for (var p of processes) {
							task.ram = 0;
							task.security = 0;
							if (p.filename == "grow.js") {
								task.task = "grow";
								task.target = p.args[0];
								task.host = p.args[2];
								task.threads = parseInt(p.args[3]);

								if (task.host != "EXP") {
									task.ram = parseFloat(p.args[4]);
									task.security = parseFloat(p.args[5]) * -1;
									
									ns.print("Reporting grow.js task done to coordinator");
									await ns.tryWritePort(13, JSON.stringify(task));
								} else {
									ns.print("Reporting EXP task done to coordinator");
									await ns.tryWritePort(14, JSON.stringify(task));
								}
								ns.print("Killing grow...")
								ns.kill(p.pid, pservers[i]);

							} else if (p.filename == "weaken.js" || p.filename == "hack.js") {
								task.task = "weaken";
								task.target = p.args[0];
								task.host = p.args[1];
								task.threads = parseInt(p.args[2]);

								if (task.host != "EXP") {
									task.ram = parseFloat(p.args[3]);
									task.security = parseFloat(p.args[4]) * -1;
									
									ns.print(`Reporting ${p.filename} task done to coordinator`);
									await ns.tryWritePort(13, JSON.stringify(task));
								} else {
									ns.print("Reporting EXP task done to coordinator");
									await ns.tryWritePort(14, JSON.stringify(task));
								}
								ns.print(`Killing ${p.filename}...`)
								ns.kill(p.pid, pservers[i]);
							}
						}
						
				//		while(ns.scriptRunning("grow.js", pservers[i]) || ns.scriptRunning("weaken.js", pservers[i]) || ns.scriptRunning("hack.js", pservers[i]))
				//			await ns.sleep(500);

						if (ns.peek(12) != "NULL PORT DATA") {
							ns.print("Waiting for coordinator to delete server...")
							while (ns.peek(12) != "NULL PORT DATA")
								await ns.sleep(500);
						}

						ns.print("Killng and deleting server...")
						ns.killall(pservers[i]);
						ns.deleteServer(pservers[i]);

						ns.print("Upgrading [" + pservers[i] + "] to a [" + Math.pow(2, memLevel) + "GB] server...");
						var hostname = ns.purchaseServer("pserv-" + Math.pow(2, memLevel), Math.pow(2, memLevel));
						if (hostname.split("-").length <= 0) {
							ns.print("ERROR: Failed to buy server! (Maxed out?)");
							return;
						}

						var files = ["hack-daemon.js", "easy-hack.js", "weaken.js", "grow.js", "hack.js", "raze.js"];
						ns.print("Copying files to server...");
						await ns.scp(files, hostname); 

						ns.print("Running Hack-Daemon...");
						ns.exec("hack-daemon.js", hostname, 1);
						++upgradeCount;
					} else {
						ns.print("Skipping [" + pservers[i] + "]. RAM >= request.")
						++upgradeCount;
					}
				} else if (globalRamUsage >= ramUsageThreshold) {
					ns.print("[" + (i < 10 ? "0" : "") + i + "] Warning: Not enough money. ( " + ns.nFormat(ns.getServerMoneyAvailable("home") * spendPercentage, "$0.000a") + " / " + ns.nFormat(ns.getPurchasedServerCost(Math.pow(2, memLevel)), "$0.000a") + " )");
				} else {
					ns.print(`Private server ram is sufficient (${ns.nFormat(globalRamUsage, "0.00%")}). SKIP!`);
				}
			}
		} else {
			ns.print(`Private server ram is sufficient (${ns.nFormat(globalRamUsage, "0.00%")}). SKIP!`);
		}

		if (upgradeCount >= 25) {
			memLevel++;
			upgradeCount = 0;
			ns.print("Increasing Memory Level: " + memLevel + " (" + Math.pow(2, memLevel) + "GB @ $" + ns.nFormat(ns.getPurchasedServerCost(Math.pow(2, memLevel)), "$0.000a") + ")");
		} 		
		
		ns.print(`Sleeping for ${ns.tFormat(waitInterval)}`);
		await ns.sleep(waitInterval);
		ns.print(" ");
	}
}