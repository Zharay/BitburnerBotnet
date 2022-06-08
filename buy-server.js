/** @param {NS} ns */
export async function main(ns) {
	ns.disableLog("ALL");
	
	var memLevel = 4;					// 4 = 16GB
	const maxLevel = 20; 				// True maximum is 20 (1048576GB = 1 Petabyte) 
	const spendPercentage = 0.2; 		// Percentage of maximum money to spend on server upgrades.
	const ramUsageThreshold = 0.8;		// Percentage of global ram used in hacks. If it goes beyond this, upgrade for more capacity.
	const waitInterval = 1000*60*1; 	// Time to wait between cycles (in ms)

	var fKill = ns.getPortHandle(20);
	var fHostKill = ns.getPortHandle(18);
	var upgradeCount = 0;

	ns.print("Waiting for coordinator...");
	while (ns.peek(1) == "NULL PORT DATA")
		await ns.sleep(1000);

	var pservers = ns.getPurchasedServers();

	// Get the current memory level
	for(var i = 1; i < pservers.length; i++) {
		if(ns.getServerMaxRam(pservers[0]) != ns.getServerMaxRam(pservers[i])) {
			memLevel = Math.log2(ns.getServerMaxRam(pservers[0]) > ns.getServerMaxRam(pservers[i]) ? ns.getServerMaxRam(pservers[0]) : ns.getServerMaxRam(pservers[i]));
		}
	}
	if (memLevel == 4 && pservers.length > 0)
		memLevel =1 + Math.log2(ns.getServerMaxRam(pservers[0]));

	ns.print(`Starting with Memory Level: ${memLevel} (${ns.nFormat(Math.pow(2, memLevel) * Math.pow(1000,3), "0.00b")})`);

	// Clear fHostKill - Just incase something is still there
	fHostKill.clear();

	while (memLevel <= maxLevel && fKill.peek() == "NULL PORT DATA") {
		pservers = ns.getPurchasedServers();
		var globalRamUsage = 0;
		var globalMaxRam = 0;
		var globalUsedRam = 0;
		
		// Get the current ram usage. [Note: DO NOT use port 4 for this. It is VERY slow]
		pservers.forEach(p => {
			globalUsedRam += ns.getServerUsedRam(p);
			globalMaxRam += ns.getServerMaxRam(p);
		});
		
		if (globalMaxRam) globalRamUsage = globalUsedRam / globalMaxRam;
		else globalRamUsage = 1.0;
		
		// Buy servers until we reach cap
		if (pservers.length < 24) {
			ns.print(" ");
			ns.print("Not at maximum server count. Attempting to buy some...");

			while ((ns.getServerMoneyAvailable("home") * spendPercentage) > ns.getPurchasedServerCost(Math.pow(2, memLevel))) {
				ns.print(`Purchasing a [${Math.pow(2, memLevel)} GB] server... (${ns.nFormat(ns.getPurchasedServerCost(Math.pow(2, memLevel), "$0.00a"))})`);
				
				var hostname = ns.purchaseServer("pserv-" + Math.pow(2, memLevel), Math.pow(2, memLevel));	
				if (!ns.serverExists(hostname)) {
					ns.print(`ERROR: Failed to buy server! (Maxed out?) ${hostname}`);
					break;
				}
				
				var files = ["hack-daemon.js", "easy-hack.js", "weaken.js", "grow.js", "hack.js", "raze.js", "shareCPU.js"];
				ns.print("Copying files to server...");
				await ns.scp(files, hostname); 
				
				ns.print("Running Hack-Daemon...");
				ns.exec("hack-daemon.js", hostname, 1);
			}

			ns.print(`Warning: Not enough money. ( ${ns.nFormat(ns.getServerMoneyAvailable("home") * spendPercentage, "$0.000a")} / ${ns.nFormat(ns.getPurchasedServerCost(Math.pow(2, memLevel)), "$0.000a")} )`);

		// Buy servers only if we are not up to our ram threshold
		} else if (globalRamUsage >= ramUsageThreshold) {

			ns.print(`Private server ram is at [${ns.nFormat(globalRamUsage, "0.00%")}]. Attempting to upgrade...`);

			for(var i = 0; i < pservers.length; i++) {

				if (fKill.peek() != "NULL PORT DATA")
					break;

				if ((ns.getServerMoneyAvailable("home") * spendPercentage) > ns.getPurchasedServerCost(Math.pow(2, memLevel)) && globalRamUsage >= ramUsageThreshold) {
					if (ns.getServerMaxRam(pservers[i]) < Math.pow(2, memLevel)) {
						var processes = ns.ps(pservers[i]);
						var task = {"target" : "", "host" : "", "task" : "", "done" : true, "threads" : 0, "ram" : 0, "security" : 0};

						ns.print(`Going to remove ${pservers[i]} (${pservers[i].split("-")[1]} GB)`);
						
						var hackdaemonProcess = processes.filter (x => x.filename == "hack-daemon.js");
						if (hackdaemonProcess.length > 0) {
							ns.print(`Requesting [${pservers[i]}] to kill it's hack-daemon...`);
							await fHostKill.tryWrite(pservers[i]);

							while (fHostKill.peek() != "NULL PORT DATA") {
								await ns.sleep(1000);
							}
						} else {
							fHostKill.clear();
						}

						ns.print("Telling coordinator we deleted [" + pservers[i] + "]")
						await ns.tryWritePort(12, pservers[i]);
						
						ns.print("Killing for tasks...")
						processes = ns.ps(pservers[i]);

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

							} else if (p.filename == "weaken.js" || p.filename == "hack.js") {
								task.task = p.filename.substr(0, p.filename.indexOf("."));
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
							}

							ns.print(`Killing ${p.filename}...`)
							ns.kill(p.pid, pservers[i]);
						}

						if (ns.peek(12) != "NULL PORT DATA") {
							ns.print("Waiting for coordinator to delete server...")
							while (ns.peek(12) != "NULL PORT DATA")
								await ns.sleep(500);
						}

						ns.print("Deleting server...")
						if (!ns.deleteServer(pservers[i])) {
							ns.print(`ERROR: Failed to delete [${pservers[i]}]! Are you connected to it?`)
						}

						ns.print("Upgrading [" + pservers[i] + "] to a [" + Math.pow(2, memLevel) + "GB] server...");
						var hostname = ns.purchaseServer("pserv-" + Math.pow(2, memLevel), Math.pow(2, memLevel));
						if (!ns.serverExists(hostname)) {
							ns.print(`ERROR: Failed to buy server! (Maxed out?) [${hostname}`);
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
		
		if (fKill.peek() != "NULL PORT DATA")
			break;

		ns.print(`Sleeping for ${ns.tFormat(waitInterval)}`);
		await ns.sleep(waitInterval);
		ns.print(" ");
	}
}