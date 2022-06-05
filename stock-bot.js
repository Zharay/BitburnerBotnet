//Requires access to the TIX API and the 4S Mkt Data API
let fracL = 0.2; 				// Fraction of assets to keep as cash in hand
let fracH = 0.3;
let commission = 100000; 		// Buy or sell commission
let numCycles = 1; 				// Each cycle is 4 seconds
let expRetLossToSell = -0.4; 	// As a percent, the amount of change between the initial forecasted 
								// return and the current return of the stock. I.e. -40% less 
								// forecasted return now than when we purchased the stock.


function pChange(ns, sym, oldNum, newNum){

    const diff = newNum < oldNum ? -(oldNum - newNum) : newNum - oldNum;
    let pdiff = diff / oldNum;
    //ns.print(`${sym}:\t${oldNum.toFixed(5)} -> ${newNum.toFixed(5)} | ${(pdiff*100).toFixed(3)}%`);
    return pdiff
}

/** @param {NS} ns */
function refresh(ns, stocks, myStocks) {
	let corpus = ns.getServerMoneyAvailable("home");
	myStocks.length = 0;

	for (let i = 0; i < stocks.length; i++) {
		let sym = stocks[i].sym;

		stocks[i].price = ns.stock.getPrice(sym);
		stocks[i].shares = ns.stock.getPosition(sym)[0];
		stocks[i].buyPrice = ns.stock.getPosition(sym)[1];
		stocks[i].vol = ns.stock.getVolatility(sym);
		stocks[i].prob = 2 * (ns.stock.getForecast(sym) - 0.5);
		stocks[i].expRet = stocks[i].vol * stocks[i].prob / 2;

        if (stocks[i].shares > 0) {
            stocks[i].initExpRet ||= stocks[i].expRet;
        } else {
            stocks[i].initExpRet = null;
        }

		corpus += stocks[i].price * stocks[i].shares;

		if (stocks[i].shares > 0) myStocks.push(stocks[i]);
	}
	
	stocks.sort(function(a, b) {
		return b.expRet - a.expRet
	});

	return corpus;
}

/** @param {NS} ns */
async function buy(ns, stock, numShares) {
    const max = ns.stock.getMaxShares(stock.sym)
    numShares = max < numShares ?  max : numShares;
	
	var boughtPrice = await ns.stock.buy(stock.sym, numShares);

	if (boughtPrice > 0)
		ns.print(`Bought ${stock.sym} for ${ns.nFormat(numShares * stock.price, "$0.000a")}`);
	else
		ns.print(`Tried and failed to buy ${stock.sym}\n`);

	return boughtPrice * numShares;
}

/** @param {NS} ns */
async function sell(ns, stock, numShares) {
	let profit = numShares * ((stock.price - stock.buyPrice) - (2 * commission));
	ns.print(`Sold ${stock.sym} for profit of ${ns.nFormat(profit, "$0.000a")}`);
	return await ns.stock.sell(stock.sym, numShares) * numShares;
}

/** @param {NS} ns */
export async function main(ns) {
	ns.disableLog("ALL");

	let stocks = [...ns.stock.getSymbols().map(_sym => {return {sym: _sym}})];
	let myStocks = [];
	let corpus = 0;
	let bought = 0;
	let sold = 0;

	let lastSell = {"stock" : "", "buyPrice" : 0, "numShares" : 0, "profit" : 0, "sellOff" : false};
	let lastSellTime = 0;

	var fSell = ns.getPortHandle(19);

	while (fSell.peek() == "NULL PORT DATA") {
		ns.clearLog();
		corpus = refresh(ns, stocks, myStocks);
		
		//Sell under performing shares
		for (let i = 0; i < myStocks.length; i++) {
			if (pChange(ns, myStocks[i].sym, myStocks[i].initExpRet, myStocks[i].expRet) <= expRetLossToSell || myStocks[i].expRet <= 0) {		
				lastSell.stock = myStocks[i].sym;
				lastSell.buyPrice = myStocks[i].buyPrice;
				lastSell.numShares = myStocks[i].shares;
				lastSell.profit = myStocks[i].shares * ((myStocks[i].price - myStocks[i].buyPrice) - (2 * commission));
				lastSell.sellOff = true;
				lastSellTime = 0;

				sold += await sell(ns, myStocks[i], myStocks[i].shares);
				corpus -= commission;
			}
		}
		
		//Sell shares if not enough cash in hand
		for (let i = 0; i < myStocks.length; i++) {
			if (ns.getServerMoneyAvailable("home") < (fracL * corpus)) {
				let cashNeeded = (corpus * fracH) - ns.getServerMoneyAvailable("home") + commission;
				let numShares = Math.floor(cashNeeded / myStocks[i].price);
				
				lastSell.stock = myStocks[i].sym;
				lastSell.buyPrice = myStocks[i].buyPrice;
				lastSell.numShares = numShares;
				lastSell.profit = numShares * ((myStocks[i].price - myStocks[i].buyPrice) - (2 * commission));
				lastSell.sellOff = false;
				lastSellTime = 0;

				sold += await sell(ns, myStocks[i], numShares);
				corpus -= commission;
			}
		}

		//Buy shares with cash remaining in hand
        for (let stock of stocks) {

            if (stock.shares > 0) continue;
            if (stock.expRet <= 0) continue;
            let cashToSpend = ns.getServerMoneyAvailable("home") - (fracH * corpus);
            let numShares = Math.floor((cashToSpend - commission) / stock.price);
            if ((numShares * stock.expRet * stock.price * numCycles) > commission)
                bought += await buy(ns, stock, numShares);
             //   break;
        }

		// Log window output. Leave this open if you want to have an idea as to what is going on.
		ns.print(`Personal Stock Ticker`);
		ns.print("Stock | #Shares |   Price   |  Bought$  | Volati |  Prob  | Retnt");
		ns.print("-----------------------------------------------------------------");

		var marketValue = 0;
		var tradeValue = 0;
		for (let i = 0; i < myStocks.length; i++) {
			let s = myStocks[i];
			ns.printf("%-5s | %-7s | %-9s | %-9s | %-6s | %-6s | %s", s.sym, ns.nFormat(s.shares, "0a"), ns.nFormat(s.price, "$0.000a"), ns.nFormat(s.buyPrice, "$0.000a"), ns.nFormat(s.vol, "0.00%"), ns.nFormat(s.prob, "0.00%"), ns.nFormat(s.expRet, "0.00%"));
			marketValue += (s.price * s.shares);
			tradeValue += (s.buyPrice * s.shares);
		}
		if (myStocks.length <= 0) ns.print("NO STOCKS IN PORTFOLIO");

		ns.print(" ");
		ns.print(`Total Market Value: ${ns.nFormat(marketValue, "$0.000a")}`);
		ns.print(`Total Trade Price: ${ns.nFormat(tradeValue, "$0.000a")}`);
		ns.print(`Current Equity: ${ns.nFormat(tradeValue - marketValue, "$0.000a")}`)
		ns.print(`Total Spent: ${ns.nFormat(bought, "$0.000a")} | Recouped: ${ns.nFormat(sold, "$0.000a")} | Revenue: ${ns.nFormat(sold - bought, "$0.000a")}`);
		
		if (lastSell.stock) {
			ns.print(" ");
			ns.print(`Last Sell: ${ns.nFormat(lastSell.numShares,"0a")} shares of ${lastSell.stock} for ${ns.nFormat(-lastSell.profit, "$0.000a")} ${lastSell.sellOff ? "as a sell off" : ""}`);
			ns.print(`Sell Time: ${ns.tFormat(lastSellTime)} ago`);
		}

		lastSellTime += 4 * 1000 * numCycles;
		await ns.sleep(4 * 1000 * numCycles);
	}

	if (fSell.peek() == "sell") {
		var finalSold = 0;
		ns.print("Liquidating all assets...");
		
		for (let s of myStocks){
			finalSold += sell(ns, s, s.shares);
		}
		
		ns.print(`Final Total: ${ns.nFormat(finalSold, "$0.000a")}`);
	}
}