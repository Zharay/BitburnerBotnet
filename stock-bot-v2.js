/** A stock market script that only requires a portfolio to use!
 * It does this by "predicting" the state of the stock market by comparing the amount of 
 * change over a sample history of market prices. If the overall change is positive, then
 * it is positive. Otherwise, it is negative.
 * 
 * This is NOT a replacement for stock-bot.js! This is only for getting up to the amount 
 * needed to gain the APIs for it! This script is BRUTALLY slow and has been pointed out to
 * not really do anything the original author posted about in his really long post about it.
 * In fact, it has no problem spending money you do not own (it once landed me -$400b in debt!)
 * 
 *  Originally by: u/peter_lang
 *  Original URL: https://www.reddit.com/r/Bitburner/comments/rsqffz/bitnode_8_stockmarket_algo_trader_script_without/
 *  
 *  REQUIREMENTS:
 *    - WSE Account
 *    - Stock Market Access ($1b)
 *    - NONE of the APIs!
**/
const shortAvailable = true; // Requires you to be on BN 8.1 or have beaten 8.2
const commission = 100000;
const samplingLength = 30;

function predictState(samples) {
	const limits = [null, null, null, null, 5, 6, 6, 7, 8, 8, 9, 10, 10, 11, 11, 12, 12, 13, 14, 14, 15, 15, 16, 16, 17, 17, 18, 19, 19, 20];
	let inc = 0;
	for (let i = 0; i < samples.length; ++i) {
		const total = i + 1;
		const idx = samples.length - total;
		if (samples[idx] > 1.) {
			++inc;
		}
		const limit = limits[i];
		if (limit === null) {
			continue;
		}
		if (inc >= limit) {
			return 1;
		}
		if ((total - inc) >= limit) {
			return -1;
		}
	}
	return 0;
}

function format(money) {
	const prefixes = ["", "k", "m", "b", "t", "q"];
	for (let i = 0; i < prefixes.length; i++) {
		if (Math.abs(money) < 1000) {
			return `${Math.floor(money * 10) / 10}${prefixes[i]}`;
		} else {
			money /= 1000;
		}
	}
	return `${Math.floor(money * 10) / 10}${prefixes[prefixes.length - 1]}`;
}

function posNegDiff(samples) {
	const pos = samples.reduce((acc, curr) => acc + (curr > 1. ? 1 : 0), 0);
	return Math.abs(samples.length - 2 * pos);
}

function posNegRatio(samples) {
	const pos = samples.reduce((acc, curr) => acc + (curr > 1. ? 1 : 0), 0);
	return Math.round(100 * (2 * pos / samples.length - 1));
}

export async function main(ns) {
	ns.disableLog("ALL");
	let symLastPrice = {};
	let symChanges = {};
	let fSell = ns.getPortHandle(19);
	let hasAlerted = false;
	let totalEquity = 0;


	for (const sym of ns.stock.getSymbols()) {
		symLastPrice[sym] = ns.stock.getPrice(sym);
		symChanges[sym] = []
	}

	while (fSell.peek() == "NULL PORT DATA") {
		await ns.sleep(2000);
		totalEquity = 0;
		let myStocks = [];

		if (symLastPrice['FSIG'] === ns.stock.getPrice('FSIG')) {
			continue;
		}

		for (const sym of ns.stock.getSymbols()) {
			const current = ns.stock.getPrice(sym);
			symChanges[sym].push(current / symLastPrice[sym]);
			symLastPrice[sym] = current;
			if (symChanges[sym].length > samplingLength) {
				symChanges[sym] = symChanges[sym].slice(symChanges[sym].length - samplingLength);
			}
		}

		const prioritizedSymbols = [...ns.stock.getSymbols()];
		prioritizedSymbols.sort((a, b) => posNegDiff(symChanges[b]) - posNegDiff(symChanges[a]));

		for (const sym of prioritizedSymbols) {
			const positions = ns.stock.getPosition(sym);
			const longShares = positions[0];
			const longPrice = positions[1];
			const shortShares = positions[2];
			const shortPrice = positions[3];
			const state = predictState(symChanges[sym]);
			const ratio = posNegRatio(symChanges[sym]);
			const bidPrice = ns.stock.getBidPrice(sym);
			const askPrice = ns.stock.getAskPrice(sym);

			if (longShares <= 0 && shortShares <= 0 && ns.stock.getPrice(sym) < 30000) {
				continue;
			}

			myStocks.push({
				"sym": sym,
				"short": shortShares,
				"long": longShares
			});

			if (longShares > 0) {
				const cost = longShares * longPrice;
				const profit = longShares * (bidPrice - longPrice) - 2 * commission;
				if (state < 0) {
					const sellPrice = ns.stock.sell(sym, longShares);
					if (sellPrice > 0) {
						ns.print(`WARN | SOLD (long) ${sym}. Profit: ${format(profit)}`);
					}
				} else {
					ns.print(`L ${sym} (${ratio}): ${format(profit+cost)} / ${format(profit)} (${Math.round(profit/cost*10000)/100}%)`);
				}
			} else if (shortShares > 0) {
				const cost = shortShares * shortPrice;
				const profit = shortShares * (shortPrice - askPrice) - 2 * commission;
				if (state > 0) {
					const sellPrice = ns.stock.sellShort(sym, shortShares);
					if (sellPrice > 0) {
						ns.print(`WARN | SOLD (short) ${sym}. Profit: ${format(profit)}`);
					}
				} else {
					ns.print(`S ${sym} (${ratio}): ${format(profit+cost)} / ${format(profit)} (${Math.round(profit/cost*10000)/100}%)`);
				}
			} else {
				const money = ns.getServerMoneyAvailable("home");
				if (state > 0) {
					const sharesToBuy = Math.min(10000, ns.stock.getMaxShares(sym), Math.floor((money - commission) / askPrice));
					if (ns.stock.buy(sym, sharesToBuy) > 0) {
						ns.print(`INFO | BOUGHT (long) ${sym}.`);
					}
				} else if (state < 0 && shortAvailable) {
					const sharesToBuy = Math.min(10000, ns.stock.getMaxShares(sym), Math.floor((money - commission) / bidPrice));
					if (ns.stock.short(sym, sharesToBuy) > 0) {
						ns.print(`INFO | BOUGHT (short) ${sym}.`);
					}
				}
			}

			totalEquity += (longShares * bidPrice) + (shortShares * askPrice);


			if (totalEquity >= 31e9 && !hasAlerted) {
				await ns.alert(`You have a possible market value of ${ns.nFormat(totalEquity, "$0.00a")}!\nYou may want to consider liquidating your assets to purchase the APIs needed for stock-bot.js!`);
				hasAlerted = true;
			}
		}

		ns.print(`Total Equity: ${ns.nFormat(totalEquity, "$0.00a")}`);
		reportStocks(ns, myStocks);
	}

	if (fSell.peek() == "sell") {
		const prioritizedSymbols = [...ns.stock.getSymbols()];
		var sellTotal = 0;
		for (const sym of prioritizedSymbols) {
			const positions = ns.stock.getPosition(sym);
			const longShares = positions[0];
			const shortShares = positions[2];

			if (longShares > 0) {
				sellTotal -= ns.stock.sell(sym, longShares);
			} else if (shortShares > 0) {
				sellTotal = ns.stock.sellShort(sym, shortShares);
			}

			ns.print(`Liquidated Assets for ${ns.nFormat(sellTotal, "$0.00a")}`);
		}
	}
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
		outStocks.tryWrite(JSON.stringify({
			"sym": stock.sym,
			"short": stock.shortShares > 0,
			"long": stock.longShares > 0
		}));
	}
}