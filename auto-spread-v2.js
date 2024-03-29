/**Auto-Spread v2
 * Will seek out, root, copy files to, and begin scripts for all servers in the networks.
 * It will keep searching for new servers until you have all port opening programs to do so.
 * This is how the coordinator is ran. This is also where it gets the starting list of targets.
 * 
 * 	Modified By: Zharay
 * 	Original Spreader By: KrunoSaho
 * 	Original URL: https://gist.github.com/KrunoSaho/f0aa418e16e828b0ebc0585d1ebcf6b5
 * 	Mod URL: https://github.com/Zharay/BitburnerBotnet/blob/main/corpo.js
**/

/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog("ALL");

	// Options
	const useArgsToCoord = false; 	// Use a traditional argument pass to the coordinator instead of a port (old method)

	var initialSpread = true;
	var serverHistory = [];
	var unrootedServers = [];

	// Loop until sent kill command
	while (ns.peek(20) == "NULL PORT DATA") {
		ns.print(" ");
		ns.print("------------------------------------");
		ns.print(" ");

		// Collect all the servers recursively
		let [servers, serverCons] = collect_server_names(ns);

		// Figure out what we can hack
		var maxPorts = 0;
		if (ns.fileExists("BruteSSH.exe", "home"))
			maxPorts++;
		if (ns.fileExists("FTPCrack.exe", "home"))
			maxPorts++;
		if (ns.fileExists("relaySMTP.exe", "home"))
			maxPorts++;
		if (ns.fileExists("HTTPWorm.exe", "home"))
			maxPorts++;
		if (ns.fileExists("SQLInject.exe", "home"))
			maxPorts++;

		// Filter out home for everything else
		servers = servers.filter(x => !x.includes("home"));

		// Filter any servers found in previous runs and then add in our unrooted servers
		servers = servers.filter(s => !serverHistory.includes(s));
		if (initialSpread) serverHistory = servers;
		else servers = servers.filter(x => !x.includes("pserv"));
		servers = servers.concat(unrootedServers);
		unrootedServers.length = 0;

		// This only should happen is if ports we can handle < 5
		if (servers.length == 0) {
			ns.print(`No new servers found. Sleeping for 1 minutes... (Max Ports: ${maxPorts})`);
			await ns.sleep(1000 * 60 * 1);
			continue;
		} else if (servers.length > 0) {
			serverHistory = serverHistory.concat(servers);
		}

		if (ns.getHostname() == "home" && initialSpread) {
			ns.print("Posting Servers to Port 8...")
			await ns.tryWritePort(8 , servers.filter(x => !x.includes("pserv")).toString());
			
			ns.print("Running coordinator...");
			if (useArgsToCoord) 
				ns.exec("coordinator.js", "home", 1, servers.filter(x => !x.includes("pserv")).toString());
			else 
				ns.exec("coordinator.js", "home", 1);

			ns.print("Running status script...");
			ns.exec("check-status.js", "home", 1);

			ns.print("Waiting 10 seconds for coordinator to settle...")
			await ns.sleep(10000);
		}

		// Open their ports + nuke them
		ns.print("Attempting to root servers... ");
		servers.forEach((s) => {
			if (s.includes("pserv")) return;

			ns.print("Server found: " + s);
			if (ns.hasRootAccess(s)) {
				ns.print(`[${s}] is already rooted!`);
				return;
			}
			if (ns.getServerNumPortsRequired(s) > maxPorts) {
				ns.print(`[${s}] cannot be rooted at this time. (Ports: ${maxPorts} / ${ns.getServerNumPortsRequired(s)})`);
				if (!unrootedServers.includes(s)) unrootedServers.push(s);
				return;
			}

			if (ns.fileExists("BruteSSH.exe", "home")) {
				ns.print("Brute forcing SSH...");
				ns.brutessh(s);
			}

			if (ns.fileExists("FTPCrack.exe", "home")) {
				ns.print("FTP Cracking...");
				ns.ftpcrack(s);
			}
			if (ns.fileExists("relaySMTP.exe", "home")) {
				ns.print("Relaying SMTP...");
				ns.relaysmtp(s);
			}

			if (ns.fileExists("HTTPWorm.exe", "home")) {
				ns.print("Inserting HTTP Worm...");
				ns.httpworm(s);
			}

			if (ns.fileExists("SQLInject.exe", "home")) {
				ns.print("Injecting SQL...");
				ns.sqlinject(s);
			}

			ns.print("Nuking...");
			ns.nuke(s);

			// Update filter list to not include this nuked server
			unrootedServers = unrootedServers.filter(f => f != s);
		});

		ns.print(" ");
		ns.print("------------------------------------");
		ns.print(" ");

		// We only want servers that have root access for the rest.
		servers = servers.filter(x => ns.hasRootAccess(x));

		for (var s of servers) {
			if (!ns.hasRootAccess(s)) continue;

			ns.print(`[${s}] is rooted! Setting it up...`);

			// Killall scripts
			ns.print(`[${s}]KillAll command sent.`);
			ns.killall(s);
			await ns.sleep(1000);

			// Transfer files to server.
			var files = ["hack-daemon.js", "easy-hack.js", "weaken.js", "grow.js", "hack.js", "shareCPU.js"];
			ns.print(`[${s}] Copying files...`);
			var success = await ns.scp(files, "home", s);
			ns.print((success ? "Successfully transferred." : `ERROR: Transfer to [${s}] failed!`));

			// Run hacker-daemon/easy-hack
			if (ns.getServerMaxRam(s) < 8) {
				ns.print(`[${s}] Beginning easy-hack...`);
				ns.exec("easy-hack.js", s, Math.max(Math.floor(ns.getServerMaxRam(s) / ns.getScriptRam("easy-hack.js")), 1));
			} else {
				ns.print(`[${s}] Beginning hack-daemon...`);
				ns.exec("hack-daemon.js", s, 1);
			}
		}

		// Backdoor
		/*servers.forEach((s) => {
		    if (ns.hasRootAccess(s)) {
		        // Connect to each server
		        let path = find_path_to_home(s, serverCons);

		        for (let server of path) {
		            ns.connect(server);
		        }

		        await ns.installBackdoor();

		        ns.connect("home");
		    }
		});*/

		ns.print(" ");
		ns.print("------------------------------------");
		ns.print(" ");

		// All is done. Time to hack things.
		if (initialSpread && ns.getServerMaxRam(ns.getHostname()) < 8) {
			ns.print("[home] Beginning easy-hack...");
			ns.exec("easy-hack.js", "home", Math.max(Math.floor(ns.getServerMaxRam(ns.getHostname()) / ns.getScriptRam("easy-hack.js")), 1));
		} else if (initialSpread) {
			ns.print("[home] Beginning hack-daemon...");
			ns.exec("hack-daemon.js", "home", 1);
		}

		initialSpread = false;
		if (maxPorts < 5) {
			ns.print("Sleeping for 1 minutes...");
			await ns.sleep(1000 * 60 * 1);
		} else {
			ns.print("All servers should be rooted.")
			return;
		}
	}
}

function collect_server_names(ns) {
	let fromServers = ['home'];
	let checkedServers = [];
	let serverConnections = new Map();

	for (let i = 0; i < 10000; i++) { // 'infinite' loop
		if (fromServers.length == 0) {
			break;
		}

		let server = fromServers.pop();
		checkedServers.push(server);

		serverConnections.set(server, []);

		for (let conServer of ns.scan(server)) {
			//if (conServer == ".") { continue; }

			serverConnections.get(server)
				.push(conServer);

			if (!checkedServers.includes(conServer)) {
				fromServers.push(conServer);
			}
		}
	}

	checkedServers.shift(); // remove home
	return [checkedServers, serverConnections];
}

/** 
 * @param {string} targetServer
 * @param {Map<string, string[]>} serverCons
 * **/
function find_path_to_home(targetServer, serverCons) {
	let path = [];
	let target = targetServer;

	// check every value for targetServer, store the key
	for (let i = 0; i < 100; i++) { // 'infinite' loop
		if (target == 'home') {
			break;
		}

		find_keys: {
			for (let server of serverCons.keys()) {
				let serversToSearch = serverCons.get(server);

				if (serversToSearch.includes(target)) {
					if (!path.includes(server)) {
						path.unshift(server);
						target = server;
					}
					break find_keys;
				}
			}
		}
	}

	return path;
}