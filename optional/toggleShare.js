/** @param {NS} ns */
export async function main(ns) {
    if (ns.peek(17) == "share") {
        ns.tprint("Telling private servers to stop sharing...");
        await ns.clearPort(17);
    } else {
        ns.tprint("Telling private servers to start sharing...");
        await ns.tryWritePort(17, "share");
    }
	ns.tprint("Have a nice day :)");
}