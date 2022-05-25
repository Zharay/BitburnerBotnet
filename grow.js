/** @param {NS} ns */
export async function main(ns) {
	var target = "";
	var threshModifier = 0.75;
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
		threshModifier = parseFloat(ns.args[1]);
		if (threshModifier <= 0) {
			ns.print("ERROR: Threshold is set to [" + threshModifier + "]");
			return;
		}
	} 

	if (ns.args.length > 2) {
		host = ns.args[2];
		ns.print("Host: " + host);
	}

	if (ns.args.length > 3) {
		threads = ns.args[3];
		ns.print("Threads: " + threads);
	}

	if (ns.args.length > 4) {
		ram = ns.args[4];
		ns.print("RAM: " + ram);
	}

	if (ns.args.length > 5) {
		security = ns.args[5];
		ns.print("Security Risk: " + security);
	}

	var task = {"target" : target, "host" : host, "task" : "grow", "done" : false, "threads" : threads, "ram" : ram, "security" : security};

	if (host != "EXP") {
		ns.print("Reporting of incoming growth...")
		await ns.tryWritePort(13, JSON.stringify(task));
	} else {
		ns.print("Reporting EXP growth...");
		await ns.tryWritePort(14, JSON.stringify(task));
	}

	ns.print("Growing money...");
	await ns.grow(target);
	
	task.done = true;
	task.security *= -1;
	if (host != "EXP") {
		ns.print("Reporting of growth completion...")
		await ns.tryWritePort(13, JSON.stringify(task));
	} else {
		ns.print("Reporting EXP growth...");
		await ns.tryWritePort(14, JSON.stringify(task));
	}

}