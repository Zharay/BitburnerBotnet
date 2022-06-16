/** stock-bot is an OG stock market script that has been expanded from it's original
 * It uses forecasts, profit potential and potential change math to figure out 
 * whether to sell stocks. It buys when stocks have a good forecast. And finally, it is 
 * short capable for those on BN.8 and have it unlocked.
 * 
 * 	Heavily modified by: Zharay
 * 	Originally written by: u/havoc_mayhem
 * 	Original URL: https://www.reddit.com/r/Bitburner/comments/9o1xle/stock_market_script/
 * 	Mod URL: https://github.com/Zharay/BitburnerBotnet
 * 
 * 	REQUIRES:
 * 		- WSE Account
 * 		- TIX API Access ($1b)
 * 		- 4S Market Data API ($5b)
 * 		- Market Data TIX API ($25b)
 * 		- (Optional) For shorts: Be on BitNode 8.1 or unlock after BitNode 8.2
**/

const shortAvailable = true;		// Requires you to be on BN 8.1 or have beaten 8.2
const fracL = 0.025;				// Fraction of market wealth to keep as cash on player
const fracH = 0.05;					// Fraction of market wealth to spend on stocks
const commission = 100000; 			// Buy or sell commission [DO NOT CHANGE]
const numCycles = 1; 				// Number of cycles to wait before checking market. Each cycle is 4 seconds.
const longForecastBuy = 0.55;		// LONG: Projected forecast value at which to buy
const longForecastSell = 0.5;		// LONG: Projected forecast value at which to sell
const expProfitLossLong = -0.25; 	// LONG: The percentage difference of profits now compared to when purchased (ie. -25% forecasted profit)
const shortForecastBuy = 0.45;		// SHORT: Projected forecast value at which to buy
const shortForecastSell = 0.5;		// SHORT: Projected forecast value at which to sell
const expProfitGainShort = 0.25;	// SHORT: The percentage difference of profits now compared to when purchased (ie. -200% forecasted profit)
const transactionLength = 50;		// Will limit the log print specified amount

/** @param {NS} ns */
export async function main(ns) {
	ns.disableLog("ALL");

	// fill stocks with a JSON filled only with symbols (for now)
	let stocks = [...ns.stock.getSymbols().map(_sym => {return {sym: _sym}})];
	let corpus = 0;
	let prevTrans = [];

	var fSell = ns.getPortHandle(19);

	while (fSell.peek() == "NULL PORT DATA") {
		corpus = refreshStocks(ns, stocks);
		
		//Sell under performing shares
		for (const stock of stocks) {
			// Handle Longs
			if (stock.longShares > 0 
				&& (percentageChange(stock.initProfitPotential, stock.profitPotential) <= expProfitLossLong 
					|| stock.profitPotential <= 0 || stock.forecast < longForecastSell)) {	
				let gained = ns.stock.sell(stock.sym, stock.longShares) * stock.longShares;
				prevTrans.push(copyStock(stock, "sale", true, stock.longShares, percentageChange(stock.initProfitPotential, stock.profitPotential), gained));
				stock.longShares = 0;
				corpus -= commission;
			}

			// Handle Shorts
			if (stock.shortShares > 0 && shortAvailable
				&& (percentageChange(stock.initProfitPotential, stock.profitPotential) > expProfitGainShort 
					|| stock.profitPotential > 0 || stock.forecast > shortForecastSell)) {
				let gained = ns.stock.sellShort(stock.sym, stock.shortShares) * stock.shortShares;
				prevTrans.push(copyStock(stock, "sale", false, stock.shortShares, percentageChange(stock.initProfitPotential, stock.profitPotential), gained));
				stock.shortShares = 0;
				corpus -= commission;
			}
		}
		
		//Sell shares (long) if not enough cash in hand
		if (ns.getServerMoneyAvailable("home") < (fracL * corpus)) {
			for (const stock of stocks) {
				if (ns.getServerMoneyAvailable("home") < (fracL * corpus) && stock.longShares > 0 ) {
					let cashNeeded = (corpus * fracH) - ns.getServerMoneyAvailable("home") + commission;
					let numShares = Math.floor(cashNeeded / stock.price);
					let gained = ns.stock.sell(stock.sym, numShares) * numShares;
					prevTrans.push(copyStock(stock, "cash", true, stock.longShares, percentageChange(stock.initProfitPotential, stock.profitPotential), gained));
					stock.longShares -= numShares;
					corpus -= commission;
				}
			}
		}

		//Buy shares with cash remaining in hand
        for (let i = 0; i < stocks.length; i++) {
			let stock = stocks[i];
            let cashToSpend = ns.getServerMoneyAvailable("home") - (fracH * corpus);
			if (stock.forecast > longForecastBuy) {
				// Attempt to buy a long. Only do so if it's not at a loss (due to commission)
            	if (stock.longShares > 0) continue;
				let numShares = Math.min(stock.maxShares, Math.floor((cashToSpend - commission) / stock.askPrice));
				let condition =  numShares * stock.profitPotential * stock.price * numCycles;
				if (condition > commission) {
					let price = ns.stock.buy(stock.sym, numShares) * numShares;
					if (price > 0) prevTrans.push(copyStock(stock, "", true, numShares, condition, price));
				}
			}

			// Grab the stock from back to front - Shorts need least profit potential
			stock = stocks[stocks.length - 1 - i];
			cashToSpend = ns.getServerMoneyAvailable("home") - (fracH * corpus);
			if (stock.forecast < shortForecastBuy && shortAvailable) {
				// Attempt to buy a short. We don't care if it's at a loss (that's the point?)
				if (stock.shortShares > 0) continue;
				let numShares = Math.min(stock.maxShares, Math.floor((cashToSpend - commission) / stock.bidPrice));
				let condition =  numShares * stock.profitPotential * stock.bidPrice * numCycles;
				let price = ns.stock.short(stock.sym, numShares) * numShares;
				if (price > 0) prevTrans.push(copyStock(stock, "", false, numShares, condition, price));
			}
        }

		refreshStocks(ns, stocks);
		displayLog(ns, stocks, prevTrans);
		reportStocks(ns, stocks);

		await ns.sleep(4 * 1000 * numCycles);
	}

	if (fSell.peek() == "sell") {
		var finalSold = 0;
		ns.print("Liquidating all assets...");
		
		for (const stock of stocks){
			if (stock.longShares > 0)
				finalSold += ns.stock.sell(stock.sym, stock.longShares) * stock.longShares;
			else if (stock.shortShares > 0)
				finalSold += ns.stock.sellShort(stock.sym, stock.shortShares) * stock.shortShares;
		}
		
		ns.print(`Final Total: ${ns.nFormat(finalSold, "$0.000a")}`);
	}
}
/**
 * Calculates the percentage difference between an old number versus a new one.
 * @param {Number} oldNum 
 * @param {Number} newNum 
 * @returns {Number}
 */
function percentageChange(oldNum, newNum) {
	return (newNum - oldNum) / Math.abs(oldNum);
}

/**
 * Refreshes all stocks passed in by reference.
 * @param {NS} ns 
 * @param {Object} stocks Passed by reference!
 * @returns {Number} Corpus of all stocks 
 */
function refreshStocks(ns, stocks) {
	let corpus = ns.getServerMoneyAvailable("home");

	for (let i = 0; i < stocks.length; i++) {
		let sym = stocks[i].sym;

		// Basic Info
		stocks[i].price = ns.stock.getPrice(sym);
		stocks[i].longShares = ns.stock.getPosition(sym)[0];	// Number of longs we own
		stocks[i].longPrice = ns.stock.getPosition(sym)[1];		// Price we bought longs at
		stocks[i].shortShares = ns.stock.getPosition(sym)[2];	// Number of shorts we own
		stocks[i].shortPrice = ns.stock.getPosition(sym)[3];	// Price we bought shorts at
		stocks[i].maxShares = ns.stock.getMaxShares(sym);		// Shares available
		stocks[i].volatility = ns.stock.getVolatility(sym);
		stocks[i].forecast = ns.stock.getForecast(sym);
		stocks[i].askPrice = ns.stock.getAskPrice(sym);		// Lowest asking price for a stock
		stocks[i].bidPrice = ns.stock.getBidPrice(sym);		// Highest asking price for a stock

		// Calculated Info
		stocks[i].profitChance = 2 * (ns.stock.getForecast(sym) - 0.5);
		stocks[i].profitPotential = stocks[i].volatility * stocks[i].profitChance / 2;
		stocks[i].profit = (stocks[i].longShares * (stocks[i].bidPrice - stocks[i].longPrice) - (2 * commission)) 
							+ (stocks[i].shortShares * (stocks[i].shortPrice - stocks[i].askPrice));
		stocks[i].cost = (stocks[i].longShares * stocks[i].longPrice) + (stocks[i].shortShares * stocks[i].shortPrice);

		// Set our initial profit potential (only if it is not set or ||=)
        if (stocks[i].longShares > 0 || stocks[i].shortShares > 0) {
            stocks[i].initProfitPotential ||= stocks[i].profitPotential;
			stocks[i].ProfitPotentialDiff = percentageChange(stocks[i].initProfitPotential, stocks[i].profitPotential);
        } else {
            stocks[i].initProfitPotential = null;
			stocks[i].ProfitPotentialDiff = 0;
        }

		// Calculate corpus of all stocks.
		corpus += (stocks[i].longPrice * stocks[i].longShares) + (stocks[i].longPrice * stocks[i].longShares);
	}
	
	stocks.sort((a, b) => b.profitPotential - a.profitPotential);

	return corpus;
}

/**
 * Copies a stock object into a new object
 * @param {Object} stock 
 * @param {String} saleType 
 * @param {Boolean} isLong 
 * @param {Number} transAmount 
 * @param {Number} condition 
 * @param {Number} transSum 
 * @returns {Object}
 */
function copyStock(stock, saleType, isLong, transAmount, condition, transSum) {
	let newStock = {};
	newStock.sym = stock.sym;
	newStock.price = stock.price;
	newStock.longShares = stock.longShares;
	newStock.longPrice = stock.longPrice;
	newStock.shortShares = stock.shortShares;
	newStock.shortPrice = stock.shortPrice;
	newStock.maxShares = stock.maxShares;
	newStock.volatility = stock.volatility;
	newStock.forecast = stock.forecast;
	newStock.askPrice = stock.askPrice;
	newStock.bidPrice = stock.bidPrice;
	newStock.profitChance = stock.profitChance;
	newStock.profitPotential = stock.profitPotential;
	newStock.cost = stock.cost;
	newStock.initProfitPotential = stock.initProfitPotential;
	newStock.ProfitPotentialDiff = stock.ProfitPotentialDiff;

	newStock.saleType = saleType;
	newStock.transLong = isLong;
	newStock.transAmount = transAmount;
	newStock.transSum = transSum;	
	newStock.condition = condition;
	newStock.transTime = 0;

	if(isLong && saleType != "") 
		newStock.isFlip = stock.forecast < longForecastSell;
	else
		newStock.isFlip = stock.forecast > shortForecastSell;

	if (saleType != "")
		newStock.profit = transSum - (transAmount * isLong ? stock.longPrice : stock.shortPrice) - (2 * commission);
	else
		newStock.profit = 0;

	return newStock
}

/**
 * Simply displays information of our stocks into the log.
 * @param {NS} ns 
 * @param {Array} stocks 
 * @param {Array} prevTransactions
 */
function displayLog(ns, stocks, prevTransactions) {
	ns.clearLog();

	// Start by printing out our previous sales
	var recouped = 0;
	var spent = 0;
	
	prevTransactions.sort((a, b) => b.transTime - a.transTime);

	for (let i = Math.max(prevTransactions.length - transactionLength, 0); i < prevTransactions.length; i++) {
		let trans = prevTransactions[i];
		let time = ns.tFormat(trans.transTime).replace(" hours", "h").replace(" minutes", "m").replace(" seconds", "s");
		// WARN | Sold [SYM] TYPE for {profit} ({time}) [{pChage} | {ProfitPot} | {Forecast}]
		// INFO | Bought [SYM] TYPE for {amount} ({time}) [{forecast} | {Condition$}]
		if (trans.saleType != "") {
			ns.print(`${trans.saleType == "cash"  ? "ERROR | Shedded" : "WARN | Sold"} ${ns.nFormat(trans.transAmount,"0a")} [${trans.sym}] ${trans.transLong ? "LONG" : "SHORT"} for ${ns.nFormat(trans.profit, "$0.00a")} profit (${time} ago) [C:${ns.nFormat(trans.condition, "0.00%")} | P:${trans.profitPotential > 0} | F:${ns.nFormat(trans.forecast, "0.00")}]`);
			recouped += trans.profit;
		} else {
			ns.print(`INFO | Bought ${ns.nFormat(trans.transAmount,"0a")} [${trans.sym}] ${trans.transLong ? "LONG" : "SHORT"} for ${ns.nFormat(trans.transSum, "$0.00a")} (${time} ago) [${trans.transLong ? "C:" + ns.nFormat(trans.condition, "$0.00a") : "P:" + trans.profitPotential > 0} | F:${ns.nFormat(trans.forecast, "0.000")}]`);
			spent += trans.transSum;
		}
		trans.transTime += 4 * 1000 * numCycles;
	}

	ns.print(" ");

	// Log window output. Leave this open if you want to have an idea as to what is going on.
	ns.print(`Personal Stock Ticker`);
	ns.print("Stock | ? | #Shares |   Price   |  Bought$  |  $Profit$  | pChange  | pPoten | Forecst");
	ns.print("---------------------------------------------------------------------------------------");

	var marketValue = 0;
	var tradeValue = 0;
	for (const s of stocks) {
		if (s.longShares > 0 || s.shortShares > 0) {
			// Formatted print with character limits and everything.
			ns.printf("%-5s | %s | %-7s | %-9s | %-9s | %-10s | %-8s | %-6s | %s"
				, s.sym
				, s.longShares > 0 ? "L" : "S"
				, ns.nFormat(s.longShares > 0 ? s.longShares : s.shortShares, "0a")
				, ns.nFormat(s.longShares > 0 ? s.bidPrice : s.askPrice, "$0.00a")
				, ns.nFormat(s.longShares > 0 ? s.longPrice : s.shortPrice, "$0.00a")
				, ns.nFormat(s.longShares > 0 ? (s.bidPrice * s.longShares) - ((s.longPrice * s.longShares)) : (s.askPrice * s.shortShares) - ((s.shortPrice * s.shortShares)), "$0.00a")
				, ns.nFormat(percentageChange(s.initProfitPotential, s.profitPotential), "0.00%")
				, s.profitPotential > 0
				, ns.nFormat(s.forecast, "0.00"));
			marketValue += (s.bidPrice * s.longShares) + (s.askPrice * s.shortShares);
			tradeValue += (s.longPrice * s.longShares) + (s.shortPrice * s.shortShares);
		}
	}
	if (stocks.length <= 0) ns.print("ERROR | NO STOCKS IN PORTFOLIO");

	ns.print(" ");
	ns.print(`INFO | Total Amount Spent: ${ns.nFormat(tradeValue, "$0.000a")}`);
	ns.print(`INFO | Total Market Value: ${ns.nFormat(marketValue, "$0.000a")}`);
	ns.print(`INFO | Total Profits: ${ns.nFormat(marketValue - tradeValue, "$0.000a")}`)
	//ns.print(`INFO | Run Spent: ${ns.nFormat(spent, "$0.000a")} | Run Recouped: ${ns.nFormat(recouped, "$0.000a")} | Run Revenue: ${ns.nFormat(recouped - spent, "$0.000a")}`);
}

/**
 * Simply reports to the coordinator any stocks with longs/shorts. Doesn't run if port isn't empty though.
 * @param {NS} ns 
 * @param {Array} stocks
 */
 function reportStocks(ns, stocks) {
    var outStocks = ns.getPortHandle(16);
    if (!outStocks.empty()) return;
    
    for (const stock of stocks) {
        outStocks.tryWrite(JSON.stringify({"sym" : stock.sym, "short" : stock.shortShares > 0, "long" : stock.longShares > 0
		, "profitChange" : percentageChange(stock.initProfitPotential, stock.profitPotential)
		, "profitPotential" : stock.profitPotential > 0}));
    }
}