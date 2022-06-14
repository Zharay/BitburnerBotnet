/** The brains of the botnet. The coordinator runs purely off information provided by the 20 ports available in BitBurner.
 * This is not a stand alone script. Please refer to the GitHub page for more information!
 * 	
 * 	Written By: Zharay
 * 	URL: https://github.com/Zharay/BitburnerBotnet
**/


// Options
const debug 			= false;		// Enables multiple log messages. Leave this alone unless you want lag.
const threshModifier 	= 0.75;			// Money threshold that we hack towards (we always grow to 100%)
const minHackChance 	= 0;	 		// Min hack chance to target
const minServerGrowth	= 30;			// Min server growth to target
const maxServerGrowth	= 100;			// Max server growth to target
const minServerMoney 	= 1e6;			// Min money the server has to target (1e9 = 10^9 = $1.0b)
const maxServerMoney	= 2e10;			// Max money the server has to target (2e9 = 2 * 10^9 = $2.0b)
const loopInterval 		= 500;			// Amount of time the coordinator waits per loop. Can be CPU intensive.
const manipulateStocks 	= true;			// If enabled we will update our target lists to include servers we own stock in.

/** @param {NS} ns */
export async function main(ns) {
	ns.disableLog("ALL");

	if (ns.peek(8) == "NULL PORT DATA" && ns.args.length == 0) {
		ns.print("Is this loading from a save?");
		ns.print("Running auto-spread-v2...");
		ns.run("auto-spread-v2.js", 1);

		ns.print("Waiting for targets to be sent...");
		while (ns.peek(8) == "NULL PORT DATA") {
			await ns.sleep(200);
		}
	}

	// Argument handling
	var hackTargets = [];
	var expTargets = [];
	var hardTargets = [];
	if (ns.args.length) {
		hackTargets = ns.args[0].split(/[,;]+/);
		expTargets = ns.args[0].split(/[,;]+/);
		hardTargets = ns.args[0].split(/[,;]+/);
		if (debug) ns.print("Targets: " + hackTargets);
	} else if (ns.peek(8) != "NULL PORT DATA") {
		hackTargets = ns.peek(8).split(/[,;]+/);
		expTargets = ns.peek(8).split(/[,;]+/);
		hardTargets = ns.peek(8).split(/[,;]+/);
	} else {
		ns.tprint ("ERROR: No targets set?")
		ns.run("auto-spread")
	}

	hackTargets.forEach( function(x) {
		if (!ns.serverExists(x)) {
			ns.tprint(`ERROR: Server [${x}] does not exist`);
			return;
		}
	} );

	// Run partner system
	ns.print("Running status script...");
	ns.run("check-status.js", 1);

	/**	Ports - This is how all scripts can communicate with each other.
	 * 	1 : GLOBAL : JSON	Target Info	[{Target, Money Threshold, Max Money, Min Security}]
	 * 	2 : GLOBAL : JSON 	Hosts Info	[{Host, RAM}]
	 * 	3 : GLOBAL : JSON 	Target Stat	[{Target, Security Risk, Hack Threads, Hack RAM Used, Weaken Threads, Weaken RAM Used, Weaken Grow Threads, Grow RAM Used}]
	 * 	4 : GLOBAL : JSON 	RAM Info	{Total RAM Available, Total RAM Used}
	 * 	5 : GLOBAL : JSON	EXP Farm	[{Target, Hack Threads, Hack RAM Used, Weaken Threads, Weaken RAM Used, Weaken Grow Threads, Grow RAM Used}]
	 *	6 : GLOBAL : JSON	Flag List 	[{Target, Hack Lock, H Lock Time, Weaken Lock, W Lock Time, Grow Lock, G Lock Time}] 	
	 *	...
	 *	8 : GLOBAL : ARRAY	Target List [target]
	 *	...
	 * 	11 : HOME : RAW STACK String (Host added to botnet)
	 * 	12 : HOME : RAW STACK String (Host being deleted)
	 * 	13 : HOME : RAW STACK JSON {Target being worked on, Task, Done?, Threads, RAM, Time, Security}
	 * 	14 : HOME : RAW STACk JSON {EXP being worked on, Task, Done?, Threads, RAM}
	 * 	15 : HOME : RAW STACK JSON {Target for lock, Host, Task, Done?} 
	 * 	16 : HOME : RAW STACK JSON {TIX, Short?, Long?}
	 * 	...
	 *  17 : FLAG : RAW String (Toggle Share)
	 *  18 : FLAG : RAW STACK String (Specific hostname to kill softly)
	 * 	19 : FLAG : RAW String (Sell all command [any text])
	 * 	20 : FLAG : RAW String (Kill all command [any text])	
	 */

	// JSON objects
	var jHostServers = [];
	var jTargetServers = [];
	var jTargetStatus = [];
	var jGlobalStatus = {"totalRam":0, "usedRam":0};
	var jExpStatus = [];
	var jTargetFlags = [];
	var jHardTargetServers = [];
	var jHardTargetStatus = [];
	var jHardTargetFlags = [];
	var jHardExpStatus = [];
	
	/** 0. Setup target servers and status
	 * 		Criteria :	Must be rooted
	 * 					Must be within our hack level
	 * 			(		Must have a hack chance >= 0% (you can still hack at 0%, it just requires weakening first)
	 * 					Server growth >= 20 ()
	 * 					Max money >= $10.00 B
	 * 			)		OR if it is a stock server, ignore the above 3
	 */
	hackTargets.sort((a, b) => ns.getServerMaxMoney(b) - ns.getServerMaxMoney(a));	
	hackTargets = hackTargets.filter( function(x) {
		return 	(getIsTarget(ns, x) || (manipulateStocks && getServerTIXSymbol(x) != undefined))
			&& ns.hasRootAccess(x)
			&& ns.getServerRequiredHackingLevel(x) <= ns.getPlayer().hacking;
	});	
	
	hackTargets.forEach( function(x) {
		let TIX = getServerTIXSymbol(x) != undefined ? getServerTIXSymbol(x) : "";
		jTargetServers.push( {"target" : x, "thresholdModifier": threshModifier, 
								"TIX": TIX, "hackerLevel": ns.getServerRequiredHackingLevel(x),
								"maxMoney" : ns.getServerMaxMoney(x), "curMoney" : ns.getServerMoneyAvailable(x),
								"growth" : ns.getServerGrowth(x), "security" : ns.getServerSecurityLevel(x), 
								"minSecurity" : ns.getServerMinSecurityLevel(x)} );
		jTargetStatus.push( {"target" : x, "security" : 0, 
								"TIX": TIX, "isTarget": getIsTarget(ns, x),
								"isLong" : false, "isShort" : false,
								"hackThreads" : 0, "hackRam" : 0, 
								"weakenThreads" : 0, "weakenRam" : 0,
								"growThreads" : 0, "growRam" : 0} );
		jTargetFlags.push( {"target" : x, 
							"hackLock" : "", "hackTime" : 0, 
							"weakenLock" : "", "weakenTime" : 0,
							"growLock" : "", "growTime" : 0} );
	} );

	/** 0.5. Setup EXP farm targets
	 * 		Criteria :	Everything the above doesn't have
	 * 					Must be rooted
	 * 					Required Hacking Level <= Current Hack Level
	 */
	expTargets = expTargets.filter ( (e) => !hackTargets.includes(e) );
	expTargets = expTargets.filter( function(x) {
		return ns.hasRootAccess(x) && ns.getServerMaxMoney(x) > 0 && ns.getServerRequiredHackingLevel(x) <= ns.getPlayer().hacking;
	});
	expTargets.forEach( function(x) {
		ns.print("EXP SERVER: " + x);
		jExpStatus.push({"target" : x, 
							"hackThreads" : 0, "hackRam" : 0, 
							"weakenThreads" : 0, "weakenRam" : 0,
							"growThreads" : 0, "growRam" : 0});
	});

	/** 0.9 Setup hard targets
	 * 		Criteria : 	Required hacking level is greater than the player's
	 * 					Does not have root access yet
	 */
	hardTargets = hardTargets.filter ( x => ns.getServerRequiredHackingLevel(x) > ns.getPlayer().hacking || !ns.hasRootAccess(x) );
	hardTargets.forEach ( function(x) {
		var TIX = getServerTIXSymbol(x) != undefined ? getServerTIXSymbol(x) : "";
		jHardTargetServers.push({"target" : x, "thresholdModifier": threshModifier, 
								"TIX": TIX,"hackerLevel": ns.getServerRequiredHackingLevel(x),
								"maxMoney" : ns.getServerMaxMoney(x), "curMoney" : ns.getServerMoneyAvailable(x),
								"growth" : ns.getServerGrowth(x), "security" : ns.getServerSecurityLevel(x), 
								"minSecurity" : ns.getServerMinSecurityLevel(x)} );
		jHardTargetStatus.push( {"target" : x, "security" : 0, 
								"TIX": TIX, "isTarget": getIsTarget(ns, x),
								"isLong" : false, "isShort" : false,
								"hackThreads" : 0, "hackRam" : 0, 
								"weakenThreads" : 0, "weakenRam" : 0,
								"growThreads" : 0, "growRam" : 0} );
		jHardTargetFlags.push( {"target" : x, 
								"hackLock" : "", "hackTime" : 0, 
								"weakenLock" : "", "weakenTime" : 0,
								"growLock" : "", "growTime" : 0} );
		jHardExpStatus.push({"target" : x, 
							"hackThreads" : 0, "hackRam" : 0, 
							"weakenThreads" : 0, "weakenRam" : 0,
							"growThreads" : 0, "growRam" : 0});
	});

	// Setup Ports
	var gTargets = ns.getPortHandle(1);		// List of all hacking targets to gain money from
	var gHosts = ns.getPortHandle(2);		// List of all hosts running a hack-daemon or easy-hack (aka n00dles)
	var gStatus = ns.getPortHandle(3);		// List of all targets' current status. Used primarily by hack-daemon to figure out how many threads to use for a task
	var gRam = ns.getPortHandle(4);			// A readout of the total global ram usage and total. THIS IS SLOW as it only updates every 1~ second. Used only by check-status
	var gExp = ns.getPortHandle(5);			// List of all EXP targets. They must have money to be of any use for this.
	var gLock = ns.getPortHandle(6);		// Global ram usage/maximum. THIS IS VERY SLOW as this only gets updated every second. As such it's only used by check-status.
	var inHosts = ns.getPortHandle(11);		// List of hosts running a hack-daemon to be added 
	var inDeleted = ns.getPortHandle(12);	// List of hosts running a hack-daemon to be deleted (typically private servers)
	var inTasks = ns.getPortHandle(13);		// Check task queue - Brought in from hack.js, weaken.js, and grow.js 
	var inExp = ns.getPortHandle(14);		// EXP queue. Filtered in from auto-spread and added to over time when we are high enough level to do so
	var inLock = ns.getPortHandle(15);		// Lock queue. Used by hack-daemons to lock down a single server for a particular task. Eliminates race conditions.
	var inStocks = ns.getPortHandle(16);	// Stock queue. Used by stock-bots to report any shares we have longs or shorts of.
	var fKill = ns.getPortHandle(20);		// The Kill command. If this is received, this script will gracefully stop.

	gTargets.clear();
	gHosts.clear();
	gStatus.clear();
	gRam.clear();
	gExp.clear();
	gLock.clear();
	inHosts.clear();
	inDeleted.clear();
	inTasks.clear();
	inExp.clear();
	inLock.clear();
	inStocks.clear();
	fKill.clear();

	// Start with posting our targets
	gTargets.tryWrite(JSON.stringify(hackTargets));
	ns.print("Posted global targets!");

	// Then by posting our EXP farms
	gExp.tryWrite(expTargets.toString());	

	// ---------------------------------------------------------------------------
	while(true) {
	//	ns.clearLog();

		// 0. Check if any of the hard servers can be used (We get this list from auto-spread after some filtering above)
		var newHackables = [];
		for(var i = 0; i < hardTargets.length; i++) {
			if (ns.hasRootAccess(hardTargets[i]) && ns.getServerRequiredHackingLevel(hardTargets[i]) <= ns.getPlayer().hacking) {
				var TIX = getServerTIXSymbol(hardTargets[i]) != undefined ? getServerTIXSymbol(hardTargets[i]) : "";
				ns.print(`[HARD] We can now hack [${hardTargets[i]}]. Processing now!`);
				if (ns.hasRootAccess(hardTargets[i]) && (getIsTarget(ns, hardTargets[i]) || (manipulateStocks && TIX != ""))) {
					ns.print(`[HARD] Adding [${hardTargets[i]}] as a money target`);
					hackTargets.push(hardTargets[i]);
					jTargetStatus.push(jHardTargetStatus[i]);
					jTargetFlags.push(jHardTargetFlags[i]);
					newHackables.push(hardTargets[i]);
				} else if (ns.hasRootAccess(hardTargets[i]) && ns.getServerMaxMoney(hardTargets[i]) > 0 ) {
					ns.print(`[HARD] Adding [${hardTargets[i]}] as a EXP target`);
					jExpStatus.push(jHardExpStatus[i]);
					newHackables.push(hardTargets[i]);
				} else if(ns.hasRootAccess(hardTargets[i])) {
					// Note: Auto-Spreader-v2 should've already have the hack-daemon running on these if they have the memory for it
					ns.print(`[HARD] Ignoring [${hardTargets[i]}]. We have root but it's not worth anything!`);
					newHackables.push(hardTargets[i]);
				} else {
					// This should never happen.
					ns.print(`[HARD] Ignoring [${hardTargets[i]}]? Its not up to standard?`);
				}
			} else {
				//ns.print(`[HARD] Ignoring [${hardTargets[i]}]? Root: ${ns.hasRootAccess(hardTargets[i])} | Req. Hack: ${ns.getServerRequiredHackingLevel(hardTargets[i])} / ${ns.getPlayer().hacking}`);
			}
		}

		// Remove any found that the coordinator will utilize
		hardTargets = hardTargets.filter(s => !newHackables.includes(s));
		jHardTargetFlags = jHardTargetFlags.filter (j => !newHackables.includes(j.target));
		jHardTargetStatus = jHardTargetStatus.filter (j => !newHackables.includes(j.target));
		jHardTargetServers = jHardTargetServers.filter (j => !newHackables.includes(j.target));
		jHardExpStatus = jHardExpStatus.filter (j => !newHackables.includes(j.target));

		// 1. Check if any hosts have been deleted (Port 11)
		while (!inDeleted.empty()) {
			var rawDeleted = inDeleted.read();
			if (rawDeleted != "NULL PORT DATA") {
				jHostServers = jHostServers.filter(x => x.host != rawDeleted);
				ns.print("Host Removed: " + rawDeleted);
			}
		}

		// 2. Check if any hosts have been added (Port 12)
		while(!inHosts.empty()) {
			var rawHost = inHosts.read();
			if (rawHost != "NULL PORT DATA") {
				jHostServers.push({"host" : rawHost, "maxRam" : ns.getServerMaxRam(rawHost)});
				ns.print("Host Added: " + rawHost);
			}			
		}

		// 3. Update gHosts - The global list of all hosts (Port 2)
		gHosts.clear();
		gHosts.tryWrite(JSON.stringify(jHostServers));
		if(debug) ns.print("Hosts updated!");

		// 4. Check task queue - Brought in from hack.js, weaken.js, and grow.js  (Port 13)
		while (!inTasks.empty()) {
			var rawTask = inTasks.read();
			if (rawTask != "NULL PORT DATA") {
				var newTask = JSON.parse(rawTask);
				var oldTask = jTargetStatus.find(x => x.target == newTask.target);

				if (!oldTask) { // This should never happen!
					ns.print("ERROR [TASK] Adding task information for [" + newTask.target + "]...");
					
					var addTask = {"target" : newTask.target, "security" : parseFloat(newTask.security), "isLong" : false, "isShort" : false,
						"hackThreads" : (newTask.task == "hack" ? parseInt(newTask.threads) : 0), "hackRam" : ((newTask.task == "hack" ? parseFloat(newTask.ram) : 0)), 
						"weakenThreads" : (newTask.task == "weaken" ? parseInt(newTask.threads) : 0), "weakenRam" : ((newTask.task == "weaken" ? parseFloat(newTask.ram) : 0)),
						"growThreads" : (newTask.task == "grow" ? parseInt(newTask.threads) : 0), "growRam" : ((newTask.task == "grow" ? parseFloat(newTask.ram) : 0)) };

					jTargetStatus.push(addTask);
				} else {
					if(debug) ns.print("[TASK] Updating task information for [" + newTask.task + " : " + newTask.target + "] from [" + newTask.host + "] [" + (newTask.done ? "-" : "+") + "]");
					oldTask.security = Math.max(oldTask.security + parseFloat(newTask.security), 0);

					switch(newTask.task)
					{
						case "hack":
							oldTask.hackThreads = Math.max(oldTask.hackThreads + ((newTask.done ? -1 : 1) * parseInt(newTask.threads)), 0);
							oldTask.hackRam = Math.max(oldTask.hackRam + (newTask.done ? -1 : 1) * parseFloat(newTask.ram), 0);
						//	ns.print("[TASK] Hack Threads: " + oldTask.hackThreads + " | Ram: " + ns.nFormat(oldTask.hackRam, "0.00") + " | Security: " + ns.nFormat(oldTask.security, "0.00"));
						break;

						case "weaken":
							oldTask.weakenThreads = Math.max(oldTask.weakenThreads + ((newTask.done ? -1 : 1) * parseInt(newTask.threads)), 0);
							oldTask.weakenRam = Math.max(oldTask.weakenRam + ((newTask.done ? -1 : 1) * parseFloat(newTask.ram)), 0);
						//	ns.print("[TASK] Weaken Threads: " + oldTask.weakenThreads + " | Ram: " + ns.nFormat(oldTask.weakenRam, "0.00") + " | Security: " + ns.nFormat(oldTask.security, "0.00"));

						break;

						case "grow":
							oldTask.growThreads = Math.max(oldTask.growThreads + ((newTask.done ? -1 : 1) * parseInt(newTask.threads)), 0);
							oldTask.growRam = Math.max(oldTask.growRam + ((newTask.done ? -1 : 1) * parseFloat(newTask.ram)), 0);
						//	ns.print("[TASK] Growth Threads: " + oldTask.growThreads + " | Ram: " + ns.nFormat(oldTask.growRam, "0.00") + " | Security: " + ns.nFormat(oldTask.security, "0.00"));
						break;

						default:
							ns.print("[TASK] ERROR: Cannot tell what task this is! [" + newTask.task + "]");
							ns.print(rawTask);
						break;
					}
				}
			}
		}

		// 5. Check EXP queue - filtered in from auto-spread and added to over time above
		while (!inExp.empty()) {
			var rawTask = inExp.read();
			if (rawTask != "NULL PORT DATA") {
				var newTask = JSON.parse(rawTask);

				var oldTask = jExpStatus.find(x => x.target == newTask.target);
				if (!oldTask) {
					ns.print("[EXP] Adding EXP farm info for [" + newTask.target + "]...");
					var addTask = {"target" : newTask.target,
						"hackThreads" : (newTask.task == "hack" ? parseInt(newTask.threads) : 0), "hackRam" : ((newTask.task == "hack" ? parseFloat(newTask.ram) : 0)), 
						"weakenThreads" : (newTask.task == "weaken" ? parseInt(newTask.threads) : 0), "weakenRam" : ((newTask.task == "weaken" ? parseFloat(newTask.ram) : 0)),
						"growThreads" : (newTask.task == "grow" ? parseInt(newTask.threads) : 0), "growRam" : ((newTask.task == "grow" ? parseFloat(newTask.ram) : 0)) };

					jExpStatus.push(addTask);

				} else {
					if(debug) ns.print("[EXP] Updating EXP information for [" + newTask.task + " : " + newTask.target + "] from [" + newTask.host + "] [" + (newTask.done ? "-" : "+") + "]");
					
					switch(newTask.task)
					{
						case "hack":
							oldTask.hackThreads = Math.max(oldTask.hackThreads + ((newTask.done ? -1 : 1) * parseInt(newTask.threads)), 0);
							oldTask.hackRam = Math.max(oldTask.hackRam + (newTask.done ? -1 : 1) * parseFloat(newTask.ram), 0);
						//	ns.print("[EXP] Hack Threads: " + oldTask.hackThreads + " | Ram: " + ns.nFormat(oldTask.hackRam, "0.00"));
						break;

						case "weaken":
							oldTask.weakenThreads = Math.max(oldTask.weakenThreads + ((newTask.done ? -1 : 1) * parseInt(newTask.threads)), 0);
							oldTask.weakenRam = Math.max(oldTask.weakenRam + ((newTask.done ? -1 : 1) * parseFloat(newTask.ram)), 0);
						//	ns.print("[EXP] Weaken Threads: " + oldTask.weakenThreads + " | Ram: " + ns.nFormat(oldTask.weakenRam, "0.00"));

						break;

						case "grow":
							oldTask.growThreads = Math.max(oldTask.growThreads + ((newTask.done ? -1 : 1) * parseInt(newTask.threads)), 0);
							oldTask.growRam = Math.max(oldTask.growRam + ((newTask.done ? -1 : 1) * parseFloat(newTask.ram)), 0);
						//	ns.print("[EXP] Growth Threads: " + oldTask.growThreads + " | Ram: " + ns.nFormat(oldTask.growRam, "0.00"));
						break;

						default:
							ns.print("[EXP] ERROR: Cannot tell what task this is! [" + newTask.task + "]");
							ns.print(rawTask);
						break;
					}
				}
			}
		}

		// 6. Check lock tasks queue - From hack-daemons. The daemon's are responsible for sending requests to lock down a server for any task.
		//		They have 10 seconds to do their job (usually only takes 1~ second) before the coordinator clears their name. Up to 3 servers
		//		can have a lock; one for each task (hack, weaken, grow) (Port 15)
		while (!inLock.empty()) {
			var rawLock = inLock.read();
			if (rawLock != "NULL PORT DATA") {
				var newLock = JSON.parse(rawLock);

				var oldLock = jTargetFlags.find(x => x.target == newLock.target);
				if (!oldLock) { // This should never happen
					if(debug) ns.print("ERROR [LOCK] Adding Lock info for [" + newLock.target + "]...");
					var addLock = {"target" : newLock.target,
						"hackLock" : (newLock.task == "hack" ? newLock.host : ""), "hackTime" : 0, 
						"weakenLock" : (newLock.task == "weaken" ? newLock.host : ""), "weakenTime" : 0,
						"growLock" : (newLock.task == "grow" ? newLock.host : ""), "growTime" : 0 };

					jExpStatus.push(addLock);

				} else {
					if(debug) ns.print(`[LOCK] Processing Lock request for [${newLock.task} : ${newLock.target}] from [${newLock.host}] [${(newLock.done ? "-" : "+")}]`);
					
					/**For each case we:
					 * 		Do not allow change of lock if the lock is still in effect (10sec limit)
					 * 		Clear lock if the host comes back with a done flag
					 * 		Assign the lock if no one has it
					 * 		Assign the lock if time limit has passed (10 sec) -- Which logically will never happen
					 */
					switch(newLock.task)
					{
						case "hack":
							if(oldLock.hackLock == newLock.host && newLock.done) {
								oldLock.hackLock = "";
								oldLock.hackTime = 0;
								if(debug) ns.print(`[LOCK] Clearing lock for [${newLock.task} : ${newLock.target}] from [${newLock.host}]`);
							} else if ((oldLock.hackLock == "" || oldLock.hackTime >= 10) && !newLock.done) {
								oldLock.hackLock = newLock.host;
								oldLock.hackTime = 0;
								if(debug) ns.print(`[LOCK] Assigning lock to [${newLock.host}] for [${newLock.task} : ${newLock.target}]`);
							} else {
							//	ns.print(`[LOCK] Ignoring request. Locked already by [${oldLock.hackLock}]`);
							}
						break;

						case "weaken":
							if(oldLock.weakenLock == newLock.host && newLock.done) {
								oldLock.weakenLock = "";
								oldLock.weakenTime = 0;
								if(debug) ns.print(`[LOCK] Clearing lock for [${newLock.task} : ${newLock.target}] from [${newLock.host}]`);
							} else if ((oldLock.weakenLock == "" || oldLock.weakenTime >= 10) && !newLock.done) {
								oldLock.weakenLock = newLock.host;
								oldLock.weakenTime = 0;
								if(debug) ns.print(`[LOCK] Assigning lock to [${newLock.host}] for [${newLock.task} : ${newLock.target}]`);
							} else {
							//	ns.print(`[LOCK] Ignoring request. Locked already by [${oldLock.weakenLock}]`);
							}
						break;

						case "grow":
							if(oldLock.growLock == newLock.host && newLock.done) {
								oldLock.growLock = "";
								oldLock.growTime = 0;
								if(debug) ns.print(`[LOCK] Clearing lock for [${newLock.task} : ${newLock.target}] from [${newLock.host}]`);
							} else if ((oldLock.growLock == "" || oldLock.growTime >= 10) && !newLock.done) {
								oldLock.growLock = newLock.host;
								oldLock.growTime = 0;
								if(debug) ns.print(`[LOCK] Assigning lock to [${newLock.host}] for [${newLock.task} : ${newLock.target}]`);
							} else {
							//	ns.print(`[LOCK] Ignoring request. Locked already by [${oldLock.growLock}]`);
							}
						break;

						default:
							ns.print("[LOCK] ERROR: Cannot tell what task this is! [" + newLock.task + "]");
							ns.print(rawLock);
						break;
					}
				}
			}
		}

		// 7. Check the stock market queue for any shorts/longs -- This will always run every 5 seconds if a stock-bot is running!
		while (!inStocks.empty()) {
			var rawStock = inStocks.read();
			if (rawStock != "NULL PORT DATA" && manipulateStocks) {
				var jStock = JSON.parse(rawStock);
				var refStatus = jTargetStatus.find(x => x.TIX == jStock.sym);
				if (refStatus) {
					refStatus.isLong = jStock.long;
					refStatus.isShort = jStock.short;
					refStatus.isTarget = getIsTarget(ns, refStatus.target) || jStock.long || jStock.short;
				}
			}
		}

		// 8. Update gTargets -- Global list of all the target servers. Used mainly by check-status (Port 1)
		jTargetServers = [];
		hackTargets.forEach( function(x) {
			let TIX = getServerTIXSymbol(x) != undefined ? getServerTIXSymbol(x) : "";
			jTargetServers.push( {"target" : x, "thresholdModifier": threshModifier, 
								"TIX": TIX, "hackerLevel": ns.getServerRequiredHackingLevel(x),
								"maxMoney" : ns.getServerMaxMoney(x), "curMoney" : ns.getServerMoneyAvailable(x),
								"growth" : ns.getServerGrowth(x), "security" : ns.getServerSecurityLevel(x), 
								"minSecurity" : ns.getServerMinSecurityLevel(x),});
		} );
		gTargets.clear();
		gTargets.tryWrite(JSON.stringify(jTargetServers));
		if(debug) ns.print("Update global targets!");
		
		// 9. Update gStatus -- Global list of each target's status. Used by hack-daemon to make decision on how many threads to use. (Port 3)
		gStatus.clear();
		gStatus.tryWrite(JSON.stringify(jTargetStatus));
		if(debug) ns.print("Target status updated!");

		// 10. Update gExp -- Global list of all EXP targets. Same as status. Only really used by check-status (Port 5)
		gExp.clear();
		gExp.tryWrite(JSON.stringify(jExpStatus));

		// 11. Update jTargetFlags and gLock -- Here is where we clear anyone taking too long trying to use their lock.
		jTargetFlags.forEach (h => {
			if(h.hackLock != "") 	h.hackTime++;
			if(h.weakenLock != "") 	h.weakenTime++;
			if(h.growLock != "") 	h.growTime++;

			if(h.hackTime >= 10) {
				ns.print(`[LOCK] WARNING: [${h.hackLock}] has held lock on hacking for too long. Clearing...`);
				h.hackLock = "";
				h.hackTime = 0;
			}
			if(h.weakenTime >= 10) {
				ns.print(`[LOCK] WARNING: [${h.weakenLock}] has held lock on weakening for too long. Clearing...`);
				h.weakenLock = "";
				h.weakenTime = 0;
			}
			if(h.growTime >= 10) {
				ns.print(`[LOCK] WARNING: [${h.growLock}] has held lock on growing for too long. Clearing...`);
				h.growLock = "";
				h.growTime = 0;
			}
		});
		gLock.clear();
		gLock.tryWrite(JSON.stringify(jTargetFlags));

		// 12. Update gRAM -- Global ram usage/maximum. THIS IS VERY SLOW as this only gets updated every second. As such it's only used by check-status.
		var tTotalRam = 0, tUsedRam = 0;
		jHostServers.forEach( function(x) {
			if (ns.serverExists(x.host)) {
				tTotalRam += x.maxRam;
				tUsedRam += ns.getServerUsedRam(x.host);
			}
		} )
		jGlobalStatus.totalRam = tTotalRam;
		jGlobalStatus.usedRam = tUsedRam;
		gRam.clear();
		gRam.tryWrite(JSON.stringify(jGlobalStatus));
		if(debug) ns.print("Updated RAM info!");

		await ns.sleep(loopInterval);
	}
}

function getIsTarget(ns, target) {
	return ns.hackAnalyzeChance(target) >= minHackChance 
			&& ns.getServerGrowth(target) >= minServerGrowth 
			&& ns.getServerGrowth(target) <= maxServerGrowth 
			&& ns.getServerMaxMoney(target) >= minServerMoney 
			&& ns.getServerMaxMoney(target) <= maxServerMoney;
}

/**
 * Hard-coded list of servers and their equivalent stock symbol. 
 * There is no way to get this dynamically, thus breaking my self imposed rule to not "cheat"
 * @param {String} server 	Full Server name.
 * @returns {String} 		Stock symbol. Will return undefined if server is not found.
 */
function getServerTIXSymbol(server) {
	const serverSymbols = {
		"aerocorp" : "AERO",
		"alpha-ent" : "APHE",
		"blade" : "BLD",
		"clarkinc" : "CLRK",
		"comptek" : "CTK",
		"catalyst" : "CTYS",
		"defcomm" : "DCOMM" ,
		"ecorp" : "ECP",
		"fulcrumtech" : "FLCM",
		"foodnstuff" : "FNS",
		"4sigma" : "FSIG",
		"global-pharm" : "GPH",
		"helios" : "HLS",
		"icarus" : "ICRS",
		"joesguns" : "JGN",
		"kuai-gong" : "KGI",
		"lexo-corp" : "LXO",
		"microdyne" : "MDYN",
		"megacorp" : "MGCP",
		"netlink" : "NTLK",
		"nova-med" : "NVMD",
		"omega-net" : "OMGA",
		"omnia" : "OMN",
		"omnitek" : "OMTK",
		"rho-construction" : "RHOC",
		"sigma-cosmetics" : "SGC",
		"solaris" : "SLRS",
		"stormtech" : "STM",
		"syscore" : "SYSC",
		"titan-labs" : "TITN",
		"univ-energy" : "UNV",
		"vitalife" : "VITA"
	}
	return serverSymbols[server];
  }