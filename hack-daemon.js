/** @param {NS} ns */
export async function main(ns) {
	ns.disableLog("ALL");

	const debug = false;	// 	Enables debug logs. 
	const homeCPU = 1;		//	The number of CPUs on your home server. Better to just set it here than waste RAM
	const expRuns = 2;		//	The number of cycles to complete before looking to using your remaining RAM on EXP farms

	var host = ns.getHostname();
	ns.print("Host: " + host);

	// These are temporary defaults. They get overwritten by the coordinator!
	var target = "n00dles";
	var threshModifier = 0.6;

	if (!ns.serverExists(target)) {
		ns.print("ERROR: Server [" + target + "] does not exist");
		return;
	}

	// Tell the coordinator we exist!
	ns.print("Posting host information to coordinator...");
	await ns.tryWritePort(11, host);

	// Get targets from coordinator
	var gTargets = ns.getPortHandle(1);
	var gStatus = ns.getPortHandle(3);
	var gExp = ns.getPortHandle(5);
	var gLock = ns.getPortHandle(6);
	var outLock = ns.getPortHandle(15);
	var fHostKill = ns.getPortHandle(18);
	var fKill = ns.getPortHandle(20);

	while (gTargets.peek() == "NULL PORT DATA") {
		ns.print("Waiting for targets to be added by coordinator...")
		await ns.sleep(1000);
	}	

	var randWait = 1000 * Math.floor(randomIntFromInterval(3, 30));
	ns.print("Waiting for [" + (randWait / 1000) + "] seconds");
	await ns.sleep(randWait);

	var jTargets = JSON.parse(gTargets.peek());
	var jStatus = JSON.parse(gStatus.peek());
	var jExp = JSON.parse(gExp.peek());
	var jLocks = JSON.parse(gLock.peek());
	var jLockRequest = {"target" : "", "host": host, "task" : "", "done" : false};

	var weakenID = new Array(jTargets.length).fill(0);
	var growID = new Array(jTargets.length).fill(0);
	var hackID = new Array(jTargets.length).fill(0);
	
	var curRuns = 0;

	while(fKill.peek() == "NULL PORT DATA" && fHostKill.peek() != host) {
		jTargets = JSON.parse(gTargets.peek());

		ns.print("-----------------Starting Loop-------------------");

		// Cycle the targets from coordinator
		for (var indexTarget in jTargets) {
			jStatus = JSON.parse(gStatus.peek());
			jLocks = JSON.parse(gLock.peek());
			target = jTargets[indexTarget].target;
			jLockRequest.target = target;
			threshModifier = jTargets[indexTarget].thresholdModifier;
			var currentLocks = jLocks.find(x => x.target == target);

			if (fHostKill.peek() == host)
				break;

			/** Weaken: <NOTE: The more threads tossed at it the better.>
			 * We only weaken if : 	1) We are close to the min threshold
			 * 						2) Or if there is a reported security risk
			 * 						3) If we even have enough to run the script
			 * 						4) If there is no lock
			 */						
			var securityThreshold = ns.getServerMinSecurityLevel(target) + 5;
			if ((ns.getServerSecurityLevel(target) > securityThreshold || jStatus[indexTarget].security > 5) 
					&& (ns.getScriptRam("weaken.js") <= ns.getServerMaxRam(host) - ns.getServerUsedRam(host)) 
					&& currentLocks.weakenLock == "") {

				// Try to set lock		
				jLockRequest.task = "weaken";
				jLockRequest.done = false;
				ns.print(`[${target}] Attempting to lock weakening...`)
				await outLock.tryWrite(JSON.stringify(jLockRequest));

				// Wait for coordinator to process locks
				while(currentLocks.weakenLock == "") {
					await ns.sleep(500);
					jLocks = JSON.parse(gLock.peek());
					currentLocks = jLocks.find(x => x.target == target);
				}

				if (currentLocks.weakenLock == host) {
					ns.print(`[${target}] Lock Success!`);

					var currentThreads = parseInt(jStatus[indexTarget].weakenThreads);
					if (isNaN(currentThreads)) {
						ns.print(`[${target}] ERROR: currentThreads = NaN! (${rawTargetStatus})`);
					} else if (currentThreads < 0) {
						ns.print(`[${target}] ERROR: currentThreads = ${currentThreads}`);
					}

					// There is a breach if we are beyond a minimum limit x2 (typically happens when hacking wins more than its chance to fail)
					var securityBreach = (ns.getServerSecurityLevel(target) + jStatus[indexTarget].security >= securityThreshold * 2) ? 2 : 1;

					// Security threat generated from grow/hack
					var securityThreat = (jStatus[indexTarget].security > 5 ? jStatus[indexTarget].security : 0);

					// [NOTE] Weaken lowers security by 0.05 per thread!
					// If there is a security breach, multiply the threads we need by 2x
					var reqThreads = (Math.ceil((ns.getServerSecurityLevel(target) + securityThreat - securityThreshold) / 0.05) * securityBreach) - currentThreads;
					var numThreads = Math.min(reqThreads, Math.floor((ns.getServerMaxRam(host) - ns.getServerUsedRam(host)) / ns.getScriptRam("weaken.js")));
					
					if (numThreads > 0) {
						ns.print(`[${target}] Weakening... (Threads: ${numThreads})`);
						weakenID[indexTarget] = ns.run("weaken.js", numThreads, target, host, numThreads, ns.getScriptRam("weaken.js")*numThreads, 0);
					} else {
						ns.print(`[${target}] Skipping weaken. Enough threads working on it. [${numThreads} / ${currentThreads}]`);
					}

					ns.print("Sleeping for 1 sec...")
					await ns.sleep(1000);
					
					jLockRequest.done = true;
					ns.print(`[${target}] Removing weakening lockdown...`);
					await outLock.tryWrite(JSON.stringify(jLockRequest));
				} else {
					ns.print(`[${target}] LATE LOCKED : [${currentLocks.weakenLock}] has locked weakening...`);
				}
			} else if (currentLocks.weakenLock != "") {
				ns.print(`[${target}] LOCKED : [${currentLocks.weakenLock}] has locked weakening...`);
			}
		
			if (fHostKill.peek() == host)
				break;
		
			await ns.sleep(400);
			jStatus = JSON.parse(gStatus.peek());
			jLocks = JSON.parse(gLock.peek());
			currentLocks = jLocks.find(x => x.target == target);

			/**Grow <Growth is always a 1 CPU deal unless its on home. We now go for 98%>
			 * Grow only when:	The money available is less than 98% of the maximum (reason is due to hacking going to specified threshold)
			 * 					If, in addition to the above, the number of hack threads is below the 98% threshold
			 * 					If we have enough RAM to even run the script
			 * 					If there is no lock set.
			 */
			if ((ns.getServerMoneyAvailable(target) - (ns.getServerMoneyAvailable(target) - (ns.hackAnalyze(target) * jStatus[indexTarget].hackThreads * ns.hackAnalyzeChance(target)))) < (ns.getServerMaxMoney(target)*0.98) 
					&& (ns.getScriptRam("grow.js") <= ns.getServerMaxRam(host) - ns.getServerUsedRam(host)) 
					&& currentLocks.growLock == "") {
				
				// Try to set lock
				jLockRequest.task = "grow";
				jLockRequest.done = false;
				ns.print(`[${target}] Attempting to lock growth...`)
				await outLock.tryWrite(JSON.stringify(jLockRequest));

				// Wait for coordinator to process locks
				while(currentLocks.growLock == "") {
					await ns.sleep(400);
					jLocks = JSON.parse(gLock.peek());
					currentLocks = jLocks.find(x => x.target == target);
				}

				if (currentLocks.growLock == host) {
					ns.print(`[${target}] Lock Success!`);

					var currentThreads = parseInt(jStatus[indexTarget].growThreads);
					if (isNaN(currentThreads)) {
						ns.print(`[${target}] ERROR: currentThreads = NaN! (${rawTargetStatus})`);
					} else if (currentThreads < 0) {
						ns.print(`[${target}] ERROR: currentThreads = ${currentThreads}`);
					}

					// growthAnalyze = Asks for the multiplier amount you want to grow the current amount by!
					// X = Max / (Available - Hacking)
					// Hacking = [% Amount Taken] * Max * NumThreads * Chance
					// Above ignored if (Available == 0 || amountGrow <= 0)
					var amountGrow = ns.getServerMaxMoney(target) / (ns.getServerMoneyAvailable(target) - (ns.hackAnalyze(target) * ns.getServerMoneyAvailable(target) * jStatus[indexTarget].hackThreads * ns.hackAnalyzeChance(target)));
					
					var reqThreads = 1;
					if (ns.getServerMoneyAvailable(target) == 0 || amountGrow <= 0)
						reqThreads = (ns.getServerMaxRam(host) - ns.getServerUsedRam(host)) / ns.getScriptRam("grow.js");
					else 
						reqThreads = ns.growthAnalyze(target, amountGrow, (host == "home" ? homeCPU : 1)) - currentThreads;
					
					var numThreads = Math.floor(Math.min(reqThreads, (ns.getServerMaxRam(host) - ns.getServerUsedRam(host)) / ns.getScriptRam("grow.js")));

					if (numThreads > 0) {
						ns.print(`[${target}] Growing... (Threads: ${numThreads})`);
						growID[indexTarget] = ns.run("grow.js", numThreads, target, threshModifier, host, numThreads, ns.getScriptRam("grow.js")*numThreads, ns.growthAnalyzeSecurity(numThreads, target, (host == "home" ? homeCPU : 1)));
					} else {
						ns.print(`[${target}] Skipping growth. Enough threads working on it. [${numThreads} / ${currentThreads}]`);
					}
					
					ns.print("Sleeping for 1 sec...")
					await ns.sleep(1000);
					
					jLockRequest.done = true;
					ns.print(`[${target}] Removing growth lockdown...`);
					await outLock.tryWrite(JSON.stringify(jLockRequest));

				} else {
					ns.print(`[${target}] LATE LOCKED : [${currentLocks.growLock}] has locked growth...`);
				}
			} else if (currentLocks.growLock != "") {
				ns.print(`[${target}] LOCKED : [${currentLocks.growLock}] has locked growth...`);
			}

			if (fHostKill.peek() == host)
				break;

			await ns.sleep(400);
			jStatus = JSON.parse(gStatus.peek());
			jLocks = JSON.parse(gLock.peek());
			currentLocks = jLocks.find(x => x.target == target);

			/**Hack <Hack is fast and dumb. Be careful!>
			 * Only hack if:	If the money available is greater than our threshold (which is a % of its maximum)
			 * 					If the chance to hack the target is over 10%
			 * 					If you have the RAM needed to run the script
			 * 					If there is no lock
			 */
			var moneyTreshold = ns.getServerMaxMoney(target) * threshModifier;
			if (ns.getServerMoneyAvailable(target) >= moneyTreshold 
					&& ns.hackAnalyzeChance(target) >= 0.1
					&& (ns.getScriptRam("hack.js") <= ns.getServerMaxRam(host) - ns.getServerUsedRam(host)) 
					&& currentLocks.hackLock == "") {

				// Try to set lock
				jLockRequest.task = "hack";
				jLockRequest.done = false;
				ns.print(`[${target}] Attempting to lock hacking...`)
				await outLock.tryWrite(JSON.stringify(jLockRequest));

				// Wait for coordinator to process locks
				while(currentLocks.hackLock == "") {
					await ns.sleep(400);
					jLocks = JSON.parse(gLock.peek());
					currentLocks = jLocks.find(x => x.target == target);
				}

				if (currentLocks.hackLock == host) {
					ns.print(`[${target}] Lock Success!`);

					var currentThreads = parseInt(jStatus[indexTarget].hackThreads);
					if (isNaN(currentThreads)) {
						ns.print(`[${target}] ERROR: currentThreads = NaN! (${rawTargetStatus})`);
					} else if (currentThreads < 0) {
						ns.print(`[${target}] ERROR: currentThreads = ${currentThreads}`);
					}

					// Take chance into consideration...
					var reqThreads = Math.floor((ns.hackAnalyzeThreads(target, ns.getServerMoneyAvailable(target) - moneyTreshold)) / ns.hackAnalyzeChance(target)) - currentThreads;
					var numThreads = Math.floor(Math.min(reqThreads, (ns.getServerMaxRam(host) - ns.getServerUsedRam(host)) / ns.getScriptRam("hack.js")));

					if (numThreads > 0) {
						ns.print(`[${target}] Hacking... (Threads: ${numThreads})`);
						hackID[indexTarget] = ns.run("hack.js", numThreads, target, host, numThreads, ns.getScriptRam("hack.js")*numThreads, ns.hackAnalyzeSecurity(numThreads, target));
					} else {
						ns.print(`[${target}] Skipping hack. Enough threads working on it. [${numThreads} / ${currentThreads}]`);
					}
					
					ns.print("Sleeping for 1 sec...")
					await ns.sleep(1000);
					
					jLockRequest.done = true;
					ns.print(`[${target}] Removing hack lockdown...`);
					await outLock.tryWrite(JSON.stringify(jLockRequest));
				} else {
					ns.print(`[${target}] LATE LOCKED : [${currentLocks.hackLock}] has locked hacking...`);
				}
			} else if (currentLocks.hackLock != "") {
				ns.print(`[${target}] LOCKED : [${currentLocks.hackLock}] has locked hacking...`);
			}

			await ns.sleep(400);

		}


		if (fHostKill.peek() == host)
			break;

		/**EXP Farm!
		 * 	We only go into this if we have enough RAM to do so after going trough all our targets.
		 */
		jExp = JSON.parse(gExp.peek());
		var availableRAM = ns.getServerMaxRam(host) - ns.getServerUsedRam(host);
		var minRamRequired = (ns.getScriptRam("weaken.js") + ns.getScriptRam("grow.js") + ns.getScriptRam("hack.js"));
		ns.print(`EXP Ram Left: ${availableRAM} (Req: ${minRamRequired})`);
		if (availableRAM >= minRamRequired && jExp.length > 0 && curRuns >= expRuns) {
			ns.print("Dedicating free RAM to EXP Farming...");
			
			var farmIndex = randomIntFromInterval(1, jExp.length) - 1;
			ns.print("[EXP] You have chosen [" + jExp[farmIndex].target + "]");

			// We split avaiable RAM by a 40/40/20% split. Hacking always goes too fast and is too devistating otherwise.
			var weakThreads = Math.floor((availableRAM * 0.4) / ns.getScriptRam("weaken.js"));
			var growThreads = Math.floor((availableRAM * 0.4) / ns.getScriptRam("grow.js"));
			var hackThreads = Math.floor((availableRAM * 0.2) / ns.getScriptRam("hack.js"));

			if (weakThreads >= 1) {
				ns.print("[EXP] Running " + weakThreads + " weakens on [" + jExp[farmIndex].target + "]");
				ns.run("weaken.js", weakThreads, jExp[farmIndex].target, "EXP", weakThreads);				
			}
			if (growThreads >= 1) {
				ns.print("[EXP] Running " + growThreads + " growths on [" + jExp[farmIndex].target + "]");
				ns.run("grow.js", growThreads, jExp[farmIndex].target, threshModifier, "EXP", growThreads);				
			}
			if (hackThreads >= 1) {
				ns.print("[EXP] Running " + hackThreads + " hacks on [" + jExp[farmIndex].target + "]");
				ns.run("hack.js", hackThreads, jExp[farmIndex].target, "EXP", hackThreads);				
			}
			
			curRuns = 0;
		}
		else if (curRuns < expRuns) curRuns++;

		if (fHostKill.peek() == host)
			break;

		randWait = 1000 * Math.floor(randomIntFromInterval(3, 5));
		ns.print("Waiting for [" + (randWait / 1000) + "] seconds");
		await ns.sleep(randWait);

	}

	// The only thing that can make this request is buy-server
	if (fHostKill.peek() == host) {
		fHostKill.read();
		ns.print(`[${host}] was requested to kill itself. Cleared request!`);
	}
}

/** @param {min} min number
 *  @param {max} max number
 */
function randomIntFromInterval(min, max) { // min and max included 
  return Math.max(Math.floor(Math.random() * (max - min + 1)) + min, 0);
}