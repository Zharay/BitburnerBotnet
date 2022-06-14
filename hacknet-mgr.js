/**An upgrade manager for the HackNet!
 * Intelligently purchases and upgrades servers of your hacknet. It
 * will do so by only upgrading the bits that are cheapest before bringing 
 * the rest of the farm up to the same level.
 * 
 * This script super efficient with your money and will only stop when it 
 * reaches whatever you've set the max income to.
 * 
 * Can be run completely stand alone!
 * 
 * 	Originally By: ?????
 *	NOTE: IF YOU KNOW WHO WROTE THIS SCRIPT PLEASE TELL ME!! 
 *	I want to buy that person a beer lol. This script is super clean!
**/

/** @param {NS} ns **/
export async function main(ns) {
	
	/** OPTIONS */
	let maxIncome = 1e9;
	let spendPercentage = 0.1;

	if (ns.args.length)
		maxIncome = parseInt(ns.args[0]);
	if (ns.args.length > 1)
		spendPercentage = parseFloat(ns.args[1]);

	ns.disableLog("ALL");
	ns.print("Max Nodes: " + ns.hacknet.maxNumNodes());

	if (ns.hacknet.numNodes() == 0) {
		await waitForCash(ns, ns.hacknet.getPurchaseNodeCost(), spendPercentage);
		ns.hacknet.purchaseNode();
	}

	var fKill = ns.getPortHandle(17);

	while (fKill.peek() == "NULL PORT DATA") {
		await upgradeToMatch(ns, 0, spendPercentage);

		let baseNode = ns.hacknet.getNodeStats(0);
		let curProd = baseNode.production * ns.hacknet.numNodes();

		ns.print("Current Production: " + ns.nFormat(curProd, "$0.000").toUpperCase());
		if (curProd > maxIncome)
			break;

		let bestUpgrade = bestNodeUpgrade(ns, 0);
		ns.print('Best upgrade for Node 0: ' + bestUpgrade);

		let upgradePPC = 0;
		let nodePPC = await nodeProdPerCost(ns, baseNode.level, baseNode.ram, baseNode.cores);

		if (bestUpgrade == 'L')
			upgradePPC = levelProdPerCost(ns, baseNode.level, baseNode.ram, baseNode.cores);
		else if (bestUpgrade == 'R')
			upgradePPC = ramProdPerCost(ns, baseNode.level, baseNode.ram, baseNode.cores);
		else if (bestUpgrade == 'C')
			upgradePPC = coreProdPerCost(ns, baseNode.level, baseNode.ram, baseNode.cores);

		ns.print('nodePPC: ' + nodePPC);

		if (upgradePPC > nodePPC) {
			ns.print('Upgrading Node 0.');
			switch (bestUpgrade) {
				case 'L':
					ns.print('Upgrading Node 0 level...');
					await waitForCash(ns, ns.hacknet.getLevelUpgradeCost(0, 1), spendPercentage);
					ns.hacknet.upgradeLevel(0, 1);
					ns.print('Level upgrade successful. Current level: ' + ns.hacknet.getNodeStats(0).level);
					break;
				case 'R':
					ns.print('Upgrading Node 0 ram...');
					await waitForCash(ns, ns.hacknet.getRamUpgradeCost(0, 1), spendPercentage);
					ns.hacknet.upgradeRam(0, 1);
					ns.print('Ram upgrade successful. Current Ram: ' + ns.hacknet.getNodeStats(0).ram + 'GB');
					break;
				case 'C':
					ns.print('Upgrading Node 0 core...');
					await waitForCash(ns, ns.hacknet.getCoreUpgradeCost(0, 1), spendPercentage);
					ns.hacknet.upgradeCore(0, 1);
					ns.print('Core upgrade successful. Current Core count: ' + ns.hacknet.getNodeStats(0).cores);
					break;
			}
			ns.print('Upgrade of Node 0 complete.');
		} else if (upgradePPC < nodePPC) {
			ns.print('Buying new node...');
			await waitForCash(ns, ns.hacknet.getPurchaseNodeCost(), spendPercentage);
			ns.hacknet.purchaseNode();
			ns.print('Successfully bought Node ' + ns.hacknet.numNodes());
		}

		await ns.sleep(500);
	}
	ns.print('Hacknet fully upgraded.');
}

/** @param {NS} ns **/
async function levelUpgradeCostTotal(ns, level) {
	let mult = ns.getHacknetMultipliers().levelCost;
	let result = 0;
	let i = 1;

	while (i < level) {
		result = result + 520 * mult * Math.pow(1.04, i - 1);
		++i;
		await ns.sleep(200);
	}

	return result;
}

/** @param {NS} ns **/
async function ramUpgradeCostTotal(ns, ram) {
	let mult = ns.getHacknetMultipliers().ramCost;
	let result = 0;
	let i = 0;

	while (i < Math.log2(ram)) {
		result = result + 30000 * mult * Math.pow(1.04, i);
		++i;
		await ns.sleep(200);
	}

	return result;
}

/** @param {NS} ns **/
async function coreUpgradeCostTotal(ns, cores) {
	let mult = ns.getHacknetMultipliers().coreCost;
	let result = 0;
	let i = 1;

	while (i < cores) {
		result = result + 500000 * mult * 1.04 ^ (i - 1);
		++i;
		await ns.sleep(200);
	}

	return result;
}

/** @param {NS} ns **/
async function nodeProdPerCost(ns) {
	if (ns.hacknet.numNodes() == ns.hacknet.maxNumNodes())
		return 0;

	let node = ns.hacknet.getNodeStats(0);
	let nodeCost = ns.hacknet.getPurchaseNodeCost();
	let levelCost = await levelUpgradeCostTotal(ns, node.level);
	let ramCost = await ramUpgradeCostTotal(ns, node.ram);
	let coreCost = await coreUpgradeCostTotal(ns, node.cores);

	return ns.hacknet.getNodeStats(0).production / (nodeCost + levelCost + ramCost + coreCost);
}

/** @param {NS} ns **/
function levelProdPerCost(ns, x, y, z) {
	if (x == 200)
		return 0;

	let mult = ns.getHacknetMultipliers().production;
	let prodGain = mult * 0.25 * Math.pow(1.035, y - 1) * (z + 5);
	let levelCost = ns.hacknet.getLevelUpgradeCost(0, 1);

	return prodGain / levelCost;
}

/** @param {NS} ns **/
function ramProdPerCost(ns, x, y, z) {
	if (y == 64)
		return 0;

	let mult = ns.getHacknetMultipliers().production;
	let prodGain = mult * x * 0.25 * (Math.pow(1.035, 2 * y - 1) - Math.pow(1.035, y - 1)) * (z + 5);
	let ramCost = ns.hacknet.getRamUpgradeCost(0, 1);

	return prodGain / ramCost;
}

/** @param {NS} ns **/
function coreProdPerCost(ns, x, y, z) {
	if (z == 16)
		return 0;

	let mult = ns.getHacknetMultipliers().production;
	let prodGain = mult * x * 0.25 * Math.pow(1.035, y - 1);
	let coreCost = ns.hacknet.getCoreUpgradeCost(0, 1);

	return prodGain / coreCost;
}

/** @param {NS} ns **/
function bestNodeUpgrade(ns, index) {
	let bestUpgrade = 'X';
	let node = ns.hacknet.getNodeStats(index);

	let l = levelProdPerCost(ns, node.level, node.ram, node.cores);
	ns.print('levelPPC Node ' + index + ': ' + l);

	let r = ramProdPerCost(ns, node.level, node.ram, node.cores);
	ns.print('ramPPC Node ' + index + ': ' + r);

	let c = coreProdPerCost(ns, node.level, node.ram, node.cores);
	ns.print('corePPC Node ' + index + ': ' + c);

	let max = Math.max(l, r, c);

	if (max == 0)
		bestUpgrade = 'N';
	else if (max == c)
		bestUpgrade = 'C';
	else if (max == r)
		bestUpgrade = 'R';
	else if (max == l)
		bestUpgrade = 'L';

	if (bestUpgrade == 'X') {
		ns.print('Error. BestNodeUpgrade Condition not triggering.');
		ns.exit();
	}

	ns.print('BestNodeUpgrade Node ' + index + ': ' + bestUpgrade);

	return bestUpgrade;
}

/** @param {NS} ns **/
async function waitForCash(ns, cost, spendPercentage) {
	if ((ns.getServerMoneyAvailable("home") * spendPercentage) < cost)
		ns.print('Not enough money. Waiting for funds to reach: ' + ns.nFormat((ns.getServerMoneyAvailable("home") * spendPercentage), "$0.00a") + ' / ' + ns.nFormat(cost, "$0.00a"));

	var fKill = ns.getPortHandle(17);
	while ((ns.getServerMoneyAvailable("home") * spendPercentage) < cost && fKill.peek() == "NULL PORT DATA")
		await ns.sleep(1000*60);

	if (fKill.peek() != "NULL PORT DATA")
		ns.exit();
}

/** @param {NS} ns **/
async function upgradeToMatch(ns, baseIndex, spendPercentage) {
	ns.print('Upgrading Nodes to match Node ' + baseIndex + '.');
	let baseNode = ns.hacknet.getNodeStats(baseIndex);

	for (let i = 1; i < ns.hacknet.numNodes(); ++i) {
		let curNode = ns.hacknet.getNodeStats(i);

		while (curNode.ram < baseNode.ram) {
			ns.print('Upgrading Node ' + i + ' ram. Current ram: ' + curNode.ram);
			await waitForCash(ns, ns.hacknet.getRamUpgradeCost(i, 1, spendPercentage));
			ns.hacknet.upgradeRam(i, 1);
			curNode = ns.hacknet.getNodeStats(i);
			await ns.sleep(1000*60);
		}

		while (curNode.level < baseNode.level) {
			ns.print('Upgrading Node ' + i + ' level. Current level: ' + curNode.level);
			await waitForCash(ns, ns.hacknet.getLevelUpgradeCost(i, 1, spendPercentage));
			ns.hacknet.upgradeLevel(i, 1);
			curNode = ns.hacknet.getNodeStats(i);
			await ns.sleep(1000*60);
		}

		while (curNode.cores < baseNode.cores) {
			ns.print('Upgrading Node ' + i + ' core. Current cores: ' + curNode.cores);
			await waitForCash(ns, ns.hacknet.getCoreUpgradeCost(i, 1, spendPercentage));
			ns.hacknet.upgradeCore(i, 1);
			curNode = ns.hacknet.getNodeStats(i);
			await ns.sleep(1000*60);
		}

		ns.print('Upgrade of Node ' + i + ' complete.');
		await ns.sleep(1000*60);
	}
}