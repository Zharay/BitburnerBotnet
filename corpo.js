/** Script to run your corporation for you.
 * 		Originally By: Kamukrass
 * 		GitHub: https://github.com/kamukrass/Bitburner
 * 		
 * 		This script has been given a complete overhaul.
 * 
 * 		RECOMMENDED THAT YOU START A BUSINESS IN SOMETHING SIMPLE LIKE AGRICULTURE FIRST!
 * 
 * 		Required:
 * 			- 1TB RAM
 * 			- $150b (personal)
 * 			- Office API ($50b corp funds)
 * 			- Warehouse API ($50b corp funds)
 * 			- DO NOT GET THOSE API UNTIL YOU HAVE PROFITS
 * 
 * 	Will be using (this guide)[https://docs.google.com/document/d/15hN60PmzmpXpT_JC8z_BU47gaZftAx4zaOnWAOqwoMw/edit?usp=sharing]
 * 		Please follow the first section before even starting this script.
 */

const maxEmployees = 420;
const timeBetweenHires = 5*60*1000; 

/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog("ALL");

	// Originally tried to create a corp if you don't have. BAD IDEA.
	if (!ns.getPlayer().hasCorporation && ns.getPlayer().money >= 1.5e9) {
		ns.print("WARNING: You will need enough corporation funds for Office and Warehouse APIs! Please manage the company yourself for its starting capitol!");
		ns.corporation.createCorporation("Corpo Industries");
		ns.print("Created Corpo Industries ($150b)");
		ns.sleep(1000*60);
	} else if (!ns.getPlayer().hasCorporation)
	{
		ns.print("ERROR: Not enough funds to even start a corporation. You are too poor!")
		return;
	}

	var corp = ns.corporation.getCorporation();

	// If we just created the corporation, at least do the first steps that we can.
	if (corp.divisions.length == 0) {
		ns.print("Expanding into Agriculture ($40b)...");
		ns.corporation.expandIndustry("Agriculture", "Agriculture");

		ns.print("Unlocking Smart Supply ($25b)...");
		ns.corporation.unlockUpgrade("Smart Supply");
		// Cannot enable this without Warehouse API

		// THE REST MUST BE DONE MANUALLY!!!
		// PLEASE FOLLOW THIS SIMPLIFIED GUIDE

		// Expand into 4 cities ($4b each for $20b)
		// Hire 3 employees at each city and put them into Operations, Engineer, Business
		// Increase warehouse storage at each to 300 (($5b + $1.14b + $1.22b)*5 + $1.14b + $1.22b)
		// Spend on AdVert.Inc x5 ? ($1b + 1.06b + 1.12b + 1.19b + 1.262b)
		// Set sell price to Plants and Food to MAX & MP
		// At this point you will be at $20.16b and making $190k/sec

		// Upgrade 2x (in order): FocusWires, Neural Accelerators, Speech Processor Implants, Nuoptimal Nootropic Injector Implants, Smart Factories
		// This will leave you at around $4.7b

		// Obtain at each city: 125 Hardware, 75 AI Cores, 27k Real Estate
			// ACTUAL VALUES (one 10sec tick) = Hardware: 12.5 | AI Cores: 7.5 | Real Estate: 2700
			// Don't be me. Make SURE you clear your buy orders!
		// This will leave you at around $4-5b
		// But profits will be at around $1.5m/sec. Nice.

		// Find Investor for a $210b for 10% stock .
			// TIP: If you do not have this (and only seeing $108b or so) then:
				// Stop all your sales, set everyone to Business, and (if you have enough) increase storage to 400 at all cities.
				// Set all employees back to their positions and as quickly as possible set the sales back to normal
				// Immediately go back to Find Investors. You should get $210b or so as an offer!

		// Increase Office to 9 and set employees to 2 in each sector except Business (leave at 1) ($160b left)
		// Upgrade Smart Factories and Smart Storage to 10 ($110b left)
		// Upgrade Warehouses to 2k ($45b left or more if you did the investor trick)

		// Obtain at each city: 2800 Hardware, 96 Robots, 2.52k AI Cores, 146.4k Real Estate 
			// ACTUAL VALUES (one 10sec tick) = Hardware: 267.5 | Robots: 9.6 | AI Cores: 244.5 | Real Estate: 11940
		// Will end up with little no no funds after

		// Find Investor for $5t for 10% stock.
			// Once again, if you are not on BN3 then it'll be half this. Do the trick mentioned to double it.

		// Obtain at each city: 9.3k Hardware, 726 Robots, 6.27k AI Cores, 230.4k Real Estate 
			// ACTUAL VALUES (one 10sec tick) = Hardware: 650 | Robots: 63 | AI Cores: 375 | Real Estate: 8400
		// Will end up with $4.8b, 500~ Production, and $32m/sec in Profits. Very Nice.

		// NOW YOU ARE READY TO USE THIS SCRIPT.
		// Just give it some time first to generate some funds!

		ns.toast("Corpo.js requires that you manage the company yourself for its starting capitol! Please follow the guide found in corpo.js!", "warning");
	}

	while (!ns.corporation.hasUnlockUpgrade("Warehouse API") && !ns.corporation.hasUnlockUpgrade("Office API")) {
		ns.print("Waiting for Warehouse and Office APIs to be unlocked...");
		await ns.sleep(1000*60*5);
	}

	corp = ns.corporation.getCorporation();
	var tobaccoIndex = corp.divisions.findIndex(x => x.type == "Tobacco");

	// Setup Tobacco industry following the guide.
	if (tobaccoIndex == -1) {
		ns.print("No Tobacco industry found. Will create it...");
		await waitForFunds(ns, 40e9);

		ns.corporation.expandIndustry("Tobacco", "Tobacco");

		corp = ns.corporation.getCorporation();
		tobaccoIndex = corp.divisions.findIndex(x => x.type == "Tobacco");

		// Expand and set up first set of employees (smartly)
		await initCities(ns, corp.divisions[tobaccoIndex]);
		ns.print("Tobacco industry setup complete. Lets get to business...");
	}

	ns.toast("Corporation is now being automated!");

	// Retain a number of divisions.
	var numDivisions = corp.divisions.length;
	var whenLastHandleEmployees = 0;

	while (true) {
		corp = ns.corporation.getCorporation();

		//  If the player makes a new division, we will handle it.
		if (numDivisions != corp.divisions.length) {
			ns.print(`Detected a new division! Will initialize [${corp.divisions[corp.divisions.length-1]}]`);
			ns.toast(`Detected a new division! Will initialize [${corp.divisions[corp.divisions.length-1]}]`);
			await initCities(ns, corp.divisions[corp.divisions.length-1]);
			numDivisions = corp.divisions.length;
		}

		// Handle corporation level upgrades and unlocks
		handleUpgrades(ns);

		// The main loop for managing your corporation
		for (const division of corp.divisions.reverse()) {
			// Skip any industry that cannot make products (ie. Agriculture)
			if (!division.makesProducts) { 
				// ns.print (`Skipping [${division.name}]`);
				continue;
			}

			// Handle our products first.
			await handleProducts(ns, division);

			// Handle our advertisements... Only if its cost is lower than upgrading Aevum office by 15!
			if (ns.corporation.getHireAdVertCost(division.name) < ns.corporation.getOfficeSizeUpgradeCost(division.name, "Aevum", 15)) {
				handleAds(ns, division);
			}

			// Handle our employees... But only every 5 minutes.
			if (((new Date()) - whenLastHandleEmployees) >= timeBetweenHires) {
				await handleEmployees(ns, division);
				whenLastHandleEmployees = new Date();
			}

			// Handle our research.
			handleResearch(ns, division);

			// Handle our warehouses.
			handleWarehouses(ns, division);
		}

		// Wait 5 sec
		await ns.sleep(5000);
	}
}

/**
 * Purchase upgrades and unlocks based on available funds and priority; see upgradeList
 * @param {NetScript} ns 
 */
function handleUpgrades(ns) {
	for (const upgrade of upgradeList) {
		// Fixed the old version of this code by adding a limiter and removed the total exclusion of ABS SalesBots and Wilson Analytics (lol)
		if (ns.corporation.getUpgradeLevel(upgrade.name) < upgrade.max && ns.corporation.getCorporation().funds >= (upgrade.prio * ns.corporation.getUpgradeLevelCost(upgrade.name))) {
			ns.print(`[CORP] Upgrading ${upgrade.name} to ${ns.corporation.getUpgradeLevel(upgrade.name) + 1} (${ns.nFormat(ns.corporation.getUpgradeLevelCost(upgrade.name),"$0.00a")})`);
			ns.corporation.levelUpgrade(upgrade.name);
		}
	}
	
	// Only get shady accounting or Government Partnership if you have 4x the funds (ie. end game)
	if (!ns.corporation.hasUnlockUpgrade("Shady Accounting") && ns.corporation.getUnlockUpgradeCost("Shady Accounting") * 4 < ns.corporation.getCorporation().funds) {
		ns.print(`[CORP] Unlocking Shady Accounting (${ns.corporation.getUnlockUpgradeCost("Shady Accounting")})`)
		ns.corporation.unlockUpgrade("Shady Accounting");
	} else if (!ns.corporation.hasUnlockUpgrade("Government Partnership") && ns.corporation.getUnlockUpgradeCost("Government Partnership") * 4 < ns.corporation.getCorporation().funds) {
		ns.print(`[CORP] Unlocking Government Partnership (${ns.corporation.getUnlockUpgradeCost("Government Partnership")})`)
		ns.corporation.unlockUpgrade("Government Partnership");
	}
}

/**
 * Primary function that handles each product for a specific division. It will constantly create new products when the maximum is reached.
 * @param {NetScript} ns 
 * @param {Division} division 
 * @returns NULL
 */
 async function handleProducts(ns, division) {
	var isDeveloping = false;

	//ns.print(`[${division.name}] Handling products...`);

	// First check to see if we even have a product.
	if (division.products.length == 0) {
		ns.print(`[${division.name}] No products being made. Making a new one!`);
		await waitForFunds(ns, 1e9);
		var prodName = generateRandomName(division.products, division.type);
		ns.corporation.makeProduct(division.name, "Aevum", prodName, 1e9, 1e9);
		return;
	}

	// Handle the other products if we have any
	for (var productName of division.products) {
		// If we are still producing this product, skip it.
		if (ns.corporation.getProduct(division.name, productName).developmentProgress < 100) {
			isDeveloping = true;
			continue;
		}

		// Make sure we have the optimal price if we haven't yet
		await determineMaxMarketPrice(ns, division, productName);
	}


	var maxProducts = 3	+ (ns.corporation.hasResearched(division.name, "uPgrade: Capacity.I") ? 1 : 0) 
						+ (division.products.length < 5 && ns.corporation.hasResearched(division.name, "uPgrade: Capacity.II") ? 1 : 0);

	if (division.products.length < maxProducts && !isDeveloping) {
		// If we have slots and are not developing, create a new product!
		ns.print(`[${division.name}] Empty product slot available. Making a new product!`)
		await waitForFunds(ns, 1e9);
		var prodName = generateRandomName(division.products, division.type);
		ns.corporation.makeProduct(division.name, "Aevum", prodName, 1e9, 1e9);
	} else if (division.products.length == maxProducts && !isDeveloping) {
		if (ns.corporation.hasResearched(division.name, "Market-TA.II") && division.research < 140000) {
			ns.print(`[${division.name}] Not going to discontinue products while research is too low.`)
			return;
		}

		// If we don't have slots and are not developing, remove the worst performing product!
		var lowestPerformer = "";
		var lowestMP = 0;
		for (var productName of division.products) {
			var nMP = parseFloat(ns.corporation.getProduct(division.name, productName).sCost.split("*")[1]);
			if (lowestMP == 0 || nMP < lowestMP) {
				lowestMP = nMP;
				lowestPerformer = productName;
			}
		}

		if (lowestPerformer != "") {
			ns.print(`[${division.name}] Discontinuing lowest performing product [${lowestPerformer}]`);
			ns.corporation.discontinueProduct(division.name, lowestPerformer);
		}
	}
}

/**
 * Will try and determine what the maximum Market Price is for each product.
 * @param {NetScript} ns 
 * @param {Division} division 
 * @param {String} productName 
 * @returns null
 */
async function determineMaxMarketPrice(ns, division, productName) {
	var mpMultiplier = 1;
	var mpPower = 0;
	var product = ns.corporation.getProduct(division.name, productName);

	if (ns.corporation.hasResearched(division.name, "Market-TA.II") && product.sCost == 0) {
		// First check if we have researched Market-TA.II. If we do, just set it and forget it.
		ns.print(`[${division.name}] Setting ${product.name} to sell with Market-TA.I & II.`);
		ns.corporation.setProductMarketTA1(division.name, productName, true);
		ns.corporation.setProductMarketTA2(division.name, productName, true);
		ns.corporation.sellProduct(division.name, "Aevum", productName, "MAX", "MP", true);
		return;
	} else if (ns.corporation.hasResearched(division.name, "Market-TA.II") && product.sCost != 0) {
		// We already have it set to its best price automatically or this is our first ever product made
		return;
	} else if (String(product.sCost).includes("*") && String(product.sCost).split("*")[1] != "1" && product.cityData["Aevum"][1].toFixed(2) == product.cityData["Aevum"][2].toFixed(2)) {
		// If we have a multiplier already, then we've already determined the best MP.
		// Only continue if we are no longer selling at a proper rate.
		return;
	} else if (product.cityData["Aevum"][1].toFixed(2) != product.cityData["Aevum"][2].toFixed(2)) {
		// Determine if we actually have an issue (cause it blips every tick)
		var notEqualCount = 0;
		for (var i = 0; i < 3; i++) {
			await ns.sleep(5000);
			product = ns.corporation.getProduct(division.name, productName);
			notEqualCount =+ product.cityData["Aevum"][1].toFixed(2) != product.cityData["Aevum"][2].toFixed(2) ? 1 : 0;
		}
		if (notEqualCount < 1) return;

		ns.print(`[${division.name}] ${product.name} is not selling optimally.`);
	}

	ns.print(`[${division.name}] Manually determining max Market Price of ${productName}`);

	// If we have any excess product, clear it from the warehouses
	if (product.cityData["Aevum"][0] > product.cityData["Aevum"][1] * 10) {
		ns.print(`[${division.name}] Shedding excess ${productName}.`)
		ns.corporation.sellProduct(division.name, "Aevum", productName, "MAX", "1", true);
		await ns.sleep(5000);
	}

	// Determine best multiplier out of all products
	var bestRating = 0;
	var bestMP = "";
	for(var pName of division.products) {
		if (pName == productName) continue;

		if (ns.corporation.getProduct(division.name, pName).rat > bestRating) {
			bestRating = ns.corporation.getProduct(division.name, pName).rat;
			bestMP = String(ns.corporation.getProduct(division.name, pName).sCost);
		}
	}
	if (bestRating < product.rat && bestRating != 0 && bestMP.includes("*")) {
		// If we found a rating to base our MP on, find the multiplier and power.
		ns.print(`[${division.name}] Using another product's MP to start (${bestMP})`);
		mpMultiplier = parseInt(bestMP.split("*")[1]);
	} else if (product.cityData["Aevum"][1].toFixed(2) != product.cityData["Aevum"][2].toFixed(2) 
				&& String(product.sCost).includes("*") && String(product.sCost).split("*")[1] != "1") {
		// We get here if we couldn't find a base 
		ns.print(`[${division.name}] Using original MP to start (${product.sCost})`);
		mpMultiplier = parseInt(product.sCost.split("*")[1]);
	}
	
	// First determine the power
	mpPower = parseInt(mpMultiplier.toExponential().split("+")[1]) - 1 ;
	mpPower = mpPower < 0 ? 0 : mpPower;

	// Then determine our multiplier (shift it by 1 decimal)
	mpMultiplier = parseFloat(mpMultiplier.toExponential().split("e")[0]) * (mpMultiplier.toExponential().includes(".") ? 10 : 1);
	
	// Now modify our exponential so we start a little lower
	var newExp = modExponential(mpMultiplier, mpPower, -5);
	mpMultiplier = newExp.multi;
	mpPower = newExp.pow;

	var newMP = parseFloat(mpMultiplier + "e" + mpPower);
	product = ns.corporation.getProduct(division.name, productName);
	ns.print(`[${division.name}] Starting MP at ${newMP}`);

	// cityData : [{"city": [quantity, producing, selling]}]
	// This gets updated every tick. Best case, if you are producing 8/sec, you want to be selling 8/sec

	// We loop until the number produced is equal to the number sold. (woo do..while loops!) 
	do {
		newMP = parseFloat(mpMultiplier + "e" + mpPower);
		ns.print(`[${division.name}] ${product.name} is not selling optimally. Determining max market price (MP * ${newMP})...`);
		ns.corporation.sellProduct(division.name, "Aevum", productName, "MAX", `MP*${newMP}`, true);
		
		// We always go from 1 to 99 before going up a power (ie. 1e0 = 1, 99e0 = 99, 10e1 = 100, 99e1 = 990...)
		// In my previous runs, once you go beyond 100, the granularity goes out the window.

		ns.print(`[${division.name}] ${productName}: Producing: ${ns.nFormat(product.cityData["Aevum"][1],"0.000")} | Selling: ${ns.nFormat(product.cityData["Aevum"][2],"0.000")}`);
			
		newExp = modExponential(mpMultiplier, mpPower, 1);
		mpMultiplier = newExp.multi;
		mpPower = newExp.pow;

		// Wait 10 seconds before checking again.
		await ns.sleep(5000);

		product = ns.corporation.getProduct(division.name, productName);
	} while (product.cityData["Aevum"][1].toFixed(2) == product.cityData["Aevum"][2].toFixed(2))

	ns.print(`[${division.name}] ${productName}: Producing: ${ns.nFormat(product.cityData["Aevum"][1],"0.000")} | Selling: ${ns.nFormat(product.cityData["Aevum"][2],"0.000")}`);

	// We must have found our optimal multiplier. Step back two (since it already is +1 over last good one).
	newExp = modExponential(mpMultiplier, mpPower, -2);
	mpMultiplier = newExp.multi;
	mpPower = newExp.pow;
	
	newMP = parseFloat(mpMultiplier + "e" + mpPower);
	ns.print(`[${division.name}] ${product.name}'s optimal MP has been found (MP * ${newMP})...`);
	ns.corporation.sellProduct(division.name, "Aevum", productName, "MAX", `MP*${newMP}`, true);
}

/**
 * Handles the purchasing of Advertisements per division.
 * @param {NetScript} ns 
 * @param {Division} division 
 */
function handleAds(ns, division) {
	if (ns.corporation.getCorporation().funds >= ns.corporation.getHireAdVertCost(division.name)) {
		ns.print(`[${division.name}] Advertising ${division.name} (${ns.nFormat(ns.corporation.getHireAdVertCost(division.name), "$0.00a")})`);
		ns.corporation.hireAdVert(division.name);
	}
}

/**
 * 
 * @param {NetScript} ns 
 * @param {Division} division 
 * @param {String} productCity 
 */
async function handleEmployees(ns, division, productCity = "Aevum") {
	var areCitiesCaughtUp = true;
	for (var city of division.cities) {
		// He handle the productCity AFTER the others are done.
		if (city == productCity) 
			continue;

		// We only upgrade if the productCity is more than 60 positions ahead (and if we have the money)
		var numEmployees = ns.corporation.getOffice(division.name, city).employees.length;
		var numProdEmployees = ns.corporation.getOffice(division.name, productCity).employees.length;
		if(numProdEmployees - numEmployees > 60 && ns.corporation.getCorporation().funds >= ns.corporation.getOfficeSizeUpgradeCost(division.name, city, 15) ) {
			await expandEmployees(ns, division, city);
		} else if (numProdEmployees - numEmployees > 60) {
			areCitiesCaughtUp = false;
		}
	}

	// Now we handle the product city. We only care if the other cities are within 60 employees (and if we have the money)
	if (areCitiesCaughtUp && ns.corporation.getOffice(division.name, productCity).employees.length < maxEmployees && ns.corporation.getCorporation().funds >= ns.corporation.getOfficeSizeUpgradeCost(division.name, productCity, 15) ) {
		await expandEmployees(ns, division, productCity);
	}
}

/**
 * Hires employees 15 (by default) at a time and evenly distributes them regardless of city
 * @param {*} ns NetScript
 * @param {*} division The division (reference) you are hiring for
 * @param {String} city Name of the city we are expanding
 * @param {Number} numToHire Number of employees to hire (please do in multiples of 5!)
 */
async function expandEmployees(ns, division, city, numToHire = 15) {
	if (numToHire != 0) {
		// Only hire if we are asked to do so 
		ns.print(`[${division.name}] Upgrading ${division.name}'s office in ${city}`);
		await waitForFunds(ns, ns.corporation.getOfficeSizeUpgradeCost(division.name, city, numToHire));

		// Upgrade office by 15 and hire the employees.
		ns.corporation.upgradeOfficeSize(division.name, city, numToHire);
		for (var i = 0; i < numToHire; i++) {
			await ns.corporation.hireEmployee(division.name, city);
		}
	}

	var numEmployees = ns.corporation.getOffice(division.name, city).employees.length;
	if (numEmployees == 0) return;
	ns.print(`[${division.name}] Distributing ${numEmployees} employees evenly`);

	// Since we are always hiring in chunks of 15, we can distribute it as follows
	// Training = Only used to increase an employee's stats. Do this on your own.
	await ns.corporation.setAutoJobAssignment(division.name, city, "Training", 0);
	await ns.corporation.setAutoJobAssignment(division.name, city, "Operations", numEmployees/5);
	await ns.corporation.setAutoJobAssignment(division.name, city, "Engineer", numEmployees/5);
	await ns.corporation.setAutoJobAssignment(division.name, city, "Business", numEmployees/5);
	await ns.corporation.setAutoJobAssignment(division.name, city, "Management", numEmployees/5);
	await ns.corporation.setAutoJobAssignment(division.name, city, "Research & Development", numEmployees/5);
}

/**
 * Handles research of a particular division. Mostly unchanged from original.
 * @param {NetScript} ns 
 * @param {Division} division 
 */
function handleResearch(ns, division) {
	const laboratory = "Hi-Tech R&D Laboratory"
	const marketTAI = "Market-TA.I";
	const marketTAII = "Market-TA.II";

	if (!ns.corporation.hasResearched(division.name, laboratory)) {
		// always research Laboratory first
		if (division.research > ns.corporation.getResearchCost(division.name, laboratory)) {
			ns.print(`[${division.name}] is researching ${laboratory}`);
			ns.corporation.research(division.name, laboratory);
		}
	} else if (!ns.corporation.hasResearched(division.name, marketTAII)) {
		// always research Market-TA.I plus .II first and in one step
		var researchCost = ns.corporation.getResearchCost(division.name, marketTAI) + ns.corporation.getResearchCost(division.name, marketTAII);
		if (division.research >= researchCost * 1.1) {
			// We will skip this if we are making a new product. Better for profits in the long run!
			for(var product of division.products) {
				if (ns.corporation.getProduct(division.name, productName).developmentProgress < 100) {
					ns.print(`[${division.name}] Skipping ${marketTAI} + ${marketTAII}. Waiting for development to complete first.`);
					return;
				}
			}
			ns.print(`[${division.name}] is researching ${marketTAI}`);
			ns.corporation.research(division.name, marketTAI);
			
			ns.print(`[${division.name}] is researching ${marketTAII}`);
			ns.corporation.research(division.name, marketTAII);

			// Immediately set all products to use this feature.
			for (var product of division.products) {
				ns.corporation.setProductMarketTA1(division.name, product, true);
				ns.corporation.setProductMarketTA2(division.name, product, true);
			}
		}
	} else {
		// This is optional but useful when setup right.
		for (const researchObject of researchList) {
			// research other upgrades based on available funds and priority; see researchList
			if (!ns.corporation.hasResearched(division.name, researchObject.name)) {
				if (division.research > (researchObject.prio * ns.corporation.getResearchCost(division.name, researchObject.name))) {
					ns.print(`[${division.name}] is researching ${researchObject.name}`);
					ns.corporation.research(division.name, researchObject.name);
				}
			}
		}
	}
}

/**
 * Iterates a division's cities and upgrades the warehouse if near capacity. This is technically a problem.
 * @param {NetScript} ns 
 * @param {Division} division 
 */
function handleWarehouses(ns, division) {
	var isWarehouseFull = false;
	// check if warehouses are near max capacity and upgrade if needed
	for (const city of cities) {
		var cityWarehouse = ns.corporation.getWarehouse(division.name, city);
		if (cityWarehouse.sizeUsed > 0.9 * cityWarehouse.size) {
			ns.print(`WARNING: [${division.name}] may have a product not selling correctly! Please check!`)
			if (ns.corporation.getCorporation().funds >= ns.corporation.getUpgradeWarehouseCost(division.name, city)) {
				ns.print(`[${division.name}] Upgrading warehouse in ${city} (${ns.nFormat(ns.corporation.getUpgradeWarehouseCost(division.name, city), "$0.00a")})`);
				ns.corporation.upgradeWarehouse(division.name, city);
			}
		}
	}

	// Doubly make sure the user knows this is happening as it shouldn't be!
	if (isWarehouseFull) {
		ns.toast(`WARNING: [${division.name}] may have a product not selling correctly! Please check!`, "warning");
	}

	// Original then did division advertising.... Nah.
}

/**
 * Initializes a division for the first time. 
 * @param {NetScript} ns NetScript reference
 * @param {Division} division Division reference
 * @param {String} productCity Name of the city that will be a main production city.
 */
async function initCities(ns, division, productCity = "Aevum") {

	for (const city of cities) {
		
		// Expand into another city. Costs $5b each ($4b for city, $1b for warehouse)
		if (!division.cities.includes(city)) {
			await waitForFunds(ns, 5e9);	// Don't move forward until you have funds to do so.
			ns.print(`[${division.name}] Expanding ${division.name} to ${city}`);
			ns.corporation.expandCity(division.name, city);
			ns.corporation.purchaseWarehouse(division.name, city);
		}

		// Hire your first 3 employees (comes with the office)
		ns.corporation.hireEmployee(division.name, city);
		ns.corporation.hireEmployee(division.name, city);
		ns.corporation.hireEmployee(division.name, city);

		// Enable smart supply if you have it
		if (ns.corporation.hasUnlockUpgrade("Smart Supply")) {
			ns.corporation.setSmartSupply(division.name, city, true);
		}

		// Expand and Hire Employees (15 total) Do it again for production city (for a total of 30)
		await expandEmployees(ns, division, city, 12);
		if (city == productCity) await expandEmployees(ns, division, city);

		// The rest is unneeded. Old script upgraded the warehouses (why?) and created the first product (not what this function should be for)
	}
}

/**
 * Stops production, lets the warehouses fill up, then sells everything at once. 
 * This bloats your profit/sec and tricks your next investment.
 * @param {NetScript} ns 
 * @param {Division} division 
 * @param {String} productCity 
 */
 async function trickInvest(ns, division, productCity = "Aevum") {
	ns.print("Prepare to trick investors...");

	// stop selling products
	for (var product of division.products) {
		// Modified this to use whatever the old MP was.
		ns.corporation.sellProduct(division.name, productCity, product, "0", ns.corporation.getProduct(division.name, product).sCost, true);
	}

	// put all employees into production to produce as fast as possible 
	for (const city of cities) {
		const employees = ns.corporation.getOffice(division.name, city).employees.length;

		await ns.corporation.setAutoJobAssignment(division.name, city, "Training", 0);
		await ns.corporation.setAutoJobAssignment(division.name, city, "Operations", 0);
		await ns.corporation.setAutoJobAssignment(division.name, city, "Engineer", 0);
		await ns.corporation.setAutoJobAssignment(division.name, city, "Business", 0);
		await ns.corporation.setAutoJobAssignment(division.name, city, "Management", 0);
		await ns.corporation.setAutoJobAssignment(division.name, city, "Research & Development", 0);
		await ns.corporation.setAutoJobAssignment(division.name, city, "Operations", employees);
	}

	ns.print("Wait for warehouses to fill up")
	//ns.print("Warehouse usage: " + refWarehouse.sizeUsed + " of " + refWarehouse.size);

	let allWarehousesFull = false;
	while (!allWarehousesFull) {
		allWarehousesFull = true;
		for (const city of cities) {
			if (ns.corporation.getWarehouse(division.name, city).sizeUsed <= (0.98 * ns.corporation.getWarehouse(division.name, city).size)) {
				allWarehousesFull = false;
				break;
			}
		}
		await ns.sleep(5000);
	}
	ns.print("Warehouses are full, start selling");

	// put all employees into business to sell as much as possible 
	var initialInvestFunds = ns.corporation.getInvestmentOffer().funds;
	ns.print("Initial investment offer: " + ns.nFormat(initialInvestFunds, "$0.00a"));
	for (const city of cities) {
		const employees = ns.corporation.getOffice(division.name, city).employees.length;
		await ns.corporation.setAutoJobAssignment(division.name, city, "Operations", 0);
		await ns.corporation.setAutoJobAssignment(division.name, city, "Business", employees);
	}

	// sell products again
	for (var product of division.products) {
		// Modified this to use whatever the old MP was.
		ns.corporation.sellProduct(division.name, productCity, product, "MAX", ns.corporation.getProduct(division.name, product).sCost, true);
	}

	// wait until the stored products are sold, which should lead to huge investment offers
	// There is a chance that this might not happen! It depends on what your profit/sec is 
	// Typically I only see 2x bonus when doing this manually outside of BN3
	const timeout = 60*1000;
	var curTime = 0;
	while (ns.corporation.getInvestmentOffer().funds < (4 * initialInvestFunds) && curTime < timeout) {
		await ns.sleep(200);
		curTime += 200;
	}

	ns.print(`Investment offer for 10% shares: ${ns.nFormat(ns.corporation.getInvestmentOffer().funds, "$0.00a")}`);
	ns.toast(`Investment offer for 10% shares: ${ns.nFormat(ns.corporation.getInvestmentOffer().funds, "$0.00a")}`);

	// Rest has been take out. This should be done manually.
/*	ns.print("Funds before public: " + ns.nFormat(ns.corporation.getCorporation().funds, "$0.00a"));

	// So problem: You are about to invest in a new industry whose profits will not be all that high.
	// You also are not guaranteed to have an investor at the level you wanted.
	// And now you are reducing your overall corporate profit, slowing down growth, to make player bucks?
	// This is better off done manually by the player when they feel it is a good time to do so!
	// (At least a dividend hasn't been set I guess)
	ns.corporation.goPublic(800e6);

	ns.print("Funds after  public: " + ns.nFormat(ns.corporation.getCorporation().funds, "$0.00a"));

	// set employees back to normal operation
	// 	Updated to use expandEmployees
	for (const city of cities) {
		const employees = ns.corporation.getOffice(division.name, city).employees.length;
		await ns.corporation.setAutoJobAssignment(division.name, city, "Business", 0);
		await expandEmployees(ns, division, city, 0);
	}

	// with gained money, expand to the most profitable division ($400b investment)
	//	Uh, so what if you don't get enough to do this?? (fixing this for now)
	//	Once again this is something better done manually
	if (ns.corporation.getCorporation().funds >= ns.corporation.getExpandIndustryCost("Healthcare")) {
		ns.corporation.expandIndustry("Healthcare", "Healthcare");
		var hcIndex = ns.corporation.getCorporation().divisions.findIndex (x => x.type == "Healthcare");
		if (hcIndex >= 0) await initCities(ns, ns.corporation.getCorporation().divisions[hcIndex]);
	}
*/
}

/**
 * Waits for funds to be available in the corporation.
 * @param {NetScript} ns NetScript reference
 * @param {Number} cost How much we need in corp funds
 */
async function waitForFunds(ns, cost) {
	if ((ns.corporation.getCorporation().funds) < cost)
		ns.print('Not enough money. Waiting for funds to reach: ' + ns.nFormat(ns.getCorporation().funds, "$0.00a") + ' / ' + ns.nFormat(cost, "$0.00a"));

	while ((ns.corporation.getCorporation().funds) < cost)
		await ns.sleep(1000*60);
}

/**
 * Generates a random name from a list below. Purely for show.
 * @param {Array.<String>} usedNames List of names already used
 * @param {String} divisionType Type of product to give name to
 * @returns {String} Random name
 */
 function generateRandomName(usedNames, divisionType = "Tobacco") {
	var name = "";
	var isUnique = false;

	while (!isUnique) {
		if (divisionType == "Tobacco") 
			name = toteNames[Math.floor(Math.random() * toteNames.length)] + " Totes";
		else
			name += healthNames[Math.floor(Math.random() * healthNames.length)];
			
		if (Math.random()*10 < 3)
			name += " " + nameModifiers[Math.floor(Math.random() * nameModifiers.length)];

		isUnique = !usedNames.includes(name);
	}

	return name;
}

/**
 * Modifies an exponential, maintaining a value between 1e0 and 
 * @param {Number} multiplier 
 * @param {Number} power 
 * @param {Number} multiplierMod 
 * @returns {Number, Number} multi, pow
 */
 function modExponential (multiplier, power, multiplierMod) {
	multiplier += multiplierMod;

	if (multiplier < 10 && power > 0) {
		multiplier = 99;
		power--;
	} else if (multiplier > 99) {
		power++;
		multiplier = 10;
	} else if (multiplier > 0 && multiplier < 10 && power == 1) {
		power=0;
	} else if (multiplier <= 0) {
		multiplier = 1;
	}

	return {
		multi: multiplier,
		pow: power
	};
}

const cities = ["Sector-12", "Aevum", "Volhaven", "Chongqing", "New Tokyo", "Ishima"];

const upgradeList = [
	// lower priority value -> upgrade faster
	{ prio: 1, max: 40, name: "Wilson Analytics" },
	{ prio: 1, max: 20, name: "FocusWires" },
	{ prio: 1, max: 20, name: "Neural Accelerators" },
	{ prio: 1, max: 20, name: "Speech Processor Implants" },
	{ prio: 1, max: 20, name: "Nuoptimal Nootropic Injector Implants" },
	{ prio: 4, max: 20, name: "Project Insight", },
	{ prio: 4, max: 20, name: "DreamSense" },
	{ prio: 8, max: 20, name: "ABC SalesBots" },
	{ prio: 8, max: 20, name: "Smart Factories" },
	{ prio: 8, max: 20, name: "Smart Storage" },
];

const researchList = [
	// lower priority value -> upgrade faster
	{ prio: 3, name: "uPgrade: Capacity.I" },
	{ prio: 4, name: "uPgrade: Capacity.II" },
	{ prio: 5, name: "Drones - Assembly" },
	{ prio: 10, name: "Overclock" },
	{ prio: 10, name: "uPgrade: Fulcrum" },
	{ prio: 10, name: "Self-Correcting Assemblers" },
	{ prio: 10, name: "Drones - Transport" },
	{ prio: 10, name: "CPH4 Injections" },
	{ prio: 21, name: "Drones" },
	{ prio: 26, name: "Automatic Drug Administration" },
];

// Literally candy names lol
const toteNames = [
	"Cherry",
	"Banana",
	"Blue Raspberry",
	"Butterscotch",
	"Caramel",
	"Cinnamon",
	"Coconut",
	"Coffee",
	"Cotton Candy",
	"Fruit Punch",
	"Ginger",
	"Grape",
	"Green Apple",
	"Lemon",
	"Licorice",
	"Lime",
	"Marshmallow",
	"Orange",
	"Peach",
	"Peanut Butter",
	"Peppermint",
	"Pineapple",
	"Rootbeer",
	"Spearmint",
	"Strawberry",
	"Vanilla",
	"Watermelon",
	"Chocolate",
	"Cool Mint",
	"Hot Mint",
	"Pepper",
	"Ghost Reaper"
];

// Cyberpunk 2077 brands (plus whatever I can remember from other sources)
const healthNames = [
	"Get Em Ups",
	"Brawndo",
	"2nd Amendment",
	"Bliss",
	"Buck-A-Slice",
	"Macroware",
	"Chrome Cross",
	"Spunky Monkey",
	"Braindance",
	"CrystalDome",
	"CyberLimbs"
];

const nameModifiers = [
	"v0",
	"v1",
	"v2",
	"v3",
	"TURBO",
	"ORIGINAL"
];