/** Script to run your corporation for you.
 * 		Originally By: Kamukrass
 * 		GitHub: https://github.com/kamukrass/Bitburner
 * 
 * 		RECOMMENDED THAT YOU START A BUSINESS IN SOMETHING SIMPLE LIKE AGRICULTURE FIRST!
 * 
 * 		Required:
 * 			- 1TB RAM
 * 			- $150b (personal)
 * 			- Office API ($50b funds)
 * 			- Warehouse API ($20b funds)
 * 
 * 		None of this is recommended using yet!
 * 
 * 	Will be using (this guide)[https://docs.google.com/document/d/15hN60PmzmpXpT_JC8z_BU47gaZftAx4zaOnWAOqwoMw/edit?usp=sharing]
 * 		Please follow the first section before even starting this script.
 */

/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog("ALL");

	// Originally tried to create a corp if you don't have. BAD IDEA.
	if (!ns.getPlayer().hasCorporation) {
		ns.print("ERROR: Create a corporation first! You also need enough funds for Office and Warehouse APIs! Come back when you have some funds too!");
		return;
	}

	var corp = ns.corporation.getCorporation();
	var tobaccoIndex = corp.divisions.findIndex(x => x.type == "Tobacco");
	
	// initial Company setup - VERY BAD DO NOT USE
	if (tobaccoIndex == -1) {
		ns.corporation.expandIndustry("Tobacco", "Tobacco");

		corp = ns.corporation.getCorporation();
		tobaccoIndex = corp.divisions.findIndex(x => x.type == "Tobacco");

		// This buys corp upgrades without care of your budget!
		await initialCorpUpgrade(ns);

		// Expands and sets up first set of employees. Again, doesn't care about budget.
		await initCities(ns, corp.divisions[tobaccoIndex]);
	}

	while (true) {
		corp = ns.corporation.getCorporation();

		// The main loop for managing your corporation
		for (const division of corp.divisions.reverse()) {
			// Upgrade warehouses AND handles AdvertInc. (WHY)
			upgradeWarehouses(ns, division);

			// Upgrade corporation
			upgradeCorp(ns);
			
			// Hire employees (but only for Sector-12)
			await hireEmployees(ns, division);

			// Not all divisions can make products or make use of research!!
			if (dvision.makeProduct) { 
				// Make a product.
				newProduct(ns, division);

				// Do research.
				doResearch(ns, division);
			}
		}

		// If we only have a Tobacco division we trick investors to make a Healthcare division??
		// This will hit when we have 3 or more products???? (WHAT ABOUT MY MONEY??)
		// This will also never hit if you already did an investment.
		if (corp.divisions.length < 2 && corp.numShares == corp.totalShares 
				&& corp.divisions[tobaccoIndex].products.length > 2) {
			await trickInvest(ns, corp.divisions[tobaccoIndex]);
		}

		// Wait 5 sec
		await ns.sleep(5000);
	}
}

async function hireEmployees(ns, division, productCity = "Sector-12") {
	var employees = ns.corporation.getOffice(division.name, productCity).employees.length;
	
	// While we have enough money to pay for employees across all cities (+3) 
	// 	Uh what if you don't? And what if you only partially hire employees?!
	//	Also this will keep hiring employees until you no longer have enough funds to do so!
	while (ns.corporation.getCorporation().funds > (cities.length * ns.corporation.getOfficeSizeUpgradeCost(division.name, productCity, 3))) {
		
		// upgrade all cities + 3 employees if sufficient funds
		ns.print(division.name + " Upgrade office size");
		for (const city of cities) {
			ns.corporation.upgradeOfficeSize(division.name, city, 3);
			for (var i = 0; i < 3; i++) {
				await ns.corporation.hireEmployee(division.name, city);
			}
		}
	}

	// If you do not have employees up to your new cap, hire them!
	if (ns.corporation.getOffice(division.name, productCity).employees.length > employees) {
		
		// set jobs after hiring people just in case we hire lots of people at once and setting jobs is slow
		for (const city of cities) {
			employees = ns.corporation.getOffice(division.name, city).employees.length;
			if (ns.corporation.hasResearched(division.name, "Market-TA.II")) {
				// THE REST BELOW IS HOT GARBAGE
				// 	Training is not needed unless you want to reallocate them after a while
				// 	Also what is with the math? Not necessary, especially at lower employee numbers!
				// 		An aside: This will only run when Market-TA.II is done (140k research). So by then sure?

				// TODO: Simplify here. ProductCity config can always be used
				if (city == productCity) {
					await ns.corporation.setAutoJobAssignment(division.name, city, "Operations", Math.ceil(employees / 5));
					await ns.corporation.setAutoJobAssignment(division.name, city, "Engineer", Math.ceil(employees / 5));
					await ns.corporation.setAutoJobAssignment(division.name, city, "Business", Math.ceil(employees / 5));
					await ns.corporation.setAutoJobAssignment(division.name, city, "Management", Math.ceil(employees / 10));
					var remainingEmployees = employees - (3 * Math.ceil(employees / 5) + Math.ceil(employees / 10));
					await ns.corporation.setAutoJobAssignment(division.name, city, "Training", Math.ceil(remainingEmployees));
				}
				else {
					await ns.corporation.setAutoJobAssignment(division.name, city, "Operations", Math.floor(employees / 10));
					await ns.corporation.setAutoJobAssignment(division.name, city, "Engineer", 1);
					await ns.corporation.setAutoJobAssignment(division.name, city, "Business", Math.floor(employees / 5));
					await ns.corporation.setAutoJobAssignment(division.name, city, "Management", Math.ceil(employees / 100));
					await ns.corporation.setAutoJobAssignment(division.name, city, "Research & Development", Math.ceil(employees / 2));
					var remainingEmployees = employees - (Math.floor(employees / 5) + Math.floor(employees / 10) + 1 + Math.ceil(employees / 100) + Math.ceil(employees / 2));
					await ns.corporation.setAutoJobAssignment(division.name, city, "Training", Math.floor(remainingEmployees));
				}
			}

			// HUH? WHERE IS R&D?!? Market-TA.II should not be the designator for this.
			else {
				if (city == productCity) {
					await ns.corporation.setAutoJobAssignment(division.name, city, "Operations", Math.floor((employees - 2) / 2));
					await ns.corporation.setAutoJobAssignment(division.name, city, "Engineer", Math.ceil((employees - 2) / 2));
					await ns.corporation.setAutoJobAssignment(division.name, city, "Management", 2);
				}
				else {
					await ns.corporation.setAutoJobAssignment(division.name, city, "Operations", 1);
					await ns.corporation.setAutoJobAssignment(division.name, city, "Engineer", 1);
					await ns.corporation.setAutoJobAssignment(division.name, city, "Research & Development", (employees - 2));
				}
			}
		}
	}
}

function upgradeWarehouses(ns, division) {
	// check if warehouses are near max capacity and upgrade if needed
	for (const city of cities) {
		var cityWarehouse = ns.corporation.getWarehouse(division.name, city);
		if (cityWarehouse.sizeUsed > 0.9 * cityWarehouse.size) {
			if (ns.corporation.getCorporation().funds > ns.corporation.getUpgradeWarehouseCost(division.name, city)) {
				ns.print(division.name + " Upgrade warehouse in " + city);
				ns.corporation.upgradeWarehouse(division.name, city);
			}
		}
	}

	// Upgrade AdVert.Inc after a certain amount of Wilson Analytics upgrades are available
	//		TERRIBLE IDEA. This SHOULD NOT BE HERE.
	if (ns.corporation.getUpgradeLevel("Wilson Analytics") > 20) {
		if (ns.corporation.getCorporation().funds > (4 * ns.corporation.getHireAdVertCost(division.name))) {
			ns.print(division.name + " Hire AdVert");
			ns.corporation.hireAdVert(division.name);
		}
	}
}

function upgradeCorp(ns) {
	for (const upgrade of upgradeList) {
		// purchase upgrades based on available funds and priority; see upgradeList
		//		Priority * Cost. Actually not a bad method (same as path algos)
		//		HOWEVER, it will ALWAYS upgrade the first upgrade in that list. So... Why bother??
		if (ns.corporation.getCorporation().funds > (upgrade.prio * ns.corporation.getUpgradeLevelCost(upgrade.name))) {
			// those two upgrades ony make sense later once we can afford a bunch of them and already have some base marketing from DreamSense
			//		So you skip Wilson.... and never use it! GJ. (Nowhere in this code does it specifically upgrade this)
			if ((upgrade.name != "ABC SalesBots" && upgrade.name != "Wilson Analytics") || (ns.corporation.getUpgradeLevel("DreamSense") > 20)) {
				ns.print("Upgrade " + upgrade.name + " to " + (ns.corporation.getUpgradeLevel(upgrade.name) + 1));
				ns.corporation.levelUpgrade(upgrade.name);
			}
		}
	}

	// Only get shady accounting or Government Partnership if you have 2x the funds
	if (!ns.corporation.hasUnlockUpgrade("Shady Accounting") && ns.corporation.getUnlockUpgradeCost("Shady Accounting") * 2 < ns.corporation.getCorporation().funds) {
		ns.print("Unlock Shady Accounting")
		ns.corporation.unlockUpgrade("Shady Accounting");
	} else if (!ns.corporation.hasUnlockUpgrade("Government Partnership") && ns.corporation.getUnlockUpgradeCost("Government Partnership") * 2 < ns.corporation.getCorporation().funds) {
		ns.print("Unlock Government Partnership")
		ns.corporation.unlockUpgrade("Government Partnership");
	}
}

/**
 * Stops production, lets the warehouses fill up, then sells everything at once. 
 * This bloats your profit per sec and tricks your next investment.
 * @param {*} ns 
 * @param {*} division 
 * @param {*} productCity 
 */
async function trickInvest(ns, division, productCity = "Sector-12") {
	ns.print("Prepare to trick investors")

	// stop selling products
	for (var product of division.products) {
		ns.corporation.sellProduct(division.name, productCity, product, "0", "MP", true);
	}

	// put all employees into production to produce as fast as possible 
	for (const city of cities) {
		const employees = ns.corporation.getOffice(division.name, city).employees.length;

		await ns.corporation.setAutoJobAssignment(division.name, city, "Engineer", 0);
		await ns.corporation.setAutoJobAssignment(division.name, city, "Management", 0);
		await ns.corporation.setAutoJobAssignment(division.name, city, "Research & Development", 0);
		await ns.corporation.setAutoJobAssignment(division.name, city, "Operations", employees - 2); // workaround for bug
		await ns.corporation.setAutoJobAssignment(division.name, city, "Operations", employees - 1); // workaround for bug
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
	ns.print("Initial investment offer: " + ns.nFormat(initialInvestFunds, "0.0a"));
	for (const city of cities) {
		const employees = ns.corporation.getOffice(division.name, city).employees.length;
		await ns.corporation.setAutoJobAssignment(division.name, city, "Operations", 0);
		await ns.corporation.setAutoJobAssignment(division.name, city, "Business", employees - 2); // workaround for bug
		await ns.corporation.setAutoJobAssignment(division.name, city, "Business", employees - 1); // workaround for bug
		await ns.corporation.setAutoJobAssignment(division.name, city, "Business", employees);
	}

	// sell products again
	for (var product of division.products) {
		ns.corporation.sellProduct(division.name, productCity, product, "MAX", "MP", true);
	}

	// wait until the stored products are sold, which should lead to huge investment offers
	while (ns.corporation.getInvestmentOffer().funds < (4 * initialInvestFunds)) {
		await ns.sleep(200);
	}

	ns.print("Investment offer for 10% shares: " + ns.nFormat(ns.corporation.getInvestmentOffer().funds, "$0.00a"));
	ns.print("Funds before public: " + ns.nFormat(ns.corporation.getCorporation().funds, "$0.00a"));

	ns.corporation.goPublic(800e6);

	ns.print("Funds after  public: " + ns.nFormat(ns.corporation.getCorporation().funds, "$0.00a"));

	// set employees back to normal operation -- Uh, but you have an employee function for this?
	for (const city of cities) {
		const employees = ns.corporation.getOffice(division.name, city).employees.length;
		await ns.corporation.setAutoJobAssignment(division.name, city, "Business", 0);
		if (city == productCity) {
			await ns.corporation.setAutoJobAssignment(division.name, city, "Operations", 1);
			await ns.corporation.setAutoJobAssignment(division.name, city, "Engineer", (employees - 2));
			await ns.corporation.setAutoJobAssignment(division.name, city, "Management", 1);
		}
		else {
			await ns.corporation.setAutoJobAssignment(division.name, city, "Operations", 1);
			await ns.corporation.setAutoJobAssignment(division.name, city, "Research & Development", (employees - 1));
		}
	}

	// with gained money, expand to the most profitable division ($400b investment)
	//		Uh, so what if you don't get enough to do this?? (fixing this for now)
	ns.corporation.expandIndustry("Healthcare", "Healthcare");
	var hcIndex = ns.corporation.getCorporation().divisions.findIndex (x => x.type == "Healthcare");
	if (hcIndex >= 0) await initCities(ns, ns.corporation.getCorporation().divisions[hcIndex]);
}

function doResearch(ns, division) {
	const laboratory = "Hi-Tech R&D Laboratory"
	const marketTAI = "Market-TA.I";
	const marketTAII = "Market-TA.II";

	if (!ns.corporation.hasResearched(division.name, laboratory)) {
		// always research Laboratory first
		if (division.research > ns.corporation.getResearchCost(division.name, laboratory)) {
			ns.print(division.name + " Research " + laboratory);
			ns.corporation.research(division.name, laboratory);
		}
	}
	else if (!ns.corporation.hasResearched(division.name, marketTAII)) {
		// always research Market-TA.I plus .II first and in one step
		var researchCost = ns.corporation.getResearchCost(division.name, marketTAI)
			+ ns.corporation.getResearchCost(division.name, marketTAII);

		if (division.research >= researchCost * 1.1) {
			ns.print(division.name + " Research " + marketTAI);
			ns.corporation.research(division.name, marketTAI);
			ns.print(division.name + " Research " + marketTAII);
			ns.corporation.research(division.name, marketTAII);
			for (var product of division.products) {
				ns.corporation.setProductMarketTA1(division.name, product, true);
				ns.corporation.setProductMarketTA2(division.name, product, true);
			}
		}
		return;
	}
	else {
		// This is not needed at all. You are wasting product research effectiveness for this!
		for (const researchObject of researchList) {
			// research other upgrades based on available funds and priority; see researchList
			if (!ns.corporation.hasResearched(division.name, researchObject.name)) {
				if (division.research > (researchObject.prio * ns.corporation.getResearchCost(division.name, researchObject.name))) {
					ns.print(division.name + " Research " + researchObject.name);
					ns.corporation.research(division.name, researchObject.name);
				}
			}
		}
	}
}

function newProduct(ns, division) {
	//ns.print("Products: " + division.products);
	// Initially check if any product is currently being developed. Return false if we are.
	var productNumbers = [];
	for (var product of division.products) {
		if (ns.corporation.getProduct(division.name, product).developmentProgress < 100) {
			ns.print(division.name + " Product development progress: " + ns.corporation.getProduct(division.name, product).developmentProgress.toFixed(1) + "%");
			return false;
		} else {
			// This is unnecessary. Just use their names!
			productNumbers.push(product.charAt(product.length - 1));

			// initial sell value if nothing is defined yet is 0
			// ... AND THATS IT. We do not try to figure out whether it sells at a better price or anything! WHY
			if (ns.corporation.getProduct(division.name, product).sCost == 0) {
				ns.print(division.name + " Start selling product " + product);
				ns.corporation.sellProduct(division.name, "Sector-12", product, "MAX", "MP", true);

				// This is inexcusable. If you do not have this, the above will not generate you any revenue.
				if (ns.corporation.hasResearched(division.name, "Market-TA.II")) {
					ns.corporation.setProductMarketTA1(division.name, product, true);
					ns.corporation.setProductMarketTA2(division.name, product, true);
				}
			}
		}
	}

	// BUT WHY THO?! division.products! That's a LIST!
	var numProducts = 3;
	// amount of products which can be sold in parallel is 3; can be upgraded
	if (ns.corporation.hasResearched(division.name, "uPgrade: Capacity.I")) {
		numProducts++;
		if (ns.corporation.hasResearched(division.name, "uPgrade: Capacity.II")) {
			numProducts++;
		}
	}

	// discontinue the oldest product if over max amount of products
	// 	Problem: There are times when even the oldest product can and will do better than the newest! (Especially after researching)
	// 	Solution: Sort by product sell amount THEN discontinue the one at the end.
	if (productNumbers.length >= numProducts) {
		ns.print(division.name + " Discontinue product " + division.products[0]);
		ns.corporation.discontinueProduct(division.name, division.products[0]);
	}

	// get the product number of the latest product and increase it by 1 for the next product. Product names must be unique. 
	//	Again, this is unnecessary. Each product is unique already! Use ns.corporation.getProduct()
	//		See: https://github.com/danielyxie/bitburner/blob/dev/markdown/bitburner.product.md
	var newProductNumber = 0;
	if (productNumbers.length > 0) {
		newProductNumber = parseInt(productNumbers[productNumbers.length - 1]) + 1;
		// cap product numbers to one digit and restart at 0 if > 9.
		if (newProductNumber > 9) {
			newProductNumber = 0;
		}
	}

	// Invest a $1b on a new product. For once it will say you do not have funds (lol).
	//	Ugh. But you still use $500m if you do not have 2x the amount needed. WHY?!
	const newProductName = "Product-" + newProductNumber;
	var productInvest = 1e9;
	if (ns.corporation.getCorporation().funds < (2 * productInvest)) {
		if (ns.corporation.getCorporation().funds <= 0) {
			ns.print("WARNING: Negative funds, cannot start new product development " + ns.nFormat(ns.corporation.getCorporation().funds, "$0.00a"));
			return;
			// productInvest = 0; // product development with 0 funds not possible if corp has negative funds
		}
		else {
			productInvest = Math.floor(ns.corporation.getCorporation().funds / 2);
		}
	}

	// Make the product
	ns.print("Start new product development " + newProductName);
	ns.corporation.makeProduct(division.name, "Sector-12", newProductName, productInvest, productInvest);
}

async function initCities(ns, division, productCity = "Sector-12") {
	for (const city of cities) {

		// Expand into another city. Doesn't cost anything to do this.
		ns.print("Expand " + division.name + " to City " + city);
		if (!division.cities.includes(city)) {
			ns.corporation.expandCity(division.name, city);
			ns.corporation.purchaseWarehouse(division.name, city);
		}

		// Enable smart supply (even if it doesn't work as long as it doesn't breaks script keep)
		ns.corporation.setSmartSupply(division.name, city, true);

		if (city != productCity) {
			// setup employees -- WHY!? You have function for this!
			for (let i = 0; i < 3; i++) {
				await ns.corporation.hireEmployee(division.name, city);
			}
			await ns.corporation.setAutoJobAssignment(division.name, city, "Research & Development", 3);
		}
		else {
			const warehouseUpgrades = 3;
			
			// get a bigger warehouse in the product city. we can produce and sell more here
			// 	Terrible logic. Every place will produce and sell at the same rate.
			for (let i = 0; i < warehouseUpgrades; i++) {
				ns.corporation.upgradeWarehouse(division.name, city);
			}
			
			// get more employees in the main product development city
			//	Again, there is a function for this! Also, do by 15!
			const newEmployees = 9;
			ns.corporation.upgradeOfficeSize(division.name, productCity, newEmployees);
			
			for (let i = 0; i < newEmployees + 3; i++) {
				await ns.corporation.hireEmployee(division.name, productCity);
			}

			await ns.corporation.setAutoJobAssignment(division.name, productCity, "Operations", 4);
			await ns.corporation.setAutoJobAssignment(division.name, productCity, "Engineer", 6);
			await ns.corporation.setAutoJobAssignment(division.name, productCity, "Management", 2);
		}

		// lol so we just upgrade the warehouse again cause why the fuck not.
		const warehouseUpgrades = 3;

		for (let i = 0; i < warehouseUpgrades; i++) {
			ns.corporation.upgradeWarehouse(division.name, city);
		}
	}

	// Starts making your first product.... If it can? (technically this function is only used by Tobacco and Healthcare)
	ns.corporation.makeProduct(division.name, productCity, "Product-0", "1e9", "1e9");
}

async function initialCorpUpgrade(ns) {
	ns.print("unlock upgrades");

	// LOL. Do you have money?? Well now you don't! Have fun!

	ns.corporation.unlockUpgrade("Smart Supply");
	ns.corporation.levelUpgrade("Smart Storage");
	ns.corporation.levelUpgrade("Smart Storage");
	ns.corporation.levelUpgrade("Smart Storage");
	ns.corporation.levelUpgrade("Smart Storage");
	ns.corporation.levelUpgrade("DreamSense");

	// upgrade employee stats
	ns.corporation.levelUpgrade("Nuoptimal Nootropic Injector Implants");
	ns.corporation.levelUpgrade("Speech Processor Implants");
	ns.corporation.levelUpgrade("Neural Accelerators");
	ns.corporation.levelUpgrade("FocusWires");
}

const cities = ["Sector-12", "Aevum", "Volhaven", "Chongqing", "New Tokyo", "Ishima"];

const upgradeList = [
	// lower priority value -> upgrade faster
	{ prio: 2, name: "Project Insight", },
	{ prio: 2, name: "DreamSense" },
	{ prio: 4, name: "ABC SalesBots" },
	{ prio: 4, name: "Smart Factories" },
	{ prio: 4, name: "Smart Storage" },
	{ prio: 8, name: "Neural Accelerators" },
	{ prio: 8, name: "Nuoptimal Nootropic Injector Implants" },
	{ prio: 8, name: "FocusWires" },
	{ prio: 8, name: "Speech Processor Implants" },
	{ prio: 8, name: "Wilson Analytics" },
];

const researchList = [
	// lower priority value -> upgrade faster
	{ prio: 10, name: "Overclock" },
	{ prio: 10, name: "uPgrade: Fulcrum" },
	{ prio: 3, name: "uPgrade: Capacity.I" },
	{ prio: 4, name: "uPgrade: Capacity.II" },
	{ prio: 10, name: "Self-Correcting Assemblers" },
	{ prio: 21, name: "Drones" },
	{ prio: 4, name: "Drones - Assembly" },
	{ prio: 10, name: "Drones - Transport" },
	{ prio: 26, name: "Automatic Drug Administration" },
	{ prio: 10, name: "CPH4 Injections" },
];