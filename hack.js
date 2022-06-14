/**Hack() script.
 * This will report via ports to the coordinator which has 0 RAM cost!
 * Requires the hack-daemon!
 * 	Written By: Zharay
 *  URL: https://github.com/Zharay/BitburnerBotnet
**/

/** @param {NS} ns */
export async function main(ns) {
	var target = "";
	var host = "";
	var threads = 0;
	var ram = 0;
	var security = 0;

	if (ns.args.length) {
		target = ns.args[0];
		ns.print("Target: " + target);
	} else {
		ns.print("ERROR: No target set!");
		return;
	}

	if (ns.args.length > 1) {
		host = ns.args[1];
		ns.print("Host: " + host);
	}

	if (ns.args.length > 2) {
		threads = ns.args[2];
		ns.print("Threads: " + threads);
	}

	if (ns.args.length > 3) {
		ram = ns.args[3];
		ns.print("RAM: " + ram);
	}

	if (ns.args.length > 4) {
		security = ns.args[4];
		ns.print("Security Risk: " + security);
	}

	var task = {"target" : target, "host" : host, "task" : "hack", "done" : false, "threads" : threads, "ram" : ram, "security" : security};

	if (host != "EXP") {
		ns.print("Reporting of incoming hack...");
		await ns.tryWritePort(13, JSON.stringify(task));
	} else {
		ns.print("Reporting EXP hack...");
		await ns.tryWritePort(14, JSON.stringify(task));
	}

	ns.print("Hacking...");
	await ns.hack(target);

	task.done = true;
	task.security *= -1;
	if (host != "EXP") {
		ns.print("Reporting of hack completion...")
		await ns.tryWritePort(13, JSON.stringify(task));
	} else {
		ns.print("Reporting EXP hack completion...");
		await ns.tryWritePort(14, JSON.stringify(task));
	}
}