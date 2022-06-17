# BitburnerBotnet
An all in one botnet for the game Bitburner that grows on its own and efficiently hacks all targets within a set criteria. All the while every server is talking to your home computer, giving you up-to-date information as to what is going on at any given moment. As a bonus, there are also scripts that automatically handle your Hacknet, private servers, and stock markets!

![Nearing The Red Pill on first BitNode](/ss/Screenshot1.jpg)

# How to Use - Quick and Dirty
A TL;DR  for those who don't want the full details.

**Requirements**
- A home computer (in game) with at least 32GB of RAM (64GB for all scripts). 
- Increase NetScript Port size from 50 to 100 in settings.
- You DO NOT need Formulas.exe~!

**Basic steps**
1. Import each file in this repo into Bitburner.
2. Open up coordinator.js and modify the options at the top to your preferences (mainly money threshold)
3. Run restart-scripts.js
4. To get a readout of the botnet go to Active Scripts > Home > check-status.js > LOG
5. PROFIT

## Getting Started - Starting from nothing
Lets assume you are starting fresh (either in a brand new game or a new BitNode) and have 32GB of RAM. Just follow these steps and after a few hours (if at hack level 1) you should be making a few billion quiet easily.

1. Open coordinator.js and perform the following changes
	- `minServerGrowth = 1`
	- `minServerMoney = 1`
2. Open buy-server.js and perform the following changes
	- `spendPercentage = 0.2`
3. (Optional) If you do not have access to the stock market or you do not have 64GB of RAM on your home machine
	- Open restart-scripts.js and perform the following changes as needed
		- `runHacknetMgr = true` (unless you are on a BitNode that makes this less viable)
		- `runStockBot = false` (requires a $26b buy in)
		- `runStockBotV2 = false` (requires a WSE Account and nothing else)
		- `runBuyServer = false` (requires you have 64GB of RAM to run concurrently)
4. In terminal run restart-scripts.js
	- It should now start auto-spreader-v2, coordinator, hack-daemon, check-status, and hacknet-mgr scripts
	- Your first few remote bots will start working on the servers that fit the criteria set in coordinator.js
5. Go to Active Scripts > home > check-status and open up the LOG.
	- Keep this open! It will give you real-time information on your botnet and the servers you are targeting
6. Let everything run for a while. Eventually you'll reach enough hack skill to make your first few programs.
	- Once you have BruteSSH.exe, auto-spreader will automatically root servers that require 1 port and add them to your botnet.
	- I suggest getting a job to earn some extra cash. The first hour can be very slow.
7. Once you have enough hack skill, you will start to see targets in your check-status window that are more profitable.
	- In coordinator.js : `minServerGrowth = 20` (or 30)
	- In coordinator.js : `minServerMoney = 1e7` (or 1e6) (1e7 is a shorthand way of expressing 10^7 = 10 million)
	- Either kill all scripts or run sendKill.js and wait for the current threads to finish
	- Run restart-scripts.js
8. Wait! We need $200k for a TOR access (bought at computer store in city) then an additional $1m (?)
	- Keep doing work at jobs as you increase in hack skill! Every bit helps.
9. Connect to the darkweb and buy what you can (FTPCrack.exe and relaySMTP.exe)
	- Doing so will add way more to the botnet!
10. Upgrade your home computer's RAM to 64GB then set `runBuyServer = true` in restart-scripts.js and run it.
	- Alternatively, just run buy-server.js in your terminal
11. Buy the rest of the port programs from the darkweb (HTTPWorm.exe = $30m and SQLInject.exe = $250m)
12. You are practically done. The game is now your plaything.

These are the exact steps I took starting BitNode1.2 without any augmentations. 9 hours later and the image below is where I am sitting at with my Hack skill at 416 while making $1.38m/sec (and growing)!

![9 hours into BitNode1.2](/ss/Screenshot4.jpg)

### Long Term Notes
Eventually you'll notice reduction of threads on your targets. This is 100% normal. Notice the security levels and money. Once you have enough RAM, your botnet can easily maintain a balance where everything is within a sweet spot, constantly generating money for you. There is nothing more for you to do except narrow down your targets by increasing minServerMoney and minServerGrowth.

### Hacking Beyond BN1
Eventually the game will open up new paths of revenue, different ways to beat the game, and even a new stat. However, the one constant that you'll almost always need is a running botnet. Whether it is generating money or not, so long as you have every system doing something, you will gain from it.

# Preface
Like everyone I started small with the tutorial scripts. I wanted everything to be dynamic, with no hard coded server names as I feel that'd defeat the purpose of this whole game ("lol not cheating in a game promoting hacking and embezzlement"). Once I got something working, I kept asking myself: "Is this efficient enough?"

By trade I am a Software Engineer, I majored in Computer Science, and have been programming for nearly 20 years. It's a habit of mine to look at a problem as ask that question repeatedly. So when I finally came round to playing this game, I thought I'd only do it for a few days and move on. I was mistaken.

## The Rules
Before I begin let me set the ground rules that I am going by as I feel it's relevant as to why the scripts are the way they are:
1. **Must be efficient.** I don't want scripts that do things in a round about way. If it's gonna do something, do it efficiently.
2. **Must be a script.** Important. I do not want classes. I do not want importing of scripts. I want script kiddie play.
3. **Must not cheat.** Everything must be dynamic. Obtain the data we need with in game functions. If we cannot, use hard coding sparingly.
4. **Must work.** I don't want a single script to do a half job. I want them to do the whole job if we can.
5. **Give credit where it's due.** If someone else has done it and I use it as a base, I give full credits to those people.

# How it Works
Ports, a robust coordinator, and the bots that do the leg work. Basically a [Master-Server Load Balance network](https://en.wikipedia.org/wiki/Load_balancing_(computing))!

The setup on paper is simple. We have a central coordinator that handles information coming in and out. This central hub is where all servers in the botnet get information on which targets to go for, how many threads are actively being worked on, and so much more. Each server runs their own hack-daemon that handles the actual task of figuring out which target to work on and how many threads would be needed to achieve a specific goal. The bottom line is that everything must use as little resources as necessary to maximize results. This is not a simple HWGW with timers and so on. A single server can and will have multiple tasks running at any given moment; growing, weakening, and hacking different servers all at the same times. Meanwhile, those tasks are themselves talking to the coordinator, reporting on their work and any risk they might incur to security.

To do all the above, we do need a few other helper scripts which will be further detailed below. The real star of the show would be the ports. Out of the 20 available I'm using 17 of them, most of which are JSON object arrays that every part of the botnet has access to. Without this, nothing would work efficiently at all.

In practice this is a lot more complicated than it seems. I spent days getting things right and I learned a ton along the way. This is seriously the most efficient way to (not) play Bitburner.

# The Core Scripts
Each script serves a specific purpose, the core of which are essential for everything to work.

## coordinator.js (4.95 GB)
The heart of the botnet and the handler of nearly all the ports used. Uses heavy use of JSON objects to keep a log of everything going on. This can be ran solo without restart-scripts but you must pass it a list of all servers deliminated by a comma [,] or semicolon [;]. Due to how much information this script must handle, time is always an issue. In fact, it can be considered a bottleneck. By default it is set to a very generous 1000ms, but it can run smoothly even at 500ms. Keep your (real) processor's capabilities into account when lowering this option!

For information on all the ports, visit the [wiki](https://github.com/Zharay/BitburnerBotnet/wiki)!

### Options
```
const debug 		= false;	// Enables multiple log messages. Leave this alone unless you want lag.
const threshModifier 	= 0.75;		// Money threshold that we hack towards (we always grow to 100%)
const minHackChance 	= 0;	 	// Min hack chance to target
const minServerGrowth	= 30;		// Min server growth to target
const maxServerGrowth	= 100;		// Max server growth to target
const minServerMoney 	= 1e6;		// Min money the server has at its maximum to target (10^9 = $1.0b)
const maxServerMoney	= 2e9;		// Max money the server has to target (2e9 = 2 * 10^9 = $2.0b)
const loopInterval 	= 1000;		// Amount of time the coordinator waits per loop. Can be CPU intensive
const manipulateStocks 	= true;		// If enabled we will update our target lists to include servers we own stock in.
```

## hack-daemon.js (9.35 GB)
The bot itself. This script is ran on all remote machines and works with the information produced by the coordinator to figure out who to target, how many threads are needed, and whether they have permission to run a task. Unlike basic hack scripts, this will always try to do something thanks to the information available at all times. 

All three actions (hack, grow, weaken) are done via their own script, but these scripts only do two things: their given task to the target server and reporting the start and finish of said task to the coordinator. Both grow and hack can and will generate an increase in security and we use that information to run preemptive weaken threads.

Note: This script cannot run standalone! It will wait for the coordinator to populate the data it needs within the ports.

**General Task Loop** 

The hack-daemon will loop through all targets obtained from the coordinator and perform the following for each task:
0. If share is enabled and the script is running on your owned machines, dedicate all remaining resources to running  shareCPU script and skip the rest of the loop.
1. See if the target falls within the criteria to work our task on.
	- If it is, ask coordinator for lock
		- If we get lock, move forward
		- If we do not get lock after requesting for it, sleep for 1 second and skip this task
		- If the lock was already assigned, just move on to the next task
2. If we get lock, figure out how many threads are needed to reach our goal
	- Only use as much as the server's RAM can support
3. Check the coordinator's current thread count on the task
	- If not enough threads are on the task to reach the goal, run as many threads as needed (or can)
	- If enough threads are being used, give up
4. Release lock and wait 1 second.
5. After two runs through the entire target list and if we have enough RAM available, dedicate the rest to EXP farming.

**Options**
```
const debug = false;	//  Enables debug logs. 
const homeCPU = 1;	// The number of CPUs on your home server. Better to just set it here than waste RAM
const expRuns = 2;	// The number of cycles to complete before using your remaining RAM on EXP farms
```

### weaken.js (1.75 GB)
Fun fact: weaken lowers a server's security by 0.05 per thread, regardless of the time it takes to run. We use this to our advantage!

**We only weaken...**
- If we are close to the minimum threshold (minimum security level + 5)
- Or if there is a reported security risk (security risk > 5)
- If we even have enough RAM to run the script
- If there is no lock set

**How many threads to use**

A security breach (securityBreach) is a 2x multiplier that only occurs when there is more security + security risk that is 2x the security threshold. We do this due to lucky hack scripts winning more than they should.

`RequiredThreads = (((SecurityLevel + SecurityThreat - SecurityThreshold) / 0.05) * SecurityBreach) - NumThreadsWeakening`

### grow.js (1.75 GB)
Growth is always a 1 CPU task unless its on the home server. Overall, we always grow to 98% due to how hacking works.

**We only grow...**
- If the money available is less than 98% of the maximum
- If, in addition to the above, the number of hack threads will bring the money below that 98% threshold
- If we have enough RAM to even run the script
- If there is no lock set
- If market manipulation is enabled, the server is associated with a stock, we own a long of said stock, and said long is going into negative potential profit

**How much to grow**

We must generate a multiplier that, when applied to the current amount of money on the target, would get us to the maximum amount of money the server can hold. So this is more of a question of much we must multiply rather than how many threads needed (which we get with _ns.growthAnalyze_). 

```
MoneyMultiplier = MaxMoney / (MoneyAvailable - HackAmount)
HackAmount = [%AmountTaken] * MoneyAvailable * NumHackThreads * ChanceToHack
Above ignored if MoneyAvailable == 0 or AmountGrow <= 0 (if so, MoneyMultiplier = 1)
```

### hack.js (1.70 GB)
Hacking is fast and dumb, so we must be extra careful we do not overdo it. But because hacking has a chance to fail, we must compensate by adding it into the equation. This will effectively multiply the number of threads by the inverse of the chance. At the same time, we could outright fail every hack if our hack level is too low or the server's security too high, so we must avoid that situation from the beginning.

**We only hack...**
- If the money available is greater than the threshold (a % of its maximum set by the coordinator)
- If the chance to hack the target is over 10%
- If you have the RAM needed to run the script
- If there is no lock
- If market manipulation is enabled, the server is associated with a stock, we own a short of said stock, and said short is going into positive potential profit

**How many threads to use (when using _ns.hackAnalyze_)**

`RequiredThreads = ((MoneyAvailable - MoneyThreshold) / HackChance) - NumThreadsHacking`

### shareCPU.js (4.00 GB)
The share() function can only be used on your home or purchased servers. For 10 seconds it will give hacking contracts and reputation generation a percentage boost for each thread actively running it. Unlike the above scripts, this script does not report to the coordinator nor does it have any conditions to run other than having Port 17 set. It will continue running until Port 17 is cleared a which point it will immediately end.

## auto-spread-v2.js (4.95 GB)
Will seek out, root, copy files to, and begin scripts for all servers in the network. It will keep searching for new servers until you have all programs to do so. This is where the coordinator starts, getting a full list of all servers in the BitNode. This script also doubles as a means to refresh all files across the network. That way, any changes made on the home server will be reflected by the rest when this is done.

The script's core functionality (finding and rooting all servers) was created by [KrunoSaho](https://gist.github.com/KrunoSaho/f0aa418e16e828b0ebc0585d1ebcf6b5). There is still commented code that can backdoor every server if you want, but honestly its better to just do so manually (plus it is VERY slow depending on your skill level).

## buy-server.js (11.50 GB)
This script handles the expensive task of buying and maintaining purchased private servers. It will figure out on its own how much RAM the lowest server has and will attempt to upgrade when necessary. This script is very expensive to run and most of the blame goes to the purchase server commands. Those with only 32GB RAM will likely need to wait until you have 64GB or more to use this.

By default, private servers are only upgraded when their RAM utilization goes beyond a threshold percentage (80%). 

A note on tasks already running on servers that are deleted. Before finishing the job of deleting the server, the buy-server script will emulate hack, grow, and weaken scripts by reporting to the coordinator that their task is done. It grabs the information it needs from the arguments passed to each script, even removing the security risk that would've been applied. Downside, if you are rapidly upgrading servers, some long tasks will never get to finish (which can be a problem when they can take up to an hour to complete).

**Options**
```
var memLevel = 4;		// 4 = 16GB (Recommended minimum to run hack-daemon)
const maxLevel = 20; 		// True maximum is 20 (1048576GB = 1 Petabyte) 
const spendPercentage = 0.02; 	// Percentage of maximum money to spend on server upgrades.
const ramUsageThreshold = 0.8;	// Percentage of global ram used in hacks. If it goes beyond this, upgrade for more capacity.
const waitInterval = 1000*60*5; // Time to wait between cycles (in ms)
```

## easy-hack.js (2.4 GB)
This is literally just baby's first hacking script, the very same one found in the tutorial. However, it's been modified to make use of the coordinator's target list to... do whatever it wants, really. This is a dumb script that does not report to the coordinator what it is doing as it is only for servers that have 8GB of RAM or less (lookin' at you n00dles!). As such, this is only just to make use of every bit of capacity we can when in the early stage of a BitNode run. It may be dumb but it honestly gets the job done!

## check-status.js (3.0 GB)
This is a purely optional script that gives a log readout of the data being sent by the coordinator. It gives you hard numbers as to who your targets are, hacker level requirements, security levels (current / threshold [risk]), Money situation (current / max [threshold]), growth, hack chance, and an exact number of threads (and RAM) being used to hack, grow, and weaken them. It is your go to place to stare at when you want to know exactly what is going on at any given moment. In real time you will see the botnet change from growing to weaken to eventually hacking when the conditions are right.

![Example of a single target server on the botnet](/ss/Screenshot3.jpg)

When I got this running and the botnet fully functioning, you cannot imagine my fist pumps. Its like being in college all over again lol.

The memory footprint is small and can technically be brought down to 1.6GB, but that would only spread the burden to the already big coordinator.

## The Ports
_To find more information on the ports used in this botnet, please refer to the [wiki](https://github.com/Zharay/BitburnerBotnet/wiki)!_

# Other Scripts
The rest of the scripts in this repo do not have a direct effect on the botnet and are only just extra avenues of obtaining money. Some have been curated from other programmers found on Reddit and Github and tailored to fit my needs. Credit goes to those people with enough drive to provide at least a starting answer to some of the more difficult BitNodes in the game!

## restart-scripts.js (3.8 GB)
This is a script that will simply kill all scripts on the home machine (except for the stock-bot and corpo scripts) and go about doing the same for all servers there after. It will then clear the ports before restarting auto-spread-v2 and any of the optional scripts listed in the options below. This is you're quick and easy way to get everything started!

**Options**
```
const runStockBot = false;
const runStockBotV2 = false;
const runHacknetMgr = false;
const runBuyServer = false;
const runCorpo = false;
const enableShare = false;
```

## hacknet-mgr.js (9.7 GB)
Who did this script? I don't know! **If someone can find out who, please let me know because this is seriously efficient.** The best Hacknet script out there. It will always upgrade by the most efficient and cost effective method first, leaving the most expensive upgrades for absolutely last. That means it will often buy more servers before looking at the other upgrades on each machine.

If you are just starting out or on a new BitNode run, keep this script running! It will easily outpace a beginner botnet until you have the skill, programs, and augments needed to make it shine!

**Options**
```
const maxIncome = 1e6;
const spendPercentage = 0.1;
```

## stock-bot.js (19.7 GB)
This script was originally written by [u/havoc_mayhem](https://www.reddit.com/user/havoc_mayhem/) and can be found [here](https://www.reddit.com/r/Bitburner/comments/9o1xle/stock_market_script/). It's been 4 years since and people are still fixing and updating the script. What I've done is re-organized and improved its functionality further. It is now short capable. The profit potential math has been improved. It now has a stock ticker and history of transactions in the log. And it can report its status to the coordinator to manipulate the stock market! This is my go to script for BN8, once getting up to $1q before I finished.

**Requirements:**
- A WSE Account
- Access to the TX API ($1b)
- Access to the 4S Market Data API ($5b)
- Access to 4S Market Data TIX ($25b)
- (Optional) Access to short stocks (be in BN8 or finished BN8.2)

**Options**
```
const shortAvailable = true;		// Requires you to be on BN 8.1 or have beaten 8.2
const fracL = 0.025;			// Fraction of market wealth to keep as cash on player
const fracH = 0.05;			// Fraction of market wealth vs player money to spend on stocks
const commission = 100000; 		// Buy or sell commission [DO NOT CHANGE]
const numCycles = 1; 			// Number of cycles to wait before checking market. Each cycle is 4 seconds.
const longForecastBuy = 0.55;		// LONG: Projected forecast value at which to buy
const longForecastSell = 0.5;		// LONG: Projected forecast value at which to sell
const expProfitLossLong = -0.25; 	// LONG: The percentage difference of profits now compared to when purchased (ie. -25% forecasted profit)
const shortForecastBuy = 0.45;		// SHORT: Projected forecast value at which to buy
const shortForecastSell = 0.5;		// SHORT: Projected forecast value at which to sell
const expProfitGainShort = 0.25;	// SHORT: The percentage difference of profits now compared to when purchased (ie. 25% forecasted profit)
const transactionLength = 50;		// Will limit the log print specified amount
```

### About Stock Market Manipulation
Both stock-bots will automatically try to report the stocks you own to the coordinator. To turn on this feature, go into the coordinator and enable it there before restarting the botnet. Once it is running, the coordinator will reserve the servers used by the public companies add them to the list of money target servers with special flags. The hack-daemons will then decide on their own how to handle them. The hack-daemons will outright ignore these servers until you own a stock in them (either short or long), so please be aware you list of targets will get smaller. 

We only grow if the server is associated with a long stock and has negative projected profits. We only hack if the server is associated with a short stock and has positive project profits. If you continuously grow/hack these servers, your profit gains will cancel out, so we only do these actions and nothing more (aside from weaken).

Note: Most of the servers used by these companies are towards the 1k hacker level range. So while you might have this enabled, if you do not have the required level you will not see any progress (thus the occasional profit loss from normal stock trades)

### Note on Shorts
Shorts do not follow the normal conventions of profitability. The stock ticker may report negative profits but when the shorts are finally sold due to a market flip or too much potential profits, you'll often see that it gained in profits instead of losing it. I cannot just flip the negative profit value as that is not 100% true either as there are times when it will sell at a loss. Be aware that the log of transactions is there for a reason!

## stock-bot-v2.js (23.7 GB)
This script was written by [u/peter_lang](https://www.reddit.com/user/peter_lang/) and his script can be found [here](https://www.reddit.com/r/Bitburner/comments/rsqffz/bitnode_8_stockmarket_algo_trader_script_without/). This script makes full use of shorts and longs found in BitNode 8 and is the best at using actual math to do the job of what a 4S Market Data API and Access would do (saving you $26b).  I've since made only minor additions, changing up how it logs information, adding an option to enable shorts, and having it report to the coordinator for possible stock market manipulation.

Note: This script WILL use all your money. Do not try to spend much if you are relying on this solely for money (i.e. BN8)

**Use this script only to gain the money needed to purchase the 4S TIX and API ($30b) so you can run stock-bot.js!** I cannot stress this enough,. This is not a replacement for the OG bot. This is slow. Excruciatingly so. On BN8 where you cannot make any other form of money, this script will take a full 24hrs before it is able to get to that amount (whereas the other can do it in a matter of hours). This is why the script has an option to enable the liquidation of all stocks when it detects it is within the threshold.

**Requirements:**
- A WSE Account
- Access to the TX API ($1b)
- (Optional) Access to short stocks (be in BN8 or finished BN8.2)

**Options**
```
const shortAvailable = true; 	// Requires you to be on BN 8.1 or have beaten 8.2
const liquidateThresh = 31e9;	// Threshold to alert the player that they have enough to buy 4S API and Data
const liquidateAtS4 = true;	// Will liquidate all stocks once alerted from above. Must buy 4S API and Data manually
const samplingLength = 30;	// Length of previous tick samples to use to predict its growth state
const commission = 100000;	// Buy or sell commission [DO NOT CHANGE]
```

## corpo.js (1.02 TB) 
This beefy script was originally written by [Kamukrass](https://github.com/kamukrass/Bitburner) and can be found [here](https://github.com/kamukrass/Bitburner/blob/develop/corp.js) and has been COMPLTELY rewritten by myself. After 3 days of work, I now have this, a script that will correctly follow [a well known guide](https://docs.google.com/document/d/15hN60PmzmpXpT_JC8z_BU47gaZftAx4zaOnWAOqwoMw/edit?usp=sharing) and do so smartly. Due to the nature of starting a corporation and the price of the APIs required, this is not a set it and forget it script. This **REQUIRES** that you already have a running corporation with actual profits to make full use of this script.

Honestly, this script will require its own page of information to describe everything it does. But the gist is that it will create a Tobacco division and fully automate its management from there. It can increase office size and assign employees. It will completely manage all your upgrades and research. It will make new products, figure out their optimal market price (until you unlock Market-TA.I and II), and repeat the process. It will even handle any new division you add that can create products (though for now only Healthcare) and do the same thing Tobacco does all over again.

Only downside: It has a hefty **1 Terabyte RAM** requirement.

**Requirements:**
- $150b (personal) to create a corporation
- 1TB of RAM
- A starting business division [**Follow this guide!!**](https://docs.google.com/document/d/15hN60PmzmpXpT_JC8z_BU47gaZftAx4zaOnWAOqwoMw/edit?usp=sharing)
- Office and Warehouse APIs ($100b corp funds)

## getServerStatus.js (2.2 GB)
A terminal only script that you can use to get all the information you'll need a one or more servers. I find this to be more informative than any built in exe you can create and it can give you information that'd be useful for your botnet. Just run the command below in the terminal along with the money threshold (0.75) and the host names separated by spaces between each.

`run getServerStatus.js [moneyThreshold:Number] [Hostname] ... [Hostname]`

## liquidate.js (1.6GB), sendKill.js (1.6GB), killServer.js (1.6GB)
These scripts have one function each. liquidate.js will send the flag to Port 19 telling your stock-bot to sell all stocks and shutdown. sendKill.js will send a flag to Port 20 telling all running scripts that listen for it to shutdown gracefully (leaving any lingering tasks to complete naturally). It's a good way to shut things down when you are finishing up a run or when you want to close things before making script edits. Finally, killServer.js is like sendKill only it requires you pass a host name as an argument. This uses Port 18 and will cause only that server's hack-daemon to shutdown gracefully.