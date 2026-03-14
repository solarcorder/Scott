const APPS_SCRIPT_URL="https://script.google.com/macros/s/AKfycbzuHpab64FUO9QCuJsuHABQISn3kXd2czdyp6xKM_30ThMiJbVCdSwgUKHoRqEZd5-M/exec";
const ledger={income:{},expenses:{},assets:{},liabilities:{}};
const TYPE_TO_PILLAR={income:"income",expense:"expenses",asset:"assets",liability:"liabilities"};

function parseAmount(text){
  const t=text.toLowerCase().replace(/,/g,'');
  const mults=[[/(\d+(?:\.\d+)?)\s*crore/,10000000],[/(\d+(?:\.\d+)?)\s*cr\b/,10000000],[/(\d+(?:\.\d+)?)\s*lakh/,100000],[/(\d+(?:\.\d+)?)\s*lac\b/,100000],[/(\d+(?:\.\d+)?)\s*[Ll]\b(?!\s*(?:months?|mo|years?|yr))/,100000],[/(\d+(?:\.\d+)?)\s*million/,1000000],[/(\d+(?:\.\d+)?)\s*m\b/,1000000],[/(\d+(?:\.\d+)?)\s*thousand/,1000],[/(\d+(?:\.\d+)?)\s*k\b/,1000]];
  for(const[re,m]of mults){const x=t.match(re);if(x)return Math.round(parseFloat(x[1])*m);}
  const slangs=[/set\s+(?:me\s+)?back\s+[₹$]?\s*(\d+(?:\.\d+)?)/,/shell(?:ed)?\s+out\s+[₹$]?\s*(\d+(?:\.\d+)?)/,/came\s+to\s+[₹$]?\s*(\d+(?:\.\d+)?)/,/cost(?:s|ed)?\s+(?:me\s+)?[₹$]?\s*(\d+(?:\.\d+)?)/,/dropped\s+[₹$]?\s*(\d+(?:\.\d+)?)/,/blew\s+[₹$]?\s*(\d+(?:\.\d+)?)/,/forked\s+out\s+[₹$]?\s*(\d+(?:\.\d+)?)/,/coughed\s+up\s+[₹$]?\s*(\d+(?:\.\d+)?)/,/in\s+the\s+hole\s+(?:for\s+)?[₹$]?\s*(\d+(?:\.\d+)?)/,/(\d+(?:\.\d+)?)\s+in\s+the\s+hole/,/(?:sent|transferred|wired|gave)\s+(?:me\s+)?[₹$]?\s*(\d+(?:\.\d+)?)/,/[₹$]?\s*(\d+(?:\.\d+)?)\s+purchase/,/loan\s+of\s+[₹$]?\s*(\d+(?:\.\d+)?)/,/borrowed\s+[₹$]?\s*(\d+(?:\.\d+)?)/];
  for(const re of slangs){const x=t.match(re);if(x)return Math.round(parseFloat(x[1]));}
  // contextual pattern — but skip tiny numbers (1-9) to avoid "for 2 people" grabbing 2 instead of the real amount
  const pa=t.match(/\b(?:for|at|worth|of|costing|paid|spent|received|got|send|sent)\s+[₹$]?\s*(\d+(?:\.\d+)?)\b/);
  if(pa&&parseFloat(pa[1])>=10)return Math.round(parseFloat(pa[1]));
  const cn=t.match(/[₹$]\s*(\d+(?:\.\d+)?)/);
  if(cn)return Math.round(parseFloat(cn[1]));
  const all=[...t.matchAll(/\b(\d+(?:\.\d+)?)\b/g)].map(m=>parseFloat(m[1])).filter(n=>n>0);
  if(!all.length)return null;
  return Math.round(Math.max(...all));
}
function buildNote(text){
  let t=text.replace(/^scott[,.\s]*/i,'').replace(/\b(i\s+)?(bought|purchased|got|received|paid|spent|earned|ordered|grabbed|picked\s+up|gave|tipped|donated|subscribed|renewed|recharged|filled|ate|dined|swiped|shed|bagged|won|invested\s+in|put\s+into|dropped|shelled\s+out|blew|forked\s+out|coughed\s+up|took\s+a?\s+loan\s+of?|borrowed|sold|used|sent|transferred|wired)\s*/i,'').replace(/set\s+(?:me\s+)?back\s+/i,'').replace(/shell(?:ed)?\s+out\s+/i,'').replace(/came\s+to\s+/i,'').replace(/\b(?:for|at|worth|costing)\s+[₹$]?[\d,.]+\s*(?:crore|cr|lakh|lac|million|thousand|k)?\b/gi,'').replace(/[₹$][\d,.]+\s*(?:crore|cr|lakh|lac|million|thousand|k)?\b/gi,'').replace(/\b[\d,.]+\s*(?:crore|cr|lakh|lac|million|thousand|k)\b/gi,'').replace(/\b\d+(?:\.\d+)?\b/g,'').replace(/\b(a|an|the|some|few|my|his|her|their|our|me|old|new|that|this)\b/gi,'').replace(/\s{2,}/g,' ').trim();
  // Strip leading prepositions: 'for gym' → 'gym', 'on clothes' → 'clothes'
  t = t.replace(/^(for|on|at|of|from|to|in|with)\s+/i, '').trim();
  return t||text.replace(/^scott[,.\s]*/i,'').trim();
}
function splitClauses(text){
  const parts=text.split(/\s+but\s+|\s+and\s+also\s+|\s+also\s+|\s+meanwhile\s+|\s+while\s+/i);
  if(parts.length>1&&parts.every(p=>p.trim().length>3))return parts.map(p=>p.trim());
  return[text];
}
const CONSUMED_SERVICES=/\b(gym\s*membership|membership|subscription|insurance|haircut|salon|massage|spa|consultation|class|course|coaching|tuition|recharge|ticket|pass|entry\s*fee|service\s*charge|maintenance\s*fee|annual\s*fee|processing\s*fee)\b/i;
const OWNED_THINGS=/\b(shares?|stocks?|equity|mutual\s*fund|mf\b|sip\b|elss|index\s*fund|etf\b|bitcoin|btc|ethereum|eth|crypto|nft|property|land|plot|flat|house|apartment|villa|bungalow|real\s*estate|gold|silver|sgb|sovereign\s*gold|digital\s*gold|fixed\s*deposit|fd\b|recurring\s*deposit|rd\b|ppf|nps|epf|scooter|motorcycle|activa|splendor|two\s*wheeler|car\b|suv|sedan|four\s*wheeler|vehicle|automobile|laptop|macbook|computer|desktop|ipad|tablet|iphone|smartphone|mobile\s*phone|phone\b|android|samsung|oneplus|pixel\b|refrigerator|washing\s*machine|air\s*conditioner|television|tv\b|furniture|sofa|bed|mattress|watch|jewellery|jewelry|ring|necklace|bracelet|camera|drone|monitor|headphones|airpods|earbuds)\b/i;
const CONSUMED_THINGS=/\b(petrol|diesel|fuel|cng|groceries|grocery|vegetables|veggies|fruits|milk|eggs|bread|bananas?|chai|tea|coffee|snack|biscuit|pizza|burger|biryani|dosa|meal|lunch|dinner|breakfast|dining|eating\s*out|rent\b|electricity|water\s*bill|gas\s*cylinder|lpg|internet|wifi|broadband|mobile\s*bill|postpaid|prepaid|recharge|netflix|neflix|spotfy|hotstar|amazon\s*prime|youtube\s*premium|medicine|capsule|pharmacy|uber|ola|rapido|auto\s*fare|cab\s*fare|metro|bus\s*fare|train\s*fare|flight\s*ticket|toll|parking|donation|charity|school\s*fee|college\s*fee|exam\s*fee|outing|picnic|subscription\s*for)\b/i;
const LIABILITY_SIGNALS=/\b(emi\b|home\s*loan|car\s*loan|personal\s*loan|education\s*loan|business\s*loan|credit\s*card|cc\s*bill|cc\s*due|mortgage|loan\s*repayment|borrowed|owe\b|debt\b|outstanding|simpl\b|lazypay|bnpl|buy\s*now\s*pay\s*later|amazon\s*pay\s*later|flipkart\s*pay\s*later|zomato\s*pay\s*later|olamoney\s*postpaid|paytm\s*postpaid|slice\b|kreditbee|cashe\b|niro\b|in\s*the\s*hole|took\s*a\s*loan|take\s*a\s*loan|took\s*loan|got\s*a\s*loan|got\s*loan|took\s*out\s*a?\s*loan|used\s*(my\s*)?credit\s*card|loan\s*from|lent\s*me|lend\s*me|on\s*(no[\s-]cost|zero[\s-]cost|0%)\s*emi|no[\s-]cost\s*emi|zero[\s-]cost\s*emi|two[\s-]wheeler\s*loan|bike\s*loan|scooter\s*loan|gold\s*loan|medical\s*loan|travel\s*loan|overdraft|no\s*cost\s*emi)\b/i;
const LIQUIDATION_VERBS=/\b(sold|redeemed|withdrew|liquidated|cashed\s*out|encashed|sold\s*off)\b/i;
const INCOME_SIGNALS=/\b(salary|salry|stipend|bonus|dividend|interest\s*received|rent\s*received|royalty|pension|commission|freelance|consulting\s*fee|project\s*payment|tax\s*refund|cashback|gift\s*money|birthday\s*money|reimbursement|prize|reward|got\s*paid|credited|sent\s*me|wired\s*me|transferred\s*to\s*me|gave\s*me|dad\s*sent|mom\s*sent|friend\s*sent|bhai\s*sent|client\s*paid|client\s*sent|employer\s*paid|raise|increment|appraisal\s*hike|salary\s*hike|income)\b/i;
const EXPENSE_SLANG=/\b(spent|paid\s*for|swiped|shelled?\s*out|forked\s*out|coughed\s*up|blew\b|set\s*me\s*back|came\s*to|shell\s*out|donated|subscribed|recharged|tipped|gave\s*away|splurged|burned|dropped\s*on|wasted\s*on)\b/i;
function detectType(text){
  const t=text.toLowerCase();
  const hasAmt=!!parseAmount(text);

  // Repair/maintenance signals — prevent OWNED_THINGS from triggering asset
  const REPAIR=/\b(repair|fix(?:ing|ed)?|service|servicing|maintenance|replaced|broke|broken|damage|patch)\b/i;

  // EMI/loan PAYMENT is an expense — must beat LIABILITY_SIGNALS
  if(/\b(paid|paying|pay|cleared|repaid|repaying)\s*(my\s*|the\s*)?(emi|instalment|installment|loan\s*(repayment|emi|payment)|credit\s*card\s*(bill|due|payment)|cc\s*(bill|due|payment)|home\s*loan\s*emi|car\s*loan\s*emi|personal\s*loan\s*emi)\b/i.test(t)) return 'expense';

  // Liability always before income/expense checks
  if(LIABILITY_SIGNALS.test(t))return"liability";
  if(LIQUIDATION_VERBS.test(t))return"income";
  
  // Income signals — must beat "paid/gave" verb checks below
  if(INCOME_SIGNALS.test(t))return"income";
  
  // "gave me" pattern (Mom gave me / friend gave me) = income
  if(/\bgave\s+me\b/.test(t)&&hasAmt)return"income";
  
  // Gym/fitness standalone
  if(/\b(gym|fitness|yoga|zumba|pilates|crossfit|workout)\b/.test(t)&&hasAmt)return"expense";
  
  // Investment keywords
  if(/\b(invest(?:ed|ing|ment)?|sip\b|portfolio|mutual\s*funds?|stocks?|crypto|gold\b|fd\b|ppf\b|nps\b)\b/.test(t)&&hasAmt&&!LIABILITY_SIGNALS.test(t))return"asset";
  
  // Consumed services
  if(CONSUMED_SERVICES.test(t))return"expense";
  
  // Owned things — but NOT if "repair/service" context (phone repair ≠ buying a phone)
  if(OWNED_THINGS.test(t)&&!CONSUMED_THINGS.test(t)&&!REPAIR.test(t))return"asset";
  if(CONSUMED_THINGS.test(t))return"expense";
  if(EXPENSE_SLANG.test(t))return"expense";
  
  // "paid" is tricky — "client paid [me]" = income, "I paid" = expense
  if(/\bclient\s+paid\b/.test(t))return"income";
  
  // Gift-giving context — "gift for X", "birthday gift", "present for"
  if(/\b(gift\s+for|birthday\s+gift|present\s+for|anniversary\s+gift|wedding\s+gift|gifted\s+to)\b/.test(t)&&hasAmt)return"expense";
  
  // Expense verbs — but "got a raise/bonus/salary/commission" should NOT be expense
  const INCOME_NOUNS=/\b(raise|raise|increment|salary|bonus|dividend|commission|cashback|refund|reward|prize|gift|tip\s+received)\b/i;
  if(/\b(bought|purchased|paid|gave|ordered|grabbed|ate|dined)\b/.test(t)&&!INCOME_SIGNALS.test(t))return"expense";
  // "got a" only when followed by owned/consumed thing, not income nouns
  if(/\bgot\s+a\b/.test(t)&&!INCOME_SIGNALS.test(t)&&!INCOME_NOUNS.test(t))return"expense";
  
  if(/\b(sent\s+to|transferred\s+to|wired\s+to|gave\s+to|sending\s+to|transfer\s+to|give\s+to)\b/.test(t)&&hasAmt)return"expense";
  if(/\b(got|received|sends?\s+me|gives?\s+me)\b/.test(t)&&hasAmt)return"income";
  if(/\b(cash\s*in\s*hand|cash\s*on\s*hand|kept\s*cash|have\s*cash|holding\s*cash)\b/.test(t))return"asset";
  
  // Last resort category matching
  if(/\b(rent|electricity|internet|groceries|medicine|doctor|petrol|fuel|coffee|chai|dining|food|meal|lunch|dinner|clothes|salon|haircut|book|course|movie|netflix|spotify|recharge|bill|subscription|gift|donation)\b/.test(t)&&hasAmt)return"expense";
  
  // Case 3: user gives a TYPE clarification word after Scott asked for clarification
  const TYPE_WORD = /^\s*(expense|income|investment|asset|liability)s?\s*$/i;
  if (TYPE_WORD.test(t)) {
    // Look for a recent amount in the last 2 messages
    for (let i = CTX.history.length - 1; i >= Math.max(0, CTX.history.length - 2); i--) {
      const prev = CTX.history[i];
      if (prev && prev.parsed && prev.parsed.amount && Date.now() - prev.ts < 60000) {
        const typeMap = { expense: 'expense', income: 'income', investment: 'asset', asset: 'asset', liability: 'liability' };
        const txnType = typeMap[t.trim().toLowerCase().replace('s','')] || 'expense';
        const cat = detectCategory(prev.text || '', txnType);
        return { type: txnType, amount: prev.parsed.amount, ...cat, note: prev.parsed.note || buildNote(prev.text || '') };
      }
    }
  }

  return null;
}
const EC=[{c:"food",s:"groceries",r:/\b(grocery|groceries|supermarket|bigbasket|blinkit|zepto|zepto|kirana|ration|dal|rice|atta|flour|oil|masala|spice)\b/i},{c:"food",s:"dining_out",r:/\b(restaurant|dine|dining|dining\s*out|eating\s*out|ate\s*out|cafe|zomato|swiggy|food\s*delivery|biryani|pizza|burger|dosa|idli|thali|paratha|noodles)\b/i},{c:"food",s:"fruits_veggies",r:/\b(banana|apple|mango|orange|fruits?|vegetables?|veggies?|sabzi|tomato|onion|potato|leafy|spinach|cucumber|carrot|broccoli)\b/i},{c:"food",s:"snacks",r:/\b(snack|biscuit|chips|namkeen|chocolate|candy|mithai|bakery|maggi)\b/i},{c:"food",s:"chai_coffee",r:/\b(chai|tea|coffee|cappuccino|latte)\b/i},{c:"food",s:"milk_dairy",r:/\b(milk|curd|paneer|ghee|butter|cheese|dairy)\b/i},{c:"food",s:"delivery_tip",r:/\b(delivery\s*guy|delivery\s*boy|tip\b|tipped|bhaiya)\b/i},{c:"transport",s:"fuel",r:/\b(petrol|diesel|fuel|cng|filling)\b/i},{c:"transport",s:"cab",r:/\b(uber|ola|rapido|cab|taxi|auto|rickshaw)\b/i},{c:"transport",s:"metro_bus",r:/\b(metro|bus\s*fare|ksrtc|msrtc|tube)\b/i},{c:"transport",s:"train",r:/\b(train|railway|irctc|tatkal)\b/i},{c:"transport",s:"flight",r:/\b(flight|airline|airfare|indigo|air\s*india|spicejet|plane)\b/i},{c:"transport",s:"toll_parking",r:/\b(toll|fastag|parking)\b/i},{c:"transport",s:"servicing",r:/\b(servicing|mechanic|tyre|oil\s*change)\b/i},{c:"health",s:"gym_fitness",r:/\b(gym|fitness|workout|crossfit|yoga|zumba|membership)\b/i},{c:"health",s:"medicine",r:/\b(medicine|capsule|syrup|pharmacy|chemist|1mg|netmeds|apollo)\b/i},{c:"health",s:"doctor",r:/\b(doctor|physician|clinic|consultation|checkup|hospital|dentist|specialist)\b/i},{c:"health",s:"supplements",r:/\b(protein|whey|supplement|vitamin|creatine|bcaa|omega)\b/i},{c:"utilities",s:"electricity",r:/\b(electricity|electric\s*bill|power\s*bill|bescom|msedcl)\b/i},{c:"utilities",s:"internet",r:/\b(internet|wifi|broadband|jio\s*fiber|airtel\s*fiber)\b/i},{c:"utilities",s:"mobile",r:/\b(recharge|mobile\s*bill|postpaid|prepaid|jio|airtel|vodafone)\b/i},{c:"utilities",s:"gas",r:/\b(lpg|gas\s*cylinder|cooking\s*gas|indane|hp\s*gas|bharat\s*gas)\b/i},{c:"utilities",s:"rent",r:/\b(rent\b|landlord|pg\b|paying\s*guest|hostel)\b/i},{c:"entertainment",s:"streaming",r:/\b(netflix|neflix|nettflix|amazon\s*prime|hotstar|disney|zee5|sony\s*liv|jiocinema|youtube\s*premium|spotify|spotfy|spotify\s*premium|apple\s*music|prime\s*video)\b/i},{c:"entertainment",s:"movies",r:/\b(movie|film|cinema|theatre|bookmyshow|pvr|inox)\b/i},{c:"entertainment",s:"gaming",r:/\b(game|gaming|steam|playstation|xbox|bgmi|pubg|valorant)\b/i},{c:"entertainment",s:"outing",r:/\b(dinner\s*with|outing|party|celebration|treat\b|get\s*together)\b/i},{c:"education",s:"courses",r:/\b(udemy|coursera|skillshare|unacademy|byjus|vedantu|masterclass|course\s*fee)\b/i},{c:"education",s:"books",r:/\b(book\b|textbook|novel|kindle)\b/i},{c:"education",s:"fees",r:/\b(school\s*fee|college\s*fee|tuition|coaching|exam\s*fee|admission)\b/i},{c:"shopping",s:"clothing",r:/\b(clothes|shirt|jeans|tshirt|kurta|saree|dress|shoes|sneakers|jacket|myntra|ajio|zara)\b/i},{c:"shopping",s:"personal_care",r:/\b(shampoo|soap|facewash|moisturizer|perfume|deodorant|salon|haircut|spa|nykaa)\b/i},{c:"finance",s:"insurance_premium",r:/\b(insurance\s*premium|policy\s*premium|lic\s*premium|term\s*plan)\b/i},{c:"finance",s:"tax",r:/\b(income\s*tax|gst|tds|advance\s*tax)\b/i},{c:"social",s:"gifts",r:/\b(gift\b|present\b|birthday\s*gift|wedding\s*gift|sent\s+to|transferred\s+to|gave\s+to)\b/i},{c:"social",s:"donation",r:/\b(donate|donation|charity|ngo|temple|church|mosque|gurudwara)\b/i}];
const IC=[{c:"active_income",s:"salary",r:/\b(salary|paycheck|ctc|monthly\s*pay|stipend)\b/i},{c:"active_income",s:"bonus",r:/\b(bonus|incentive|appraisal|hike)\b/i},{c:"active_income",s:"freelance",r:/\b(freelance|contract|gig|fiverr|upwork|project\s*payment|client\s*paid)\b/i},{c:"active_income",s:"consulting",r:/\b(consult|consulting|advisory)\b/i},{c:"active_income",s:"business",r:/\b(business\s*income|profit|revenue|sales\s*income)\b/i},{c:"passive_income",s:"dividends",r:/\b(dividend)\b/i},{c:"passive_income",s:"interest",r:/\b(interest\s*received|fd\s*interest|savings\s*interest)\b/i},{c:"passive_income",s:"rental_income",r:/\b(rent\s*received|rental\s*income|tenant)\b/i},{c:"passive_income",s:"capital_gains",r:/\b(sold\s*shares|sold\s*stocks|sold\s*mutual|redeemed|capital\s*gain)\b/i},{c:"passive_income",s:"asset_sale",r:/\b(sold\s*my|sold\s*old|sold\s*the)\b/i},{c:"windfall",s:"gift_received",r:/\b(gift\s*received|gifted|birthday\s*money|cash\s*gift|diwali\s*bonus|dad\s*sent|mom\s*sent|friend\s*sent|bhai\s*sent|sent\s*me|wired\s*me)\b/i},{c:"windfall",s:"cashback_refund",r:/\b(cashback|cash\s*back|refund|reimbursement)\b/i},{c:"windfall",s:"prize_reward",r:/\b(won|prize|reward|lottery|competition)\b/i}];
const AC=[{c:"investments",s:"stocks",r:/\b(shares?|stocks?|equity|nse|bse)\b/i},{c:"investments",s:"mutual_fund",r:/\b(mutual\s*funds?|mf\b|sip\b|elss|index\s*fund|etf\b)\b/i},{c:"investments",s:"fixed_deposit",r:/\b(fixed\s*deposit|fd\b|recurring\s*deposit|rd\b)\b/i},{c:"investments",s:"ppf_nps_epf",r:/\b(ppf|nps|epf)\b/i},{c:"investments",s:"real_estate",r:/\b(property|land|plot|flat|house|apartment|villa|bungalow)\b/i},{c:"crypto",s:"bitcoin",r:/\b(bitcoin|btc)\b/i},{c:"crypto",s:"ethereum",r:/\b(ethereum|eth)\b/i},{c:"crypto",s:"altcoin",r:/\b(crypto|coin|token|binance|wazirx)\b/i},{c:"precious_metals",s:"gold",r:/\b(gold|sgb|sovereign\s*gold|digital\s*gold)\b/i},{c:"precious_metals",s:"silver",r:/\bsilver\b/i},{c:"precious_metals",s:"watch_jewelry",r:/\b(watch|jewellery|jewelry|ring|necklace|bracelet)\b/i},{c:"depreciating_assets",s:"two_wheeler",r:/\b(scooter|motorcycle|bike|activa|splendor|two\s*wheeler)\b/i},{c:"depreciating_assets",s:"car",r:/\b(car\b|suv|sedan|four\s*wheeler|automobile)\b/i},{c:"depreciating_assets",s:"laptop",r:/\b(laptop|macbook|computer|desktop)\b/i},{c:"depreciating_assets",s:"smartphone",r:/\b(iphone|smartphone|mobile\s*phone|phone\b|android|oneplus|samsung\s*phone|pixel\b|realme|redmi|poco\b)\b/i},{c:"depreciating_assets",s:"appliances",r:/\b(refrigerator|washing\s*machine|air\s*conditioner|tv\b|television)\b/i},{c:"depreciating_assets",s:"camera_drone",r:/\b(camera|drone|gopro)\b/i},{c:"liquid_assets",s:"cash_in_hand",r:/\b(cash\s*in\s*hand|cash\s*on\s*hand|kept\s*cash|holding\s*cash)\b/i},{c:"liquid_assets",s:"savings_account",r:/\b(savings\s*account|current\s*account|deposited\s*in\s*bank)\b/i}];
const LC=[
  // ── Secured long-term loans ─────────────────────────────────────────────
  {c:"secured_loans",s:"home_loan",r:/\b(home\s*loan|house\s*loan|mortgage|housing\s*loan|property\s*loan|flat\s*loan|apartment\s*loan|construction\s*loan|pradhan\s*mantri\s*awas|pmay|home\s*finance)\b/i},
  {c:"secured_loans",s:"car_loan",r:/\b(car\s*loan|vehicle\s*loan|auto\s*loan|car\s*emi|four\s*wheeler\s*loan|automobile\s*loan|car\s*finance|vehicle\s*finance)\b/i},
  {c:"secured_loans",s:"two_wheeler_loan",r:/\b(bike\s*loan|scooter\s*loan|two[\s-]wheeler\s*loan|motorcycle\s*loan|activa\s*loan|two[\s-]wheeler\s*emi|bike\s*emi|scooty\s*loan)\b/i},
  {c:"secured_loans",s:"gold_loan",r:/\b(gold\s*loan|pledged\s*gold|gold\s*mortgage|muthoot|manappuram|iifl\s*gold|gold\s*ornament\s*loan)\b/i},
  {c:"secured_loans",s:"loan_against_property",r:/\b(loan\s*against\s*property|lap\s*loan|property\s*mortgage|pledged\s*property|property\s*backed\s*loan)\b/i},
  {c:"secured_loans",s:"loan_against_securities",r:/\b(loan\s*against\s*(shares|securities|mutual\s*fund|demat)|pledged\s*shares|share\s*backed\s*loan)\b/i},
  // ── Unsecured personal & institutional loans ────────────────────────────
  {c:"unsecured_loans",s:"personal_loan",r:/\b(personal\s*loan|took\s*a\s*loan|take\s*a\s*loan|got\s*a\s*loan|got\s*loan|took\s*out\s*a?\s*loan|cash\s*loan|consumer\s*loan|salary\s*loan|instant\s*loan|quick\s*loan|tata\s*capital|bajaj\s*finserv\s*loan|hdfc\s*loan|sbi\s*personal|icici\s*loan|axis\s*loan|kotak\s*loan|indifi|moneyview|kreditbee\s*loan|cashe\s*loan|navi\s*loan)\b/i},
  {c:"unsecured_loans",s:"education_loan",r:/\b(education\s*loan|student\s*loan|college\s*loan|university\s*loan|study\s*loan|vidya\s*lakshmi|academic\s*loan|abroad\s*study\s*loan|overseas\s*education\s*loan)\b/i},
  {c:"unsecured_loans",s:"business_loan",r:/\b(business\s*loan|msme\s*loan|working\s*capital\s*loan|term\s*loan|mudra\s*loan|startup\s*loan|small\s*business\s*loan|merchant\s*loan|udyam\s*loan|sme\s*loan)\b/i},
  {c:"unsecured_loans",s:"medical_loan",r:/\b(medical\s*loan|health\s*loan|hospital\s*loan|treatment\s*loan|surgery\s*loan|healthcare\s*finance)\b/i},
  {c:"unsecured_loans",s:"travel_loan",r:/\b(travel\s*loan|vacation\s*loan|holiday\s*loan|trip\s*loan|travel\s*finance)\b/i},
  {c:"unsecured_loans",s:"overdraft",r:/\b(overdraft|od\s*facility|bank\s*overdraft|cash\s*credit|cc\s*limit\s*used|overdraft\s*used)\b/i},
  // ── Consumer credit & EMI ───────────────────────────────────────────────
  {c:"consumer_credit",s:"phone_emi",r:/\b(phone\s*emi|iphone\s*emi|samsung\s*emi|oneplus\s*emi|pixel\s*emi|smartphone\s*emi|mobile\s*emi|bought\s*.*\s*phone.*emi|phone.*no[\s-]cost\s*emi)\b/i},
  {c:"consumer_credit",s:"laptop_emi",r:/\b(laptop\s*emi|macbook\s*emi|dell\s*emi|hp\s*emi|lenovo\s*emi|asus\s*emi|computer\s*emi|bought\s*.*laptop.*emi)\b/i},
  {c:"consumer_credit",s:"appliance_emi",r:/\b(tv\s*emi|ac\s*emi|fridge\s*emi|washing\s*machine\s*emi|appliance\s*emi|refrigerator\s*emi|air\s*conditioner\s*emi|consumer\s*durable\s*emi)\b/i},
  {c:"consumer_credit",s:"gadget_emi",r:/\b(ipad\s*emi|tablet\s*emi|watch\s*emi|camera\s*emi|airpods\s*emi|headphone\s*emi|gadget\s*emi|electronics\s*emi|no[\s-]cost\s*emi|zero[\s-]cost\s*emi)\b/i},
  {c:"consumer_credit",s:"credit_card_due",r:/\b(credit\s*card|cc\s*bill|cc\s*due|used\s*credit\s*card|swiped\s*credit|credit\s*limit|outstanding\s*on\s*card|card\s*due|card\s*bill|hdfc\s*credit|icici\s*credit|sbi\s*card|axis\s*card|amex|citi\s*card)\b/i},
  {c:"consumer_credit",s:"bnpl",r:/\b(simpl|lazypay|bnpl|buy\s*now\s*pay\s*later|slice\b|uni\s*card|kreditbee|cashe|niro|paytm\s*postpaid|amazon\s*pay\s*later|flipkart\s*pay\s*later|zomato\s*pay\s*later|olamoney\s*postpaid)\b/i},
  // ── Informal & peer debts ───────────────────────────────────────────────
  {c:"informal_debts",s:"borrowed_from_friend",r:/\b(borrowed\s*from\s*(friend|buddy|yaar|dost|mate)|friend\s*(gave|lent|loan|me\s*money)|loan\s*from\s*(a\s*)?(friend|buddy|classmate)|dost\s*se\s*liya|yaar\s*ne\s*diya|roommate\s*(gave|lent)|colleague\s*lent|lending\s*me)\b/i},
  {c:"informal_debts",s:"borrowed_from_family",r:/\b(borrowed\s*from\s*(family|parents?|dad|mom|bhai|didi|brother|sister|sis|uncle|aunt|nana|nani|dada|dadi|chacha|mama|mausi)|family\s*(gave|lent|loan)|ghar\s*se\s*liya|dad\s*(gave|lent)|mom\s*(gave|lent)|parents?\s*(gave|lent)|brother\s*(gave|lent|lend|loan)|sister\s*(gave|lent|lend))\b/i},
  {c:"informal_debts",s:"peer_lending_app",r:/\b(owe\b|in\s*the\s*hole|due\s*to\s*friend|need\s*to\s*pay\s*back|borrowed\b|lent\s*me)\b/i},
];
function detectCategory(text,type){
  const rules=type==="expense"?EC:type==="income"?IC:type==="asset"?AC:LC;
  for(const{c,s,r}of rules){if(r.test(text))return{main_category:c,sub_category:s};}
  const t=text.toLowerCase();
  const noun=t.match(/\b(?:on|for|at|in|into|of)\s+(?:a\s+|an\s+|the\s+)?([a-z]+(?:\s+[a-z]+)?)/);
  const sub=noun?noun[1].trim().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,''):"general";
  return{main_category:{expense:"misc",income:"other",asset:"other",liability:"other"}[type]||"misc",sub_category:sub};
}
function parseTransaction(text){
  const amount=parseAmount(text);if(!amount)return null;
  const type=detectType(text);if(!type)return null;
  const{main_category,sub_category}=detectCategory(text,type);
  return{type,amount,main_category,sub_category,note:buildNote(text)};
}
function parseAll(text){return splitClauses(text).map(c=>parseTransaction(c)).filter(Boolean);}
function fmt(n){return Number(n).toLocaleString('en-IN');}
function humanize(s){return(s||'').replace(/_/g,' ');}
function rand(arr){return arr[Math.floor(Math.random()*arr.length)];}
const REPLIES={
  expense:[(c,s,a,n)=>`Duly noted, Sir. \u20b9${fmt(a)} for ${n} recorded under ${humanize(c)} \u2014 ${humanize(s)}.`,(c,s,a,n)=>`Of course, Master Sanket. ${n} at \u20b9${fmt(a)}, filed under ${humanize(c)}. Consumption acknowledged.`,(c,s,a,n)=>`Recorded, Sir. \u20b9${fmt(a)} on ${n}. The harvest diminishes, though the estate endures.`,(c,s,a,n)=>`As you instruct. \u20b9${fmt(a)} \u2014 ${humanize(s)} under ${humanize(c)} \u2014 entered accordingly.`],
  income:[(c,s,a,n)=>`Splendid news, Master Sanket. \u20b9${fmt(a)} in ${humanize(s)} credited to the estate.`,(c,s,a,n)=>`Excellent, Sir. \u20b9${fmt(a)} received \u2014 entered into ${humanize(c)} with pleasure.`,(c,s,a,n)=>`A welcome inflow, Master Sanket. \u20b9${fmt(a)} — ${n} — duly noted.`],
  asset:[(c,s,a,n)=>`A fine acquisition, Master Sanket. ${n} at \u20b9${fmt(a)} added to holdings under ${humanize(c)}.`,(c,s,a,n)=>`Prudent as ever, Sir. \u20b9${fmt(a)} in ${humanize(s)} now stands among your assets.`,(c,s,a,n)=>`Recorded in the asset ledger, Sir. ${n} at \u20b9${fmt(a)} \u2014 a sound addition.`],
  liability:[(c,s,a,n)=>`Noted, Sir. \u20b9${fmt(a)} under ${humanize(s)} entered as a liability. A gentleman's debt is managed promptly.`,(c,s,a,n)=>`The \u20b9${fmt(a)} ${humanize(s)} obligation is now recorded, Master Sanket.`,(c,s,a,n)=>`Recorded, Sir. \u20b9${fmt(a)} owed under ${humanize(c)}. The neighbouring kingdom shall be paid in due course.`],
  confused:["I'm afraid I couldn't identify both an amount and a transaction in that, Sir. Might you rephrase?","Forgive me, Master Sanket \u2014 I caught the intent but not the figures. Could you include the amount?","My records require a sum, Sir. Do elaborate with the figure in question.","An intriguing statement, Sir, but the ledger needs a number to proceed. Might you oblige?"]
};
function generateReply(txn){
  if(!txn)return rand(REPLIES.confused);
  const{type,amount,main_category:c,sub_category:s,note:n}=txn;
  return rand(REPLIES[type]||REPLIES.confused)(c,s,amount,n);
}

// ── CONVERSATION CONTEXT ENGINE ────────────────────────────────────────────
// Keeps a rolling window of the last 5 user messages + what scott detected
const CTX = {
  history: [], // [{text, parsed, intent, ts}]
  pending: null, // {type:'awaiting_amount'|'awaiting_type', partial:{}} 
};

function ctxPush(text, parsed, intent) {
  CTX.history.push({ text, parsed, intent, ts: Date.now() });
  if (CTX.history.length > 5) CTX.history.shift();
}

// Extract just what type/category we last talked about (for follow-up detection)
function ctxLastCategory() {
  for (let i = CTX.history.length - 1; i >= 0; i--) {
    const h = CTX.history[i];
    if (h.parsed) return { type: h.parsed.type, sub: h.parsed.sub_category, main: h.parsed.main_category };
  }
  return null;
}

// Try to resolve an ambiguous message using context
function resolveWithContext(text) {
  const t = text.toLowerCase().trim();
  const amount = parseAmount(text);
  const BARE_NUM = /^\s*[₹$]?\s*[\d.,]+\s*(k|lakh|lac|cr|crore|m)?\s*$/;

  // Case 1 (HIGHEST PRIORITY): explicit pending — Scott asked for amount, user replied
  if (CTX.pending && CTX.pending.type === 'awaiting_amount' && amount && BARE_NUM.test(t)) {
    const partial = CTX.pending.partial;
    CTX.pending = null;
    return { ...partial, amount };
  }

  // Case 2: bare number with NO pending — continue last EXACT category (e.g. another petrol)
  // Only trigger if CTX.pending is null AND the same category was logged recently (< 60s)
  if (!CTX.pending && amount && BARE_NUM.test(t)) {
    const last = ctxLastCategory();
    if (last) {
      const lastEntry = CTX.history[CTX.history.length - 1];
      if (lastEntry && Date.now() - lastEntry.ts < 60000) {
        return { type: last.type, amount, main_category: last.main, sub_category: last.sub, note: 'continuation' };
      }
    }
  }

  return null;
}

// Smart disambiguation — what to ask when we can't parse
function smartDisambiguate(text) {
  const t = text.toLowerCase().trim();
  const amount = parseAmount(text);
  const type = detectType(text);

  // Known investment/finance keyword alone → ask for amount
  const INVEST_KW = /\b(invest(?:ment|ed|ing)?|sip\b|stocks?|shares?|mutual\s*funds?|crypto|gold\b|fd\b|ppf\b|nps\b|mf\b|portfolio|endowment|fortress)\b/i;
  if (!amount && INVEST_KW.test(t)) {
    CTX.pending = { type: 'awaiting_amount', partial: { type: 'asset', main_category: 'investments', sub_category: 'general', note: text.trim() } };
    return `The Fortress awaits a figure, Sir. How much are you deploying?`;
  }

  // Known expense-category keyword alone → infer type, ask for amount
  const EXPENSE_KW = /\b(gym|yoga|fitness|pilates|zumba|groceries?|grocery|petrol|diesel|fuel|rent\b|electricity|medicine|medicines|doctor|netflix|neflix|spotify|dining|restaurant|cafe|movie|cinema|flight|uber|ola|metro|bus\s*fare|recharge|haircut|salon|clothes|clothing|course|donation|gym\s*membership|subscription)\b/i;
  if (!amount && !type && EXPENSE_KW.test(t)) {
    const cat = detectCategory(text, 'expense');
    CTX.pending = { type: 'awaiting_amount', partial: { type: 'expense', ...cat, note: text.trim() } };
    return `Noted, Sir — ${humanize(cat.sub_category)}. Might you state the amount?`;
  }

  // Has a type but no amount → ask for amount
  if (type && !amount) {
    const typeLabels = { expense: 'expenditure', income: 'income', asset: 'asset purchase', liability: 'liability' };
    const categoryHint = detectCategory(text, type);
    const catName = humanize(categoryHint.sub_category);
    CTX.pending = { type: 'awaiting_amount', partial: { type, ...categoryHint, note: buildNote(text) } };
    return `Noted, Sir — ${catName !== 'general' ? catName : typeLabels[type]}. Might you state the amount?`;
  }

  // Has an amount but no type → ask for clarification
  if (amount && !type) {
    return `₹${fmt(amount)} noted, Sir. Could you clarify — was that an expense, income, or an investment?`;
  }

  // Graceful catch-all — don't mention last category, it was confusing
  const catchAlls = [
    "I'm with you, Sir, but I need a little more to work with. Try: 'Spent 500 on lunch' or 'Got salary 60k'.",
    "My records require both a sum and a transaction, Sir. Something like 'Paid 1200 for gym' would do nicely.",
    "Forgive me, Master Sanket — could you rephrase with an amount and what it was for?",
  ];
  return rand(catchAlls);
}

const ST=[
  {r:/\b(hello|hi\b|hey\b|good\s*morning|good\s*evening|good\s*night|good\s*day)\b/i,fn:()=>rand(["At your service, Master Sanket. The ledger is open.","Good to hear from you, Sir. Shall we attend to the accounts?","Always present, Sir. How may the estate be served?"])},
  {r:/\b(thank|thanks|great\s*job|well\s*done|good\s*job|amazing|excellent|brilliant|perfect|nice|cheers|splendid|superb|outstanding|bravo)\b/i,fn:()=>rand(["You are most gracious, Sir. I merely perform my duties.","Thank you, Master Sanket. Your approval is the finest reward.","Most kind, Sir. Shall we continue?","The estate is in capable hands, Sir."])},
  {r:/\b(sup\b|yo\b|wassup|what'?s\s*up|howdy)\b/i,fn:()=>rand(["At your service, Sir. The ledger awaits.","Present and attentive, Master Sanket.","Ready when you are, Sir."])},
  {r:/\b(okay|ok\b|got\s*it|understood|noted|alright|alr\b|sure|makes\s*sense|sounds\s*good|cool\b)\b/i,fn:()=>rand(["Very good, Sir.","Of course, Master Sanket.","As you wish, Sir."])},
  {r:/\b(how\s*are\s*you|how\s*do\s*you\s*do|you\s*good)\b/i,fn:()=>rand(["In fine form, Sir, thank you. The estate's affairs are my singular concern.","Always well when the accounts are in order, Master Sanket."])},
  {r:/\b(balance|total|summary|net\s*worth)\b/i,fn:()=>"Kindly open The Grand Ledger above, Sir \u2014 a full accounting of all four pillars awaits."},
  {r:/\b(bye|goodbye|see\s*you|take\s*care|farewell|good\s*night|done\s*for\s*(today|now)|that'?s?\s*all|good\s*for\s*now|signing\s*off|ciao)\b/i,fn:()=>rand(["Good evening, Master Sanket. The estate stands ready for your return.","Until next time, Sir. The ledger shall await your return.","Very good, Sir. The accounts are in order."])},
  {r:/\b(can\s*you\s*(invest|trade|buy|sell|transfer|pay)|do\s*it\s*for\s*me|please\s*(invest|buy|sell)|execute|place\s*(a\s*)?trade)\b/i,fn:()=>"My role is to counsel and record, Sir — not to execute. I am the steward, not the broker. The decision and the action remain yours."},
  {r:/\b(help|what\s*can\s*you|how\s*do\s*i|how\s*to|commands?|features?)\b/i,fn:()=>"Simply converse with me naturally, Sir. Log transactions: \u2018Spent 500 on petrol\u2019 or \u2018Got salary 45k\u2019. Ask questions: \u2018Am I on track?\u2019 or \u2018How should I allocate my raise?\u2019. Open Health to see your estate analysis."},
];
function checkSmallTalk(text){for(const{r,fn}of ST){if(r.test(text))return fn();}return null;}

// ── UNDO ENGINE ────────────────────────────────────────────────────────────
// Each undoable exchange gets a groupId. User msg + all Scott replies share it.
let _undoGroupId = null;
const _undoSnapshots = {}; // groupId → { treasury, state, ledger, txns, loans, txn }

function _snapshotForUndo(txn) {
  const gid = _undoGroupId;
  if (!gid) return;
  // Only store first snapshot per group (the state BEFORE the transaction)
  if (_undoSnapshots[gid]) return;
  _undoSnapshots[gid] = {
    treasury : localStorage.getItem('scott_treasury'),
    state    : localStorage.getItem('scott_state'),
    loans    : localStorage.getItem('scott_loans'),
    txns     : localStorage.getItem('scott_transactions'),
    ledger   : JSON.parse(JSON.stringify(ledger)),
    txn,
  };
}

function undoExchange(gid) {
  const snap = _undoSnapshots[gid];
  if (!snap) return;
  // Restore all localStorage
  if (snap.treasury !== null) localStorage.setItem('scott_treasury', snap.treasury);
  else localStorage.removeItem('scott_treasury');
  if (snap.state !== null) localStorage.setItem('scott_state', snap.state);
  else localStorage.removeItem('scott_state');
  if (snap.loans !== null) localStorage.setItem('scott_loans', snap.loans);
  else localStorage.removeItem('scott_loans');
  if (snap.txns !== null) localStorage.setItem('scott_transactions', snap.txns);
  else localStorage.removeItem('scott_transactions');
  // Restore in-memory ledger
  Object.assign(ledger, snap.ledger);
  // Remove all DOM nodes with this groupId
  document.querySelectorAll(`[data-gid="${gid}"]`).forEach(el => {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.2s';
    setTimeout(() => el.remove(), 200);
  });
  // Try to delete from Google Sheet (best-effort)
  if (snap.txn) {
    const params = new URLSearchParams({ action:'delete', datetime: snap.txn._datetime || '', type: snap.txn.type, amount: snap.txn.amount, sub_category: snap.txn.sub_category });
    fetch(APPS_SCRIPT_URL + '?' + params.toString(), { mode:'no-cors' }).catch(()=>{});
  }
  renderTreasury();
  delete _undoSnapshots[gid];
}

// ── TYPEWRITER ENGINE ────────────────────────────────────────────────────
// Streams Scott's replies letter by letter — punctuation pauses give a
// natural cadence. Returns immediately; typing runs asynchronously.
function typeMsg(bubble, text, scrollFn) {
  const lines = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .split('\n');

  bubble.innerHTML = '';

  // Blinking cursor element
  const cursor = document.createElement('span');
  cursor.className = 'msg-cursor';
  bubble.appendChild(cursor);

  let lineIdx = 0, charIdx = 0;
  let span = document.createElement('span');
  bubble.insertBefore(span, cursor);

  function tick() {
    if (lineIdx >= lines.length) {
      cursor.remove(); // typing done — remove cursor
      return;
    }
    const line = lines[lineIdx];
    if (charIdx >= line.length) {
      lineIdx++; charIdx = 0;
      if (lineIdx < lines.length) {
        bubble.insertBefore(document.createElement('br'), cursor);
        span = document.createElement('span');
        bubble.insertBefore(span, cursor);
        if (scrollFn) scrollFn();
        setTimeout(tick, 55);
      } else {
        cursor.remove();
      }
      return;
    }
    const c = line[charIdx++];
    span.textContent += c;
    if (scrollFn) scrollFn();
    const delay = /[.!?…]/.test(c) ? 70 : /[,;:]/.test(c) ? 30 : 13;
    setTimeout(tick, delay);
  }
  tick();
}

function appendMsg(role, text, txn) {
  const chat = document.getElementById('chat');
  const div  = document.createElement('div');
  div.className = 'msg ' + role;

  // Attach groupId so undo can find related nodes
  if (_undoGroupId) div.dataset.gid = _undoGroupId;

  const label = document.createElement('div');
  label.className = 'msg-label';
  label.textContent = role === 'scott' ? 'Scott' : 'Master Sanket';
  div.appendChild(label);

  if (txn && role === 'scott') {
    const tag = document.createElement('div');
    tag.className = 'pillar-tag ' + txn.type;
    tag.textContent = {income:'Income',expense:'Expense',asset:'Asset',liability:'Liability'}[txn.type] || txn.type;
    div.appendChild(tag);
  }

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  if (role === 'scott') {
    typeMsg(bubble, text, () => { chat.scrollTop = chat.scrollHeight; });
  } else {
    bubble.innerHTML = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
  }
  div.appendChild(bubble);

  if (txn) {
    const badge = document.createElement('div');
    badge.className = 'sync-badge';
    badge.textContent = '\u00b7 Updating the ledger\u2026';
    const id = 'b' + Date.now() + Math.random();
    badge.id = id;
    div.dataset.badgeId = id;
    div.appendChild(badge);
  }

  // Undo button — only on user messages that have a transaction
  if (role === 'user' && _undoGroupId) {
    const gid = _undoGroupId;
    const btn = document.createElement('button');
    btn.className = 'undo-btn';
    btn.textContent = 'Undo';
    btn.title = 'Undo this entry and remove it everywhere';
    let hideTimer = null;
    div.addEventListener('mouseenter', () => {
      clearTimeout(hideTimer);
      div.classList.add('undo-visible');
    });
    div.addEventListener('mouseleave', () => {
      hideTimer = setTimeout(() => div.classList.remove('undo-visible'), 500);
    });
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      undoExchange(gid);
    });
    div.appendChild(btn);
  }

  const rule = document.createElement('div');
  rule.className = 'msg-rule';
  div.appendChild(rule);

  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
  return div;
}
function updateBadge(div,state){const b=document.getElementById(div.dataset.badgeId);if(!b)return;b.className='sync-badge '+(state==='ok'?'ok':'err');b.textContent=state==='ok'?'\u00b7 Ledger updated.':'\u00b7 Could not reach the ledger, Sir.';}
function showTyping(){const chat=document.getElementById('chat');const div=document.createElement('div');div.className='msg scott';div.id='typing';const l=document.createElement('div');l.className='msg-label';l.textContent='Scott';const t=document.createElement('div');t.className='typing';t.innerHTML='<span></span><span></span><span></span>';div.appendChild(l);div.appendChild(t);chat.appendChild(div);chat.scrollTop=chat.scrollHeight;}
function removeTyping(){const t=document.getElementById('typing');if(t)t.remove();}
function updateLedger(txn){const p=TYPE_TO_PILLAR[txn.type];if(!ledger[p][txn.main_category])ledger[p][txn.main_category]={};if(!ledger[p][txn.main_category][txn.sub_category])ledger[p][txn.main_category][txn.sub_category]=0;ledger[p][txn.main_category][txn.sub_category]+=txn.amount;}
async function syncToSheet(txn){
  txn._datetime = new Date().toISOString(); // store for undo delete
  const params=new URLSearchParams({datetime:txn._datetime,amount:(txn.type==='expense'||txn.type==='liability')?-txn.amount:txn.amount,type:txn.type,main_category:txn.main_category,sub_category:txn.sub_category,note:txn.note});
  await fetch(APPS_SCRIPT_URL+'?'+params.toString(),{mode:'no-cors'});
}

// Persist transaction to localStorage for dashboard
function persistTransaction(txn) {
  try {
    const raw = localStorage.getItem('scott_transactions');
    const list = raw ? JSON.parse(raw) : [];
    list.push({ datetime: new Date().toISOString(), amount: (txn.type==='expense'||txn.type==='liability') ? -txn.amount : txn.amount, type: txn.type, main_category: txn.main_category, sub_category: txn.sub_category, note: txn.note || '' });
    localStorage.setItem('scott_transactions', JSON.stringify(list));
  } catch(e) {}
}
function openLedger(){
  const body=document.getElementById('ledger-body');
  const pillars=[{key:'income',label:'Income \u2014 The Inflow'},{key:'expenses',label:'Expenses \u2014 The Outflow'},{key:'assets',label:'Assets \u2014 The Wealth'},{key:'liabilities',label:'Liabilities \u2014 The Debt'}];
  let html='';let hasAny=false;
  pillars.forEach(p=>{const cats=ledger[p.key];if(!Object.keys(cats).length)return;hasAny=true;let total=0;let cHtml='';Object.entries(cats).forEach(([cat,subs])=>{const ct=Object.values(subs).reduce((a,b)=>a+b,0);total+=ct;cHtml+='<div class="category-row"><span class="category-name">'+humanize(cat)+'</span><span class="category-amount">\u20b9'+fmt(ct)+'</span></div>';Object.entries(subs).forEach(([sub,amt])=>{cHtml+='<div class="sub-row"><span>'+humanize(sub)+'</span><span>\u20b9'+fmt(amt)+'</span></div>';});});html+='<div class="pillar"><div class="pillar-name"><span>'+p.label+'</span><span class="pillar-total">\u20b9'+fmt(total)+'</span></div>'+cHtml+'</div>';});
  body.innerHTML=hasAny?html:'<div class="empty-ledger">The ledger awaits its first entry, Sir.</div>';
  document.getElementById('ledger-panel').classList.add('open');
}
function closeLedger(){document.getElementById('ledger-panel').classList.remove('open');}
async function handleSend(){
  const input=document.getElementById('input');const text=input.value.trim();if(!text)return;
  input.value='';input.disabled=true;document.getElementById('send-btn').disabled=true;

  // Assign a new undo group for this exchange
  _undoGroupId = 'g' + Date.now();
  appendMsg('user',text);dismissWelcome();showTyping();

  // Typing delay — varies by message complexity
  const delay = text.length > 40 ? 600 : text.length > 15 ? 420 : 280;
  await new Promise(r=>setTimeout(r,delay));removeTyping();

  // ── Layer 0: Treasury commands ──────────────────────────────────────────
  const tc=checkTreasuryCommand(text);
  if(tc&&tc!=='__handled__'){appendMsg('scott',tc);ctxPush(text,null,'treasury');_enable();return;}
  if(tc==='__handled__'){ctxPush(text,null,'treasury');_enable();return;}

  // ── Layer 1: Load brain ─────────────────────────────────────────────────
  if(!BRAIN){try{await loadBrain();}catch(e){}}

  // ── Layer 2: Small talk (before routing — catches "ok", "thanks" etc.) ──
  const st=checkSmallTalk(text);
  if(st){appendMsg('scott',st);ctxPush(text,null,'small_talk');_enable();return;}

  // ── Layer 3: Transaction parser (HIGHEST priority if parses cleanly) ────
  const parsed=parseAll(text);
  if(parsed.length>0){
    await handleTransactions(parsed,text);
    _enable();return;
  }

  // ── Layer 4: Context resolution (ambiguous follow-ups) ──────────────────
  const contextTxn=resolveWithContext(text);
  if(contextTxn){
    await handleTransactions([contextTxn],text);
    _enable();return;
  }

  // ── Layer 5: Intelligence routing (questions, analysis) ─────────────────
  const intelligenceReply=routeInput(text);
  if(intelligenceReply){appendMsg('scott',intelligenceReply);ctxPush(text,null,'query');_enable();return;}

  // ── Layer 6: Smart disambiguation — smarter than "I don't understand" ───
  const disambig=smartDisambiguate(text);
  appendMsg('scott',disambig);
  ctxPush(text,null,'disambig');
  _enable();
}

function _enable(){
  const input=document.getElementById('input');
  input.disabled=false;document.getElementById('send-btn').disabled=false;input.focus();
  _undoGroupId = null; // exchange done — new messages get their own group
}

async function handleTransactions(parsedList, rawText) {
  const labels={income:'Income',expense:'Expense',asset:'Asset',liability:'Liability'};
  if(parsedList.length===1){
    const txn=parsedList[0];
    const msgDiv=appendMsg('scott',generateReply(txn),txn);
    ctxPush(rawText,txn,'log_transaction');
    try{
      _snapshotForUndo(txn);          // snapshot BEFORE applying changes
      await syncToSheet(txn);
      persistTransaction(txn);
      updateBadge(msgDiv,'ok');
      updateLedger(txn);
      updateTreasury(txn);
      const st=updateState(txn);
      const adv=runAdviceEngine(st);
      if(adv){setTimeout(()=>{appendMsg('scott',adv.text);},700);}
      const proAlert=runProactiveEngine(txn,st);
      if(proAlert){setTimeout(()=>{appendMsg('scott',proAlert);},adv?1500:700);}
    }catch(e){updateBadge(msgDiv,'err');}
  } else {
    appendMsg('scott','Two entries to record, Sir: '+parsedList.map(txn=>labels[txn.type]+': \u20b9'+fmt(txn.amount)+' ('+humanize(txn.sub_category)+')').join(' \u00b7 ')+'.');
    for(const txn of parsedList){
      const msgDiv=appendMsg('scott',generateReply(txn),txn);
      ctxPush(rawText,txn,'log_transaction');
      try{
        await syncToSheet(txn);persistTransaction(txn);updateBadge(msgDiv,'ok');updateLedger(txn);updateTreasury(txn);
        const st=updateState(txn);const adv=runAdviceEngine(st);
        if(adv){setTimeout(()=>{appendMsg('scott',adv.text);},700);}
        const proAlert=runProactiveEngine(txn,st);
        if(proAlert){setTimeout(()=>{appendMsg('scott',proAlert);},adv?1500:700);}
      }catch(e){updateBadge(msgDiv,'err');}
    }
  }
}
// ── PIN SYSTEM ─────────────────────────────────────────────────────────────
let pinBuffer = '';
let pinMode = 'enter'; // 'set' | 'confirm' | 'enter'
let pinConfirmBuf = '';

function initPin() {
  // Always enforce 2805 — overwrite any old PIN from previous versions
  localStorage.setItem('scott_pin', '2805');
  pinMode = 'enter';
  document.getElementById('pin-prompt').textContent = 'Enter PIN';
  document.getElementById('pin-set-note').textContent = '';
  pinBuffer = '';
  renderPinDots();
}

function renderPinDots(state) {
  for (let i = 0; i < 4; i++) {
    const dot = document.getElementById('pd' + i);
    dot.className = 'pin-dot' + (i < pinBuffer.length ? ' filled' : '') + (state === 'error' ? ' error' : '');
  }
}

function pinKey(digit) {
  if (pinBuffer.length >= 4) return;
  document.getElementById('pin-error').textContent = '';
  pinBuffer += digit;
  renderPinDots();
  if (pinBuffer.length === 4) setTimeout(pinSubmit, 120);
}

function pinDel() {
  pinBuffer = pinBuffer.slice(0, -1);
  document.getElementById('pin-error').textContent = '';
  renderPinDots();
}

function pinSubmit() {
  if (pinMode === 'set') {
    pinConfirmBuf = pinBuffer;
    pinBuffer = '';
    pinMode = 'confirm';
    document.getElementById('pin-prompt').textContent = 'Confirm PIN';
    document.getElementById('pin-set-note').textContent = '';
    renderPinDots();
  } else if (pinMode === 'confirm') {
    if (pinBuffer === pinConfirmBuf) {
      localStorage.setItem('scott_pin', pinBuffer);
      unlockApp();
    } else {
      document.getElementById('pin-error').textContent = 'PINs do not match';
      renderPinDots('error');
      pinBuffer = '';
      pinConfirmBuf = '';
      pinMode = 'set';
      document.getElementById('pin-prompt').textContent = 'Create a 4-digit PIN';
      document.getElementById('pin-set-note').textContent = 'Try again.';
      setTimeout(() => renderPinDots(), 500);
    }
  } else {
    const stored = localStorage.getItem('scott_pin');
    if (pinBuffer === stored) {
      unlockApp();
    } else {
      document.getElementById('pin-error').textContent = 'Incorrect PIN';
      renderPinDots('error');
      pinBuffer = '';
      setTimeout(() => renderPinDots(), 600);
    }
  }
}

function unlockApp() {
  const screen = document.getElementById('pin-screen');
  screen.classList.add('hiding');
  setTimeout(() => { screen.style.display = 'none'; }, 400);
}

// ── WELCOME SPLASH ──────────────────────────────────────────────────────────
function initWelcome() {
  const h = new Date().getHours();
  const greet = h < 12 ? 'Good morning, Master Sanket.'
               : h < 17 ? 'Good afternoon, Master Sanket.'
               : h < 21 ? 'Good evening, Master Sanket.'
               :           'Good night, Master Sanket.';
  document.getElementById('welcome-greeting').textContent = greet;
}

function dismissWelcome() {
  const w = document.getElementById('welcome');
  if (w && !w.classList.contains('gone')) {
    w.classList.add('gone');
    setTimeout(() => { if (w.parentNode) w.parentNode.removeChild(w); }, 500);
  }
}

// ── STARTUP ────────────────────────────────────────────────────────────────
window.addEventListener('load', () => {
  initPin();
  initWelcome();
  loadBrain();
  renderTreasury();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js', {scope: './'}).catch(() => {});
  }
});

document.getElementById('input').addEventListener('keydown',e=>{if(e.key==='Enter')handleSend();});
document.getElementById('input').addEventListener('input', dismissWelcome);



// ── ALLOCATION ENGINE ──────────────────────────────────────────────────────

// ── CLASSIFY into Crown's Mandates / Imperial Gratuities / Fortress Endowments ──
// NEEDS (Crown's Mandates): survival, safety, basic functioning
// Must-pay: rent, utilities, essential food, transport to work, healthcare, min debt payments
const MANDATES_SUBS = new Set([
  // Shelter & utilities
  'rent','electricity','gas','internet','mobile',
  // Essential food only
  'groceries','fruits_veggies','milk_dairy',
  // Transport (essential — getting to work)
  'fuel','metro_bus','train','toll_parking','servicing',
  // Healthcare
  'medicine','doctor','insurance_premium',
  // Education (fees = professional obligation)
  'fees',
  // Minimum debt (EMI = legal obligation)
  'emi',
]);
const MANDATES_CATS = new Set(['utilities','health']); // fallback by category

// WANTS (Imperial Gratuities): lifestyle, comfort, entertainment, status
// Can be cut without serious consequences
const GRATUITIES_SUBS = new Set([
  // Dining & coffee
  'dining_out','chai_coffee','snacks','delivery_tip',
  // Entertainment
  'streaming','movies','gaming','outing',
  // Travel
  'flight','cab',
  // Lifestyle & hobbies
  'gym_fitness','supplements','personal_care','haircut',
  // Shopping
  'clothing','gifts','donation',
  // Learning (discretionary)
  'courses','books',
  // Tech & luxury
  'smartphone','appliances','camera_drone',
  'general',
]);

// FORTRESS ENDOWMENTS (Investing + Savings): money growing for the future
// Stocks, MFs, crypto, gold, FDs, PPF, real estate — anything that builds wealth
const ENDOWMENTS_SUBS = new Set([
  'stocks','mutual_fund','fixed_deposit','ppf_nps_epf','real_estate',
  'bitcoin','ethereum','altcoin','gold','silver','watch_jewelry',
  'two_wheeler','car','laptop',
  'capital_gains','asset_sale',
  'savings_account','cash_in_hand',
  'dividends','interest','rental_income',
]);

function classifyAlloc(txn) {
  if (txn.type === 'income') return 'income';

  // Assets are always Fortress Endowments — you're building wealth
  if (txn.type === 'asset') return 'investing';

  // Liabilities: EMI/loan repayments are Mandates (legal obligation), credit card is Gratuities
  if (txn.type === 'liability') {
    return ['emi','home_loan','car_loan','education_loan','personal_loan'].includes(txn.sub_category)
      ? 'needs' : 'wants';
  }

  // Expenses
  const s = txn.sub_category;
  const c = txn.main_category;
  if (MANDATES_SUBS.has(s)) return 'needs';
  if (GRATUITIES_SUBS.has(s)) return 'wants';
  if (ENDOWMENTS_SUBS.has(s)) return 'investing';
  // Fallback by category
  if (MANDATES_CATS.has(c)) return 'needs';
  if (c === 'food') return s === 'dining_out' ? 'wants' : 'needs'; // eating out = want, groceries = need
  if (c === 'transport') return ['cab','flight'].includes(s) ? 'wants' : 'needs';
  if (c === 'finance') return 'needs'; // tax, insurance = mandates
  return 'wants'; // default discretionary
}

// ── STATE (localStorage) ───────────────────────────────────────────────────
function getMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

function loadState() {
  const key = getMonthKey();
  const raw = localStorage.getItem('scott_state');
  let state = raw ? JSON.parse(raw) : {};
  if (state.month !== key) {
    // New month — carry forward previous income for growth detection
    const prevIncome = state.income || 0;
    state = { month: key, income: 0, needs: 0, wants: 0, investing: 0, prevMonthIncome: prevIncome, lastAdviceTime: 0, velocityAlertFired: false, idleCashAlertFired: false, subAlertFired: false };
    saveState(state);
  }
  return state;
}

function saveState(state) {
  localStorage.setItem('scott_state', JSON.stringify(state));
}

function updateState(txn) {
  const state = loadState();
  const bucket = classifyAlloc(txn);
  if (bucket === 'income') state.income += txn.amount;
  else if (bucket === 'needs') state.needs += txn.amount;
  else if (bucket === 'wants') state.wants += txn.amount;
  else if (bucket === 'investing') state.investing += txn.amount;
  saveState(state);
  return state;
}

// ── SCORING ENGINE ─────────────────────────────────────────────────────────
const TARGETS = { needs: 0.50, wants: 0.30, investing: 0.20 };
const SOFT  = { needs: 0.05, wants: 0.07, investing: -0.05 };
const STRONG = { needs: 0.10, wants: 0.15, investing: -0.10 };

function calcRatios(state) {
  const I = state.income || 1;
  return {
    needs:     state.needs / I,
    wants:     state.wants / I,
    investing: state.investing / I,
  };
}

function pillarScore(actual, target, isExpense) {
  // isExpense=true → lower is better (needs/wants), isExpense=false → higher is better (savings/investing)
  const dev = actual - target;
  if (isExpense) {
    if (dev <= 0) return 95;
    if (dev <= 0.05) return 80;
    if (dev <= 0.10) return 60;
    if (dev <= 0.15) return 40;
    return 20;
  } else {
    if (dev >= 0) return 95;
    if (dev >= -0.05) return 80;
    if (dev >= -0.10) return 60;
    if (dev >= -0.15) return 40;
    return 20;
  }
}

function calcHealthScore(state) {
  if (state.income === 0) return null;
  const r = calcRatios(state);
  const ns = pillarScore(r.needs, TARGETS.needs, true);
  const ws = pillarScore(r.wants, TARGETS.wants, true);
  const is = pillarScore(r.investing, TARGETS.investing, false);
  const overall = Math.round(ns * 0.30 + ws * 0.35 + is * 0.35);
  return { ns, ws, is, overall };
}

function getInvestLevel(r) {
  if (r >= 0.35) return 'Aggressive';
  if (r >= 0.20) return 'Builder';
  return 'Beginner';
}

function scoreClass(v) {
  if (v >= 80) return 'great';
  if (v >= 65) return 'good';
  if (v >= 45) return 'warn';
  return 'poor';
}

// ── PROACTIVE ADVICE ───────────────────────────────────────────────────────
function runAdviceEngine(state) {
  if (state.income === 0) return null;
  const now = Date.now();
  // 3 minute cooldown between advice messages
  if (now - (state.lastAdviceTime || 0) < 180000) return null;

  const r = calcRatios(state);
  const candidates = [];

  // ── Income growth ─────────────────────────────────────────────────────
  if (state.prevMonthIncome > 0 && state.income > 0) {
    const growth = (state.income - state.prevMonthIncome) / state.prevMonthIncome;
    if (growth >= 0.10) {
      const increase = state.income - state.prevMonthIncome;
      candidates.push({ id:'income_growth', priority:1, type:'positive',
        text:`Income is up ${Math.round(growth*100)}% from last month, Sir. Of the ₹${fmt(Math.round(increase))} increase, I would suggest ₹${fmt(Math.round(increase*0.50))} to the Fortress, ₹${fmt(Math.round(increase*0.20))} to Mandates buffer, and ₹${fmt(Math.round(increase*0.30))} to Gratuities — the Parkinson trap is a patient foe.`
      });
    }
  }

  // ── Wants overspending ────────────────────────────────────────────────
  const wDev = r.wants - TARGETS.wants;
  if (wDev >= STRONG.wants) {
    const excess = Math.round(state.wants - state.income * TARGETS.wants);
    candidates.push({ id:'wants_strong', priority:2, type:'alert',
      text:`Imperial Gratuities stand at ${Math.round(r.wants*100)}% of income — ₹${fmt(excess)} above the 30% ceiling, Sir. At this pace the Fortress goes underfed. Consider holding the line for the remainder of the month.`
    });
  } else if (wDev >= SOFT.wants) {
    candidates.push({ id:'wants_soft', priority:3, type:'caution',
      text:`Gratuities are running ${Math.round(wDev*100)}% above target, Sir. Nothing alarming — but worth watching as the month progresses.`
    });
  }

  // ── Needs overspending ────────────────────────────────────────────────
  const nDev = r.needs - TARGETS.needs;
  if (nDev >= STRONG.needs) {
    candidates.push({ id:'needs_high', priority:2, type:'alert',
      text:`The Crown's Mandates have consumed ${Math.round(r.needs*100)}% of income — ${Math.round(nDev*100)}% above the recommended ceiling, Sir. The usual culprits are rent, fuel, and recurring subscriptions. Worth a review.`
    });
  }

  // ── Fortress underfunded ──────────────────────────────────────────────
  const iDev = r.investing - TARGETS.investing;
  if (iDev < STRONG.investing) {
    const gap = Math.round(state.income * TARGETS.investing - state.investing);
    const annualCost = Math.round(gap * 12 * 0.10);
    candidates.push({ id:'fortress_low', priority:3, type:'caution',
      text:`The Fortress sits at ${Math.round(r.investing*100)}% of income — ₹${fmt(gap)} short of the 20% target this month. At a 10% return, that gap costs roughly ₹${fmt(annualCost)} per year in compounded wealth, Sir.`
    });
  } else if (r.investing >= 0.35) {
    candidates.push({ id:'fortress_great', priority:4, type:'positive',
      text:`Fortress Endowments at ${Math.round(r.investing*100)}% — Aggressive Investor territory, Sir. The estate compounds at a fine pace. Well handled.`
    });
  }

  // ── Milestone recognition ─────────────────────────────────────────────
  const total = state.needs + state.wants + state.investing;
  const allocated = Math.round((total / state.income) * 100);
  if (allocated >= 90 && r.investing >= 0.18) {
    candidates.push({ id:'milestone', priority:4, type:'positive',
      text:`${allocated}% of income accounted for this month with all pillars near target, Sir. A well-managed estate is its own reward.`
    });
  }

  if (candidates.length === 0) return null;

  // Pick highest-priority candidate that wasn't the last advice given
  candidates.sort((a, b) => a.priority - b.priority);
  for (const c of candidates) {
    if (state.lastAdviceId !== c.id) {
      state.lastAdviceTime = now;
      state.lastAdviceId = c.id;
      saveState(state);
      return c;
    }
  }
  // All candidates already shown — return top one anyway
  const top = candidates[0];
  state.lastAdviceTime = now;
  state.lastAdviceId = top.id;
  saveState(state);
  return top;
}

// ── HEALTH PANEL UI ────────────────────────────────────────────────────────
function openHealth() {
  const state = loadState();
  const body = document.getElementById('health-body');
  const d = new Date();
  document.getElementById('health-month-label').textContent =
    d.toLocaleString('en-IN', {month:'long', year:'numeric'}) + ' \u2014 Estate Analysis';

  if (state.income === 0) {
    body.innerHTML = `
      <div class="no-data">No income recorded this month, Sir. Log your salary or income first \u2014 the estate analysis requires a foundation to measure against.</div>
      <div style="margin-top:20px;padding-top:20px;border-top:1px solid var(--rule);">
        <div style="font-family:'Playfair Display',serif;font-size:14px;font-weight:600;margin-bottom:12px;">How transactions are classified</div>
        <div style="font-size:12px;color:var(--ink-light);line-height:1.9;">
          <div style="letter-spacing:0.1em;text-transform:uppercase;font-size:10px;color:var(--ink-faint);margin-bottom:3px;">Crown\u2019s Mandates \u2014 50% target</div>
          Rent, electricity, gas, internet, mobile bill, groceries, fruits &amp; vegetables, fuel, metro / bus / train, medicine, doctor visits, insurance premiums, EMI payments, exam fees
          <div style="letter-spacing:0.1em;text-transform:uppercase;font-size:10px;color:var(--ink-faint);margin-top:12px;margin-bottom:3px;">Imperial Gratuities \u2014 30% target</div>
          Dining out, chai &amp; coffee, streaming services, movies, gaming, gym memberships, flights &amp; cabs, clothing, gadgets &amp; upgrades, gifts, courses, hobbies
          <div style="letter-spacing:0.1em;text-transform:uppercase;font-size:10px;color:var(--ink-faint);margin-top:12px;margin-bottom:3px;">Fortress Endowments \u2014 20% target</div>
          Stocks, mutual funds, crypto, gold &amp; silver, fixed deposits, PPF / NPS / EPF, real estate, any asset purchase that holds or grows in value
        </div>
      </div>`;
    document.getElementById('health-panel').classList.add('open');
    return;
  }

  const r = calcRatios(state);
  const scores = calcHealthScore(state);
  const invLevel = getInvestLevel(r.investing);

  // Score ring
  const circ = 2 * Math.PI * 34; // r=34
  const offset = circ - (scores.overall / 100) * circ;
  const scoreLabel = scores.overall >= 80 ? 'Excellent' : scores.overall >= 65 ? 'Good Shape' : scores.overall >= 45 ? 'Needs Work' : 'At Risk';
  const scoreDesc = scores.overall >= 80
    ? 'The estate is flourishing. Discipline is evident across all pillars.'
    : scores.overall >= 65
    ? 'Solid footing. Minor adjustments would strengthen the position.'
    : scores.overall >= 45
    ? 'Room for improvement. A few targeted changes could shift this significantly.'
    : 'The estate requires immediate attention, Sir. Let us address this together.';

  let html = `
  <div class="score-section">
    <div class="score-ring">
      <svg viewBox="0 0 80 80">
        <circle class="track" cx="40" cy="40" r="34"/>
        <circle class="fill" cx="40" cy="40" r="34" stroke-dasharray="${circ}" stroke-dashoffset="${offset}"/>
      </svg>
      <div class="score-num"><span>${scores.overall}</span><small>/100</small></div>
    </div>
    <div class="score-info">
      <div class="score-label">${scoreLabel}</div>
      <div class="score-desc">${scoreDesc}</div>
      <div class="inv-level">${invLevel} Investor</div>
    </div>
  </div>`;

  // Allocation bars
  const allocItems = [
    { key:'needs',     label:"Crown's Mandates",    actual:r.needs,     target:TARGETS.needs,     amount:state.needs,     isExp:true  },
    { key:'wants',     label:'Imperial Gratuities', actual:r.wants,     target:TARGETS.wants,     amount:state.wants,     isExp:true  },
    { key:'investing', label:'Fortress Endowments', actual:r.investing, target:TARGETS.investing, amount:state.investing, isExp:false },
  ];

  html += `<div class="alloc-section"><div class="alloc-title">Monthly Allocation</div>`;
  for (const item of allocItems) {
    const pct = Math.round(item.actual * 100);
    const tpct = Math.round(item.target * 100);
    const dev = item.actual - item.target;
    const isOver = item.isExp ? dev > 0 : dev < 0;
    const barPct = Math.min(item.actual / (item.target * 1.5), 1) * 100;
    const targetPos = (item.target / (item.target * 1.5)) * 100;
    const barClass = isOver ? `${item.key} over` : item.key;

    let warnHtml = '';
    const softT = item.isExp ? SOFT[item.key] : SOFT[item.key];
    const strongT = item.isExp ? STRONG[item.key] : STRONG[item.key];
    if (item.isExp) {
      if (dev >= Math.abs(strongT)) warnHtml = `<div class="alloc-warning strong">\u26a0 ${Math.round(dev*100)}% over target \u2014 strong warning</div>`;
      else if (dev >= Math.abs(softT)) warnHtml = `<div class="alloc-warning soft">\u2022 ${Math.round(dev*100)}% over target</div>`;
    } else {
      if (dev <= strongT) warnHtml = `<div class="alloc-warning strong">\u26a0 ${Math.round(Math.abs(dev)*100)}% below target \u2014 needs attention</div>`;
      else if (dev <= softT) warnHtml = `<div class="alloc-warning soft">\u2022 ${Math.round(Math.abs(dev)*100)}% below target</div>`;
    }

    html += `
    <div class="alloc-row">
      <div class="alloc-top">
        <span class="alloc-name">${item.label}</span>
        <span class="alloc-nums"><span class="actual">${pct}%</span> &nbsp;·&nbsp; target ${tpct}% &nbsp;·&nbsp; ₹${fmt(item.amount)}</span>
      </div>
      <div class="bar-track">
        <div class="bar-fill ${barClass}" style="width:${barPct}%"></div>
        <div class="bar-target" style="left:${targetPos}%"></div>
      </div>
      ${warnHtml}
    </div>`;
  }
  html += `</div>`;

  // Pillar scores grid — 3 pillars only
  html += `
  <div class="scores-section">
    <div class="scores-title">Pillar Scores</div>
    <div class="score-grid">
      <div class="score-cell">
        <div class="score-cell-name">Crown's Mandates</div>
        <div class="score-cell-val ${scoreClass(scores.ns)}">${scores.ns}</div>
        <div class="score-cell-label">${scores.ns>=80?"Essentials in check":scores.ns>=60?"Slightly elevated":"Critical — review costs"}</div>
      </div>
      <div class="score-cell">
        <div class="score-cell-name">Imperial Gratuities</div>
        <div class="score-cell-val ${scoreClass(scores.ws)}">${scores.ws}</div>
        <div class="score-cell-label">${scores.ws>=80?"Excellent restraint":scores.ws>=60?"Moderate discipline":"Discretionary creep"}</div>
      </div>
      <div class="score-cell" style="grid-column:1/-1">
        <div class="score-cell-name">Fortress Endowments</div>
        <div class="score-cell-val ${scoreClass(scores.is)}">${scores.is}</div>
        <div class="score-cell-label">${invLevel} Investor \u00b7 ${Math.round(r.investing*100)}% of income deployed into the fortress</div>
      </div>
    </div>
  </div>`;

  // Insights
  const insights = generateInsights(state, r, scores);
  if (insights.length > 0) {
    html += `<div class="insights-section"><div class="insights-title">Scott's Observations</div>`;
    insights.forEach(i => { html += `<div class="insight-item ${i.type}">${i.text}</div>`; });
    html += `</div>`;
  }

  body.innerHTML = html;
  document.getElementById('health-panel').classList.add('open');
}

function closeHealth() { document.getElementById('health-panel').classList.remove('open'); }

function generateInsights(state, r, scores) {
  const insights = [];
  const I = state.income;

  // Income growth
  if (state.prevMonthIncome > 0) {
    const growth = (I - state.prevMonthIncome) / state.prevMonthIncome;
    if (growth >= 0.10) {
      const inc = I - state.prevMonthIncome;
      insights.push({ type:'positive', text:`Income grew ${Math.round(growth*100)}% from last month. Recommended: route ₹${fmt(Math.round(inc*0.50))} to investments, ₹${fmt(Math.round(inc*0.30))} to savings, ₹${fmt(Math.round(inc*0.20))} to lifestyle.` });
    }
  }

  // Wealth velocity
  if (state.investing > 0) {
    const annual = state.investing * 12 * 1.10;
    const optimal = (I * TARGETS.investing) * 12 * 1.10;
    if (annual < optimal * 0.8) {
      const gap = Math.round((I * TARGETS.investing) - state.investing);
      insights.push({ type:'caution', text:`Current investment pace projects ₹${fmt(Math.round(annual))} annual wealth growth. An additional ₹${fmt(gap)}/month at 10% return would add ₹${fmt(Math.round(gap*12*1.10))} per year to the estate.` });
    } else {
      insights.push({ type:'positive', text:`At current pace, your Fortress Endowments project ₹${fmt(Math.round(annual))} in annual wealth growth at a 10% return. The fortress grows, Sir.` });
    }
  }

  // Emergency buffer — treasury vs 6 months of mandates
  const treasury = getTreasury();
  const sixMonthBuffer = state.needs * 6;
  if (treasury !== null && state.needs > 0) {
    const months = (treasury / state.needs).toFixed(1);
    if (treasury < sixMonthBuffer) {
      insights.push({ type:'caution', text:`Your Treasury of ₹${fmt(Math.round(treasury))} covers ${months} month(s) of essential expenses. The recommended emergency buffer is 6 months — ₹${fmt(Math.round(sixMonthBuffer))}. Build the vault before the fortress, Sir.` });
    } else {
      const idle = treasury - sixMonthBuffer;
      if (idle > state.needs * 3) {
        insights.push({ type:'positive', text:`Emergency buffer secured — ${months} months of expenses covered. ₹${fmt(Math.round(idle))} sits idle above the safety threshold. Consider deploying it to Fortress Endowments, Sir.` });
      }
    }
  }

  // Needs high
  if (r.needs > 0.55) {
    insights.push({ type:'caution', text:`The Crown's Mandates at ${Math.round(r.needs*100)}% of income is above the 50% benchmark. Review fixed costs — rent, utilities, and subscriptions are the usual suspects.` });
  }

  // All good
  if (scores.overall >= 80) {
    insights.push({ type:'positive', text:`The estate is in fine order, Sir. All four pillars are performing at or near target. Maintain this trajectory and the wealth compounds quietly.` });
  }

  return insights.slice(0, 4); // max 4 insights
}


// ── TREASURY ──────────────────────────────────────────────────────────────
function getTreasury() {
  const raw = localStorage.getItem('scott_treasury');
  return raw ? parseFloat(raw) : null;
}
function setTreasury(val) {
  localStorage.setItem('scott_treasury', val.toString());
  renderTreasury();
}
function renderTreasury() {
  const val = getTreasury();
  const sub = document.getElementById('treasury-modal-balance');
  if (sub) sub.textContent = val !== null ? 'Current balance: \u20b9' + fmt(Math.round(val)) : 'Current bank balance';

  const loans = getLoans();
  const listEl = document.getElementById('treasury-loans-list');
  const totalEl = document.getElementById('loan-section-total');
  if (!listEl) return;

  if (!loans.length) {
    listEl.innerHTML = '<div class="no-loans-note">No obligations on record, Sir.</div>';
    if (totalEl) totalEl.textContent = '';
    return;
  }

  let totalOutstanding = 0;
  let html = '';
  loans.forEach(loan => {
    const paid = loan.monthsPaid || 0;
    const remaining = Math.max(0, loan.tenure - paid);
    const outstanding = loanOutstanding(loan);
    totalOutstanding += outstanding;
    const isComplete = remaining === 0;
    const total = loan.emi * loan.tenure;
    const interest = Math.max(0, total - loan.principal);
    const pct = Math.round((paid / loan.tenure) * 100);
    const def = LOAN_TYPES.find(t => t.key === loan.loanKey) || {};
    const typeLabel = loan.loanCustomLabel || def.label || humanize(loan.sub || '');
    const rateStr = loan.rate === 0 ? 'No interest' : loan.rate + '% p.a.';

    html += `<div class="loan-item${isComplete ? ' loan-complete' : ''}" id="li-${loan.id}">
      <div class="loan-item-header" onclick="toggleLoanDetail(${loan.id})">
        <div class="loan-item-left">
          <div class="loan-item-name">${loan.note}<span class="loan-name-tip">${isComplete ? 'Fully repaid' : `EMI ₹${fmt(loan.emi)}/mo · ₹${fmt(outstanding)} left · ${remaining} months`}</span></div>
          <div class="loan-item-type">${typeLabel}</div>
        </div>
        <div class="loan-item-right">
          <div class="loan-item-emi">${isComplete ? '<span class="loan-settled">Settled \u2714</span>' : '\u20b9' + fmt(loan.emi) + '<span class="loan-emi-mo">/mo</span>'}</div>
          <div class="loan-item-outstanding">${isComplete ? '' : '\u20b9' + fmt(outstanding) + ' left'}</div>
        </div>
        <div class="loan-chevron">\u203a</div>
      </div>
      ${!isComplete ? `<div class="loan-progress-bar"><div class="loan-progress-fill" style="width:${pct}%"></div></div>` : ''}
      <div class="loan-detail" id="ld-${loan.id}" style="display:none;">
        <div class="ld-grid">
          <span class="ld-k">Principal</span><span class="ld-v">\u20b9${fmt(loan.principal)}</span>
          <span class="ld-k">Rate</span><span class="ld-v">${rateStr}</span>
          <span class="ld-k">Tenure</span><span class="ld-v">${loan.tenure} months${loan.tenure >= 12 ? ' (' + (loan.tenure/12).toFixed(1) + ' yrs)' : ''}</span>
          <span class="ld-k">Monthly EMI</span><span class="ld-v">\u20b9${fmt(loan.emi)}</span>
          ${interest > 0 ? `<span class="ld-k">Total interest</span><span class="ld-v">\u20b9${fmt(Math.round(interest))}</span>` : ''}
          <span class="ld-k">Total payout</span><span class="ld-v">\u20b9${fmt(Math.round(total))}</span>
          <span class="ld-k">Paid</span><span class="ld-v">${paid} of ${loan.tenure} months</span>
          <span class="ld-k">Started</span><span class="ld-v">${loan.startDate ? new Date(loan.startDate).toLocaleDateString('en-IN',{month:'short',year:'numeric'}) : '—'}</span>
        </div>
        <div class="ld-actions">
          ${!isComplete ? `<button class="loan-emi-btn" onclick="payLoanEMI(${loan.id})">Pay EMI \u20b9${fmt(loan.emi)}</button>` : ''}
          <button class="loan-edit-btn" onclick="openLoanForm(${loan.id})">Edit</button>
          <button class="loan-del-btn" onclick="deleteLoan(${loan.id})">Delete</button>
        </div>
      </div>
    </div>`;
  });

  listEl.innerHTML = html;
  if (totalEl) totalEl.textContent = loans.length > 1 ? '\u20b9' + fmt(Math.round(totalOutstanding)) + ' total owed' : '';
}
function updateTreasury(txn) {
  const val = getTreasury();
  if (val === null) return;
  let newVal = val;
  if (txn.type === 'income') newVal += txn.amount;
  else if (txn.type === 'expense') newVal -= txn.amount;
  else if (txn.type === 'asset') newVal -= txn.amount;
  else if (txn.type === 'liability') {
    // Cash-in loans: money arrives in your account
    const CASH_IN = ['home_loan','car_loan','two_wheeler_loan','personal_loan','education_loan','business_loan','gold_loan','loan_against_property','loan_against_securities','medical_loan','travel_loan','overdraft','borrowed_from_friend','borrowed_from_family','peer_lending_app'];
    // Goods-on-credit: you got goods, not cash (no treasury change)
    const GOODS_CREDIT = ['phone_emi','laptop_emi','appliance_emi','gadget_emi'];
    // Already spent: credit card / BNPL means cash left when you swiped
    const ALREADY_SPENT = ['credit_card_due','bnpl'];
    if (CASH_IN.includes(txn.sub_category)) newVal += txn.amount;
    else if (ALREADY_SPENT.includes(txn.sub_category)) newVal -= txn.amount;
    // GOODS_CREDIT: no treasury change
  }
  setTreasury(newVal);
}

// ── LOAN ENGINE ────────────────────────────────────────────────────────────
function getLoans() {
  try { return JSON.parse(localStorage.getItem('scott_loans') || '[]'); } catch(e) { return []; }
}
function saveLoans(loans) {
  localStorage.setItem('scott_loans', JSON.stringify(loans));
}
function calcEMI(principal, annualRate, months) {
  if (!annualRate || annualRate === 0) return Math.round(principal / months);
  const r = annualRate / 12 / 100;
  return Math.round(principal * r * Math.pow(1+r, months) / (Math.pow(1+r, months) - 1));
}
function loanOutstanding(loan) {
  if (!loan.rate || loan.rate === 0) return Math.max(0, loan.principal - (loan.principal / loan.tenure * loan.monthsPaid));
  const r = loan.rate / 12 / 100;
  const n = loan.monthsPaid;
  const outstanding = loan.principal * Math.pow(1+r, n) - loan.emi * (Math.pow(1+r, n) - 1) / r;
  return Math.max(0, Math.round(outstanding));
}
function payLoanEMI(loanId) {
  const loans = getLoans();
  const loan = loans.find(l => l.id === loanId);
  if (!loan) return;
  loan.monthsPaid = (loan.monthsPaid || 0) + 1;
  saveLoans(loans);
  renderTreasury();
  const txn = { type:'expense', amount: loan.emi, main_category:'finance', sub_category:'loan_emi_payment', note: loan.note + ' EMI' };
  updateTreasury(txn);
  updateLedger(txn);
  persistTransaction(txn);
  syncToSheet(txn).catch(()=>{});
  appendMsg('scott', `EMI of \u20b9${fmt(loan.emi)} for ${loan.note} recorded, Sir. ${Math.max(0, loan.tenure - loan.monthsPaid)} instalments remaining. The Treasury has been adjusted.`);
  closeTreasury();
}

// ── LOAN FORM STATE ────────────────────────────────────────────────────────
let _loanEditId = null; // null = adding new, number = editing existing
let _loanFormType = null;

const LOAN_TYPES = [
  { key:'borrowed_friend',  label:'Borrowed from Friend',   cash:true,  depreciating:false, sub:'borrowed_from_friend' },
  { key:'borrowed_family',  label:'Borrowed from Family',   cash:true,  depreciating:false, sub:'borrowed_from_family' },
  { key:'personal_loan',    label:'Personal Loan',          cash:true,  depreciating:false, sub:'personal_loan' },
  { key:'home_loan',        label:'Home Loan',              cash:false, depreciating:false, sub:'home_loan',        asset:true },
  { key:'car_loan',         label:'Car / Vehicle Loan',     cash:false, depreciating:true,  sub:'car_loan' },
  { key:'two_wheeler_loan', label:'Bike / Scooter Loan',    cash:false, depreciating:true,  sub:'two_wheeler_loan' },
  { key:'phone_emi',        label:'Phone EMI',              cash:false, depreciating:true,  sub:'phone_emi' },
  { key:'laptop_emi',       label:'Laptop / PC EMI',        cash:false, depreciating:true,  sub:'laptop_emi' },
  { key:'gadget_emi',       label:'iPad / Watch / Gadget EMI', cash:false, depreciating:true, sub:'gadget_emi' },
  { key:'appliance_emi',    label:'Appliance EMI',          cash:false, depreciating:true,  sub:'appliance_emi' },
  { key:'education_loan',   label:'Education Loan',         cash:true,  depreciating:false, sub:'education_loan' },
  { key:'business_loan',    label:'Business Loan',          cash:true,  depreciating:false, sub:'business_loan' },
  { key:'credit_card_due',  label:'Credit Card Due',        cash:false, depreciating:false, sub:'credit_card_due', noRate:true },
  { key:'other',            label:'Other',                  cash:true,  depreciating:false, sub:'peer_lending_app' },
];

function openTypePanel() {
  const p = document.getElementById('lf-type-panel');
  if (p) p.style.display = 'block';
}
function _hideTypePanelDeferred() {
  // Delay so a chip click registers before panel hides
  setTimeout(() => {
    const active = document.activeElement;
    const panel = document.getElementById('lf-type-panel');
    if (!panel) return;
    if (panel.contains(active)) return; // focus moved into panel
    panel.style.display = 'none';
  }, 200);
}
function openLoanForm(editId) {
  _loanEditId = editId || null;
  _loanFormType = null;
  const el = document.getElementById('loan-add-form');
  if (!el) return;

  // Reset all fields
  document.getElementById('lf-note').value = '';
  document.getElementById('lf-amount').value = '';
  document.getElementById('lf-rate').value = '';
  document.getElementById('lf-tenure').value = '';
  document.getElementById('lf-note').placeholder = 'Click to choose type…';
  document.getElementById('lf-type-panel').style.display = 'none';
  document.getElementById('lf-other-input').style.display = 'none';
  document.getElementById('lf-other-text').value = '';
  document.getElementById('lf-preview').innerHTML = '';
  document.getElementById('lf-rate-row').style.display = 'flex';
  document.querySelectorAll('.lt-chip').forEach(c => c.classList.remove('selected'));

  if (editId) {
    const loan = getLoans().find(l => l.id === editId);
    if (!loan) return;
    _loanFormType = loan.loanKey || 'other';
    document.getElementById('lf-note').value = loan.note || '';
    document.getElementById('lf-amount').value = loan.principal;
    document.getElementById('lf-rate').value = loan.rate;
    document.getElementById('lf-tenure').value = loan.tenure;
    const chip = document.querySelector(`.lt-chip[data-key="${_loanFormType}"]`);
    if (chip) chip.classList.add('selected');
    if (_loanFormType === 'other') {
      document.getElementById('lf-other-input').style.display = 'block';
      document.getElementById('lf-other-text').value = loan.loanCustomLabel || '';
    }
    const def = LOAN_TYPES.find(t => t.key === _loanFormType);
    if (def && def.noRate) document.getElementById('lf-rate-row').style.display = 'none';
    document.getElementById('lf-title').textContent = 'Edit Obligation';
    _updateLoanPreview();
  } else {
    document.getElementById('lf-title').textContent = 'Add Obligation';
  }

  el.classList.add('visible');
  setTimeout(() => el.scrollIntoView({ behavior:'smooth', block:'nearest' }), 80);
}
function closeLoanForm() {
  const el = document.getElementById('loan-add-form');
  if (el) el.classList.remove('visible');
  const p = document.getElementById('lf-type-panel');
  if (p) p.style.display = 'none';
  _loanEditId = null;
  _loanFormType = null;
}
function selectLoanType(key) {
  _loanFormType = key;
  document.querySelectorAll('.lt-chip').forEach(c => c.classList.toggle('selected', c.dataset.key === key));
  const def = LOAN_TYPES.find(t => t.key === key);

  // Hide rate field for no-rate types (credit card)
  const rateRow = document.getElementById('lf-rate-row');
  if (rateRow) rateRow.style.display = (def && def.noRate) ? 'none' : 'flex';

  // Fill the "For" input with the type label so user can edit it
  const noteEl = document.getElementById('lf-note');
  if (noteEl && (!noteEl.value || noteEl.value === noteEl._lastAutoFill)) {
    const label = def ? def.label : 'Other';
    noteEl.value = label;
    noteEl._lastAutoFill = label;
    noteEl.select(); // let user immediately overwrite
  }

  // Show free-type for Other
  const otherInput = document.getElementById('lf-other-input');
  if (otherInput) otherInput.style.display = key === 'other' ? 'block' : 'none';
  if (key === 'other') setTimeout(() => document.getElementById('lf-other-text')?.focus(), 60);

  // Close the type panel
  const p = document.getElementById('lf-type-panel');
  if (p) p.style.display = 'none';

  // Focus amount next
  if (key !== 'other') setTimeout(() => document.getElementById('lf-amount')?.focus(), 60);

  _updateLoanPreview();
}
function _updateLoanPreview() {
  const previewEl = document.getElementById('lf-preview');
  if (!previewEl) return;
  const amount  = parseFloat(document.getElementById('lf-amount')?.value || 0);
  const rate    = parseFloat(document.getElementById('lf-rate')?.value || 0);
  const tenure  = parseInt(document.getElementById('lf-tenure')?.value || 0);
  const def     = LOAN_TYPES.find(t => t.key === _loanFormType);
  if (!amount || !tenure || !_loanFormType) { previewEl.textContent = ''; return; }
  const isNoRate = def && def.noRate;
  const emi = (isNoRate || !rate) ? Math.round(amount / tenure) : calcEMI(amount, rate, tenure);
  const total = emi * tenure;
  const interest = total - amount;
  const rateStr = (isNoRate || !rate) ? 'No interest' : rate + '% p.a.';
  previewEl.innerHTML = `<span class="lf-pre-row"><b>Monthly EMI</b> \u20b9${fmt(emi)}</span><span class="lf-pre-row"><b>Total repayment</b> \u20b9${fmt(Math.round(total))}</span>${interest > 0 ? `<span class="lf-pre-row"><b>Total interest</b> \u20b9${fmt(Math.round(interest))}</span>` : ''}`;
}
function saveLoanForm() {
  const note   = document.getElementById('lf-note')?.value.trim();
  const amount = parseFloat(document.getElementById('lf-amount')?.value);
  const rate   = parseFloat(document.getElementById('lf-rate')?.value) || 0;
  const tenure = parseInt(document.getElementById('lf-tenure')?.value);
  const otherText = document.getElementById('lf-other-text')?.value.trim();
  if (!note) { alert('Please describe what this loan is for.'); return; }
  if (!amount || amount <= 0) { alert('Please enter a valid amount.'); return; }
  if (!tenure || tenure <= 0) { alert('Please enter the tenure in months.'); return; }
  if (rate < 0 || rate >= 100) { alert('Interest rate must be between 0 and 99.99%.'); return; }
  if (!_loanFormType) { alert('Please select the type of obligation.'); return; }
  if (_loanFormType === 'other' && !otherText) { alert('Please describe the type of obligation.'); return; }
  const def = LOAN_TYPES.find(t => t.key === _loanFormType);
  const isNoRate = def && def.noRate;
  const effectiveRate = isNoRate ? 0 : rate;
  const emi = calcEMI(amount, effectiveRate, tenure);
  const customLabel = _loanFormType === 'other' ? otherText : null;
  const displayLabel = customLabel || (def ? def.label : 'Other');
  const loans = getLoans();
  if (_loanEditId) {
    const idx = loans.findIndex(l => l.id === _loanEditId);
    if (idx > -1) {
      loans[idx] = { ...loans[idx], note, principal: amount, rate: effectiveRate, tenure, emi, loanKey: _loanFormType, sub: def.sub, loanCustomLabel: customLabel };
      saveLoans(loans);
    }
    closeLoanForm();
    renderTreasury();
    appendMsg('scott', `The ${note} obligation has been updated, Sir. New EMI: \u20b9${fmt(emi)}/month.`);
  } else {
    const loan = { id: Date.now(), note, loanKey: _loanFormType, sub: def.sub, loanCustomLabel: customLabel, principal: amount, rate: effectiveRate, tenure, emi, monthsPaid: 0, startDate: new Date().toISOString() };
    loans.push(loan);
    saveLoans(loans);
    if (def.cash) { const val = getTreasury(); if (val !== null) setTreasury(val + amount); }
    const txn = { type:'liability', amount, main_category: def.asset ? 'secured_loans' : def.depreciating ? 'consumer_credit' : 'unsecured_loans', sub_category: def.sub, note };
    updateLedger(txn);
    persistTransaction(txn);
    syncToSheet(txn).catch(()=>{});
    closeLoanForm();
    renderTreasury();
    appendMsg('scott', `Obligation recorded, Sir.\n\n${note} · ${displayLabel}\n\u20b9${fmt(amount)} over ${tenure} months${ effectiveRate ? ' at ' + effectiveRate + '% p.a.' : ' · no interest'}\nEMI: \u20b9${fmt(emi)}/month\n\nActive Obligations updated. Tap \u2018Pay\u2019 each month, Sir.`);
  }
}
function toggleLoanDetail(id) {
  const el = document.getElementById('ld-' + id);
  if (!el) return;
  const isOpen = el.style.display !== 'none';
  // Close all first
  document.querySelectorAll('[id^="ld-"]').forEach(e => e.style.display = 'none');
  document.querySelectorAll('.loan-item').forEach(e => e.classList.remove('expanded'));
  if (!isOpen) {
    el.style.display = 'block';
    el.closest('.loan-item').classList.add('expanded');
  }
}
function deleteLoan(id) {
  if (!confirm('Remove this obligation from your records?')) return;
  const loans = getLoans().filter(l => l.id !== id);
  saveLoans(loans);
  renderTreasury();
}
function toggleMobNav() {
  const nav = document.getElementById('mob-nav');
  const btn = document.getElementById('mob-menu-btn');
  const isOpen = nav.classList.toggle('open');
  btn.classList.toggle('open', isOpen);
}
function closeMobNav() {
  document.getElementById('mob-nav')?.classList.remove('open');
  document.getElementById('mob-menu-btn')?.classList.remove('open');
}
// Close dropdown when tapping outside
document.addEventListener('click', e => {
  if (!e.target.closest('#mob-menu-btn') && !e.target.closest('#mob-nav')) closeMobNav();
});
function openDashboard() {
  const overlay = document.getElementById('dashboard-overlay');
  const frame = document.getElementById('dashboard-frame');
  if (!overlay || !frame) return;
  // Load dashboard only once, or reload if empty
  if (!frame.src || frame.src === window.location.href || frame.src === 'about:blank') {
    frame.src = './dashboard.html';
  }
  overlay.classList.add('open');
}
function closeDashboard() {
  const overlay = document.getElementById('dashboard-overlay');
  if (overlay) overlay.classList.remove('open');
}
// Listen for message from dashboard iframe's Return to Scott button
window.addEventListener('message', e => { if (e.data === 'closeDashboard') closeDashboard(); });
function openTreasury() {
  const val = getTreasury();
  const input = document.getElementById('treasury-input');
  if (input && val !== null) input.value = Math.round(val);
  const sub = document.getElementById('treasury-modal-balance');
  if (sub) sub.textContent = val !== null ? 'Current balance: ₹' + fmt(Math.round(val)) : 'Set your current bank balance';
  document.getElementById('treasury-modal').classList.add('open');
}
function closeTreasury() {
  document.getElementById('treasury-modal').classList.remove('open');
}
function saveTreasury() {
  const input = document.getElementById('treasury-input');
  const val = parseFloat(input.value);
  if (isNaN(val)) return;
  setTreasury(val);
  closeTreasury();
  appendMsg('scott', `The Treasury has been set to \u20b9${fmt(Math.round(val))}, Sir. I shall keep it updated as transactions are recorded.`);
}
document.getElementById('treasury-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') saveTreasury(); });

// Also handle "treasury is X" / "my balance is X" / "bank balance X" via chat
function checkTreasuryCommand(text) {
  const t = text.toLowerCase();
  // B4 FIX: if message also contains a liability/income signal, let it be parsed as a transaction
  const hasTxnSignal = LIABILITY_SIGNALS.test(t) || INCOME_SIGNALS.test(t) || /\b(loan|emi|borrowed|lent)\b/i.test(t);
  const m = t.match(/(?:treasury|bank\s*balance|my\s*balance|account\s*balance|balance\s*is|treasury\s*is)\s*[:\-]?\s*[₹$]?\s*([\d,]+(?:\.\d+)?)\s*(lakh|lac|k|thousand|crore|cr)?/i);
  if (m) {
    let val = parseFloat(m[1].replace(/,/g,''));
    const unit = (m[2]||'').toLowerCase();
    if (unit === 'lakh' || unit === 'lac') val *= 100000;
    else if (unit === 'k') val *= 1000;
    else if (unit === 'crore' || unit === 'cr') val *= 10000000;
    else if (unit === 'thousand') val *= 1000;
    setTreasury(val);
    return `The Treasury stands at \u20b9${fmt(Math.round(val))}, Sir. Noted and recorded.`;
  }
  if (/\b(reset\s*(month|data|all)|clear\s*(data|month|all)|wipe\s*data|start\s*fresh|start\s*over)\b/.test(t)) {
    resetMonthData();
    return '__handled__';
  }
  // Only fire treasury query if NOT part of a larger transaction message
  if (!hasTxnSignal && /\b(treasury|what.s\s*in\s*the\s*treasury|check\s*treasury|my\s*balance|bank\s*balance)\b/.test(t)) {
    const val = getTreasury();
    if (val !== null) return `The Treasury currently holds \u20b9${fmt(Math.round(val))}, Sir.`;
    return `The Treasury has not been initialised, Sir. Tap the Treasury display above or say "treasury is [amount]" to set your current balance.`;
  }
  return null;
}


// ── RESET / CLEAR DATA ────────────────────────────────────────────────────
function resetMonthData() {
  if (!confirm('This will wipe ALL of Scott\'s local data — transactions, treasury, loans, ledger, and chat history. Your Google Sheet is unaffected.\n\nContinue?')) return;
  // Wipe every key except the PIN
  localStorage.removeItem('scott_state');
  localStorage.removeItem('scott_treasury');
  localStorage.removeItem('scott_loans');
  localStorage.removeItem('scott_transactions');
  // Reset in-memory ledger
  Object.keys(ledger).forEach(p => { ledger[p] = {}; });
  // Reset CTX
  CTX.history = [];
  CTX.pending = null;
  // Clear chat UI
  const chat = document.getElementById('chat');
  if (chat) chat.innerHTML = '';
  closeHealth();
  renderTreasury();
  appendMsg('scott', 'The estate records have been wiped clean, Sir — treasury, loans, transactions, and ledger. The Google Sheet remains untouched. We begin fresh.');
}


// ══════════════════════════════════════════════════════════════════════════
// SCOTT INTELLIGENCE ENGINE — TF-IDF + Logistic Regression in JS
// Model trains in Colab, exports JSON, loaded here at startup
// ══════════════════════════════════════════════════════════════════════════

let BRAIN = null; // loaded async from scott_model.json

// ── MODEL LOADER ───────────────────────────────────────────────────────────
async function loadBrain() {
  try {
    const r = await fetch('./scott_model.json');
    BRAIN = await r.json();
    console.log(`Scott brain loaded — v${BRAIN.version}, trained on ${BRAIN.trained_on} examples`);
  } catch(e) {
    console.warn('Brain not loaded — falling back to rule-based routing');
  }
}

// ── TF-IDF VECTORIZER — handles both word-only (v1) and word+char (v2) ──────
function tokenize(text, mode = 'word', ngram = [1, 2]) {
  const t = text.toLowerCase().replace(/[^\w\s%]/g, ' ');
  const [lo, hi] = ngram;

  if (mode === 'word') {
    const words = t.match(/\b[a-zA-Z0-9%]+\b/g) || [];
    const tokens = [...words];
    for (let n = 2; n <= hi; n++) {
      for (let i = 0; i <= words.length - n; i++) {
        tokens.push(words.slice(i, i + n).join(' '));
      }
    }
    return tokens;
  }

  if (mode === 'char') {
    // char_wb: pad each word with spaces, then extract char n-grams
    const words = t.split(/\s+/).filter(Boolean);
    const tokens = [];
    for (const w of words) {
      const padded = ' ' + w + ' ';
      for (let n = lo; n <= hi; n++) {
        for (let i = 0; i <= padded.length - n; i++) {
          tokens.push(padded.slice(i, i + n));
        }
      }
    }
    return tokens;
  }
  return [];
}

function _buildVec(tokens, vocab, idf, offset = 0) {
  const tf = {};
  tokens.forEach(t => { tf[t] = (tf[t] || 0) + 1; });
  const size = idf.length;
  const vec = new Float32Array(size);
  Object.entries(tf).forEach(([tok, count]) => {
    const idx = vocab[tok];
    if (idx !== undefined) {
      const tfVal = 1 + Math.log(count);
      vec[idx - offset] = tfVal * idf[idx - offset];
    }
  });
  // L2 normalise
  let norm = 0;
  for (let i = 0; i < size; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm);
  if (norm > 0) for (let i = 0; i < size; i++) vec[i] /= norm;
  return vec;
}

function tfidfVector(text, model) {
  const mode = model.feature_mode || 'word';

  if (mode === 'word_char') {
    // v2 model: word features [0..word_n-1] + char features [word_n..end]
    const nWord = model.word_n;
    const nChar = model.idf.length - nWord;

    const wordTokens = tokenize(text, 'word', model.word_ngram || [1, 2]);
    const charTokens = tokenize(text, 'char', model.char_ngram || [2, 4]);

    // Build word sub-vec
    const wTf = {};
    wordTokens.forEach(t => { wTf[t] = (wTf[t] || 0) + 1; });
    const wVec = new Float32Array(nWord);
    Object.entries(wTf).forEach(([tok, count]) => {
      const idx = model.vocab[tok];
      if (idx !== undefined && idx < nWord) {
        wVec[idx] = (1 + Math.log(count)) * model.idf[idx];
      }
    });
    let wNorm = 0;
    for (let i = 0; i < nWord; i++) wNorm += wVec[i] * wVec[i];
    wNorm = Math.sqrt(wNorm);
    if (wNorm > 0) for (let i = 0; i < nWord; i++) wVec[i] /= wNorm;

    // Build char sub-vec
    const cTf = {};
    charTokens.forEach(t => { cTf[t] = (cTf[t] || 0) + 1; });
    const cVec = new Float32Array(nChar);
    Object.entries(cTf).forEach(([tok, count]) => {
      const idx = model.vocab[tok];
      if (idx !== undefined && idx >= nWord) {
        cVec[idx - nWord] = (1 + Math.log(count)) * model.idf[idx];
      }
    });
    let cNorm = 0;
    for (let i = 0; i < nChar; i++) cNorm += cVec[i] * cVec[i];
    cNorm = Math.sqrt(cNorm);
    if (cNorm > 0) for (let i = 0; i < nChar; i++) cVec[i] /= cNorm;

    // Concatenate
    const merged = new Float32Array(nWord + nChar);
    merged.set(wVec, 0);
    merged.set(cVec, nWord);
    return merged;
  }

  // v1 model: word-only
  const words = tokenize(text, 'word', [1, 2]);
  const tf = {};
  words.forEach(t => { tf[t] = (tf[t] || 0) + 1; });
  const size = Object.keys(model.vocab).length;
  const vec = new Float32Array(size);
  Object.entries(tf).forEach(([tok, count]) => {
    const idx = model.vocab[tok];
    if (idx !== undefined) {
      vec[idx] = (model.sublinear_tf ? 1 + Math.log(count) : count) * model.idf[idx];
    }
  });
  let norm = 0;
  for (let i = 0; i < size; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm);
  if (norm > 0) for (let i = 0; i < size; i++) vec[i] /= norm;
  return vec;
}

function softmax(logits) {
  const max = Math.max(...logits);
  const exp = logits.map(x => Math.exp(x - max));
  const sum = exp.reduce((a,b) => a+b, 0);
  return exp.map(x => x / sum);
}

function classifyIntent(text) {
  if (!BRAIN) return fallbackIntent(text);
  
  const vec = tfidfVector(text, BRAIN);
  
  // Dot product: coef [n_classes × n_features] · vec [n_features]
  const logits = BRAIN.coef.map((row, c) => {
    let dot = BRAIN.intercept[c];
    for (let i = 0; i < row.length; i++) dot += row[i] * vec[i];
    return dot;
  });
  
  const probs = softmax(logits);
  const bestIdx = probs.indexOf(Math.max(...probs));
  
  return {
    intent: BRAIN.classes[bestIdx],
    confidence: probs[bestIdx],
    all: Object.fromEntries(BRAIN.classes.map((c,i) => [c, probs[i]]))
  };
}

// Fallback if model not loaded — simple keyword rules
function fallbackIntent(text) {
  const t = text.toLowerCase();
  if (/\b(if |what if|what happens if|suppose)\b/.test(t)) return {intent:'query_whatif', confidence:0.7};
  if (/\b(distribute|allocate|split|where.*go|how.*put|where should|how should)\b/.test(t)) return {intent:'query_allocation', confidence:0.7};
  if (/\b(beginner|builder|aggressive|investor level|investment rate)\b/.test(t)) return {intent:'query_investor', confidence:0.7};
  if (/\b(velocity|trajectory|grow in|years|return rate|project|how fast|how much will|how much would i|in \d+ years|\d+ years from now|project.*wealth|forecast.*wealth)\b/.test(t)) return {intent:'query_velocity', confidence:0.7};
  if (/\b(buffer|emergency|months.*covered|idle cash|6 months|bank.*safe|ready to invest)\b/.test(t)) return {intent:'query_buffer', confidence:0.7};
  if (/\b(score|out of 100|health score|pillar|flourishing|rank.*pillar)\b/.test(t)) return {intent:'query_score', confidence:0.7};
  if (/\b(ratio|percent|percentage|breakdown|deviation|target|calculate.*ratio)\b/.test(t)) return {intent:'query_ratio', confidence:0.7};
  if (/\b(status|verdict|how am i|on track|balanced|worried|healthy|doing financially|in good shape|estate doing|spending okay|am i okay)\b/.test(t)) return {intent:'query_status', confidence:0.7};
  if (/\b(hello|hi\b|thanks|thank you|good morning|good evening|amazing|great job|well done)\b/.test(t)) return {intent:'small_talk', confidence:0.9};
  return {intent:'log_transaction', confidence:0.5};
}

// ── ANALYTICAL RESPONSE ENGINE ─────────────────────────────────────────────
// Each intent maps to a computed, data-driven response using Scott's real state

function extractNumbers(text) {
  const t = text.toLowerCase().replace(/,/g,'');
  const nums = [];
  // lakh/crore first
  const mults = [[/(\d+(?:\.\d+)?)\s*crore/,1e7],[/(\d+(?:\.\d+)?)\s*lakh/,1e5],[/(\d+(?:\.\d+)?)\s*k\b/,1e3]];
  for(const[re,m] of mults){const x=t.match(re);if(x)nums.push(parseFloat(x[1])*m);}
  // plain numbers
  for(const m of t.matchAll(/\b(\d{3,}(?:\.\d+)?)\b/g)) nums.push(parseFloat(m[1]));
  return [...new Set(nums)].sort((a,b)=>b-a);
}

function analyseIntent(intent, text, state) {
  const I = state.income || 0;
  const N = state.needs || 0;
  const W = state.wants || 0;
  const E = state.investing || 0;
  const treasury = getTreasury();
  const nums = extractNumbers(text);

  // Use inline numbers if present (user gave hypothetical data)
  const hypoIncome = nums.find(n => n >= 5000) || I;

  switch(intent) {

    case 'query_status': {
      if (I === 0) {
      const t2 = getTreasury();
      return "The estate has no income recorded this month, Sir. Log your salary and I can give you a full ratio analysis, health score, and pillar breakdown. Try: \"Got salary 45000\"" + (t2 ? ` — Treasury currently shows ₹${fmt(Math.round(t2))}.` : '.');
    }
      const r = {n: N/I, w: W/I, e: E/I};
      const nd = (r.n - 0.50)*100, wd = (r.w - 0.30)*100, ed = (r.e - 0.20)*100;
      const parts = [];
      if (Math.abs(nd) <= 3 && Math.abs(wd) <= 3 && ed >= -3) return `The estate is well-balanced, Sir. Crown's Mandates at ${Math.round(r.n*100)}%, Imperial Gratuities at ${Math.round(r.w*100)}%, Fortress Endowments at ${Math.round(r.e*100)}%. All pillars within acceptable range.`;
      if (nd > 10) parts.push(`Crown's Mandates are elevated at ${Math.round(r.n*100)}% — ${Math.round(nd)}% above the 50% target`);
      if (wd > 7) parts.push(`Imperial Gratuities are ${Math.round(wd)}% above the 30% target`);
      if (ed < -10) parts.push(`Fortress Endowments are underfunded at ${Math.round(r.e*100)}% — target is 20%`);
      if (parts.length === 0) return `Estate health is reasonable, Sir. Minor deviations noted but nothing critical. Open the Health panel for the full breakdown.`;
      return `The estate requires attention, Sir. ${parts.join('. ')}. I recommend opening the Health panel for a complete analysis.`;
    }

    case 'query_ratio': {
      const src = hypoIncome > 0 ? hypoIncome : I;
      if (src === 0) return "I need an income figure to calculate ratios, Sir. Either log your salary or include it in your question — e.g. 'my income is ₹30,000'.";
      // Check if user provided spending figures inline
      const spendNums = nums.filter(n => n < src);
      const useInline = spendNums.length >= 2 && hypoIncome !== I;
      const un = useInline ? spendNums[0] : N;
      const uw = useInline ? spendNums[1] : W;
      const ue = I > 0 ? E : 0;
      const rn = un/src, rw = uw/src, re = ue/src;
      const rem = src - un - uw - ue;
      return `At ₹${fmt(src)} income, Sir:\n` +
        `Crown's Mandates: ₹${fmt(un)} = ${Math.round(rn*100)}% (target 50%, deviation ${rn>0.5?'+':''}${Math.round((rn-0.5)*100)}%)\n` +
        `Imperial Gratuities: ₹${fmt(uw)} = ${Math.round(rw*100)}% (target 30%, deviation ${rw>0.3?'+':''}${Math.round((rw-0.3)*100)}%)\n` +
        `Fortress Endowments: ₹${fmt(ue)} = ${Math.round(re*100)}% (target 20%, deviation ${re>0.2?'+':''}${Math.round((re-0.2)*100)}%)\n` +
        (rem > 0 ? `Unallocated: ₹${fmt(rem)} (${Math.round(rem/src*100)}%)` : '');
    }

    case 'query_allocation': {
      // Detect income increase scenario
      const incNums = nums.filter(n => n >= 1000);
      let base = I, newInc = 0;
      const t = text.toLowerCase();
      if (incNums.length >= 2) {
        base = incNums[1]; newInc = incNums[0];
        if (newInc < base) { [base, newInc] = [newInc, base]; }
      } else if (incNums.length === 1) {
        newInc = incNums[0];
      }
      if (newInc > 0 && newInc > base) {
        // Income grew
        const increase = newInc - base;
        const toInvest = Math.round(increase * 0.50);
        const toSave   = Math.round(increase * 0.30);
        const toWants  = Math.round(increase * 0.20);
        return `Splendid, Sir. On a ₹${fmt(newInc)} income the targets are:\n` +
          `Crown's Mandates: ₹${fmt(Math.round(newInc*0.50))} (50%)\n` +
          `Imperial Gratuities: ₹${fmt(Math.round(newInc*0.30))} (30%)\n` +
          `Fortress Endowments: ₹${fmt(Math.round(newInc*0.20))} (20%)\n\n` +
          `Of the ₹${fmt(increase)} increase: route ₹${fmt(toInvest)} to Fortress Endowments, ₹${fmt(toSave)} to savings, and ₹${fmt(toWants)} may go to Gratuities — without inflating the lifestyle, Sir.`;
      }
      if (newInc > 0) {
        return `For a ₹${fmt(newInc)} income, Sir:\n` +
          `Crown's Mandates (50%): ₹${fmt(Math.round(newInc*0.50))}\n` +
          `Imperial Gratuities (30%): ₹${fmt(Math.round(newInc*0.30))}\n` +
          `Fortress Endowments (20%): ₹${fmt(Math.round(newInc*0.20))}`;
      }
      if (I === 0) return "I need an income figure, Sir. Include it in your message — e.g. 'My income is ₹40,000. How should I allocate it?'";
      return `At your current ₹${fmt(I)} income:\nCrown's Mandates (50%): ₹${fmt(Math.round(I*0.50))}\nImperial Gratuities (30%): ₹${fmt(Math.round(I*0.30))}\nFortress Endowments (20%): ₹${fmt(Math.round(I*0.20))}`;
    }

    case 'query_investor': {
      const inv = E > 0 ? E : (nums.find(n=>n>=1000) || 0);
      const inc = I > 0 ? I : (nums.find(n=>n>=5000) || 0);
      if (inv === 0 || inc === 0) return "I need your investment amount and income to determine your level, Sir. Try: 'I invest ₹8,000 from ₹40,000 income — what level am I?'";
      const rate = inv / inc;
      let level, next, needed;
      if (rate >= 0.35) { level = 'Aggressive'; next = null; needed = 0; }
      else if (rate >= 0.20) { level = 'Builder'; next = 'Aggressive'; needed = Math.round(inc*0.35 - inv); }
      else { level = 'Beginner'; next = 'Builder'; needed = Math.round(inc*0.20 - inv); }
      const resp = `At ₹${fmt(inv)}/month on ₹${fmt(inc)} income, your investment rate is ${Math.round(rate*100)}% — you are a ${level} Investor, Sir.`;
      if (next) return resp + ` To reach ${next} status, increase monthly Fortress Endowments by ₹${fmt(needed)}.`;
      return resp + ' The highest tier. The fortress grows with full force.';
    }

    case 'query_velocity': {
      const inv = E > 0 ? E : (nums.find(n=>n>=1000) || 0);
      const rateMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:percent|%)/i);
      const returnRate = rateMatch ? parseFloat(rateMatch[1])/100 : 0.10;
      const yearsMatch = text.match(/(\d+)\s*years?/i);
      const years = yearsMatch ? parseInt(yearsMatch[1]) : 5;
      if (inv === 0) return "I need your monthly investment figure, Sir. Try: 'I invest ₹5,000 monthly — what is my velocity?'";
      const annual = inv * 12;
      // Compound annually: FV = PMT × ((1+r)^n - 1) / r
      const fv = annual * (Math.pow(1+returnRate, years) - 1) / returnRate;
      const annualGrowth = annual * (1 + returnRate);
      const optimalInv = I > 0 ? I*0.20 : inv;
      const optFV = optimalInv * 12 * (Math.pow(1+returnRate, years) - 1) / returnRate;
      return `At ₹${fmt(inv)}/month with ${Math.round(returnRate*100)}% annual returns, Sir:\n` +
        `Annual wealth growth: ₹${fmt(Math.round(annualGrowth))}\n` +
        `In ${years} years (compounded): ₹${fmt(Math.round(fv))}\n` +
        (I>0 && inv < optimalInv ? `\nAt the optimal 20% rate (₹${fmt(Math.round(optimalInv))}/month), the ${years}-year figure would be ₹${fmt(Math.round(optFV))} — a difference of ₹${fmt(Math.round(optFV-fv))}, Sir.` : '\nThe fortress compounds in silence, Sir.');
    }

    case 'query_buffer': {
      const mandates = N > 0 ? N : (nums.find(n=>n>=3000 && n<=50000) || 0);
      const cash = treasury || (nums.find(n=>n>mandates*2) || 0);
      if (mandates === 0) return "I need your monthly essential expenses to check the buffer, Sir. Try: 'My Mandates are ₹12,000 — is my buffer safe?' or set your Treasury balance.";
      const safeBuffer = mandates * 6;
      const months = cash > 0 ? (cash / mandates).toFixed(1) : '?';
      const idleThreshold = mandates * 3;
      if (cash === 0) return `Your 6-month emergency buffer target is ₹${fmt(safeBuffer)}, Sir. Set your Treasury balance so I can check your current position.`;
      if (cash >= safeBuffer) {
        const idle = cash - safeBuffer;
        return `Buffer secured, Sir. ₹${fmt(Math.round(cash))} covers ${months} months of essential expenses — well above the 6-month minimum of ₹${fmt(safeBuffer)}.\n` +
          (idle > idleThreshold ? `₹${fmt(Math.round(idle))} sits idle above the safety threshold. Consider deploying it to Fortress Endowments.` : 'No idle cash detected.');
      }
      const shortfall = safeBuffer - cash;
      return `Buffer is below target, Sir. Current: ₹${fmt(Math.round(cash))} (${months} months). Target: ₹${fmt(safeBuffer)} (6 months). Shortfall: ₹${fmt(Math.round(shortfall))}. Priority: build the vault before expanding the fortress.`;
    }

    case 'query_whatif': {
      if (I === 0) return "I need this month's income recorded before I can run scenarios, Sir. Log your salary first.";
      const extraNum = nums.find(n => n < I) || nums[0] || 0;
      const t = text.toLowerCase();
      let resp = '';

      // Map keywords to pillars
      const isWants = /gratuities|wants|spend more|spending more|food|coffee|dining|restaurant|clothes|clothing|vacation|holiday|trip|movie|gaming|entertainment|gadget|phone|banana|snack|leisure|fun|outing|personal/.test(t);
      const isInvest = /invest|fortress|endowment|stocks|mutual fund|sip|crypto|gold|silver|fd|ppf|nps/.test(t);
      const isMandates = /rent|emi|loan|bills|electricity|medicine|essentials|mandates|needs/.test(t);
      const isIncome = /income|salary|earn|raise|hike|bonus|pay/.test(t);
      const isSkipInvest = /skip.*invest|stop.*invest|no.*invest|skip.*fortress|pause.*fortress/.test(t);
      const isBonus = /bonus|windfall|extra.*money|entire.*bonus|whole.*bonus/.test(t);

      if (isSkipInvest) {
        const lostAnnual = E * 12 * 0.10;
        resp = `Skipping Fortress Endowments for a month means ₹${fmt(E)} uninvested, Sir. At 10% annual returns that costs roughly ₹${fmt(Math.round(lostAnnual/12))} in potential growth. The fortress is built month by month — one missed stone weakens the wall.`;
      } else if (isBonus && isInvest && extraNum > 0) {
        const newE = E + extraNum;
        const newRate = newE / I;
        const fv5 = extraNum * Math.pow(1.10, 5);
        resp = `Deploying ₹${fmt(extraNum)} entirely to the Fortress, Sir. At 10% returns over 5 years, that single contribution compounds to ₹${fmt(Math.round(fv5))}. Investment rate for the month jumps to ${Math.round(newRate*100)}% — ${newRate>=0.35?'Aggressive':newRate>=0.20?'Builder':'Beginner'} level.`;
      } else if (isWants && extraNum > 0) {
        const newW = W + extraNum;
        const newWr = newW / I;
        const dev = (newWr - 0.30) * 100;
        resp = `Spending ₹${fmt(extraNum)} more on Gratuities would bring them to ₹${fmt(newW)} — ${Math.round(newWr*100)}% of income. `;
        resp += dev > 15 ? `That is ${Math.round(dev)}% above the 30% target — a strong warning, Sir. The estate would feel it.` :
                dev > 7  ? `${Math.round(dev)}% above the 30% target — a soft warning, but manageable.` :
                           `Still within the acceptable 30% range, Sir.`;
      } else if (isInvest && extraNum > 0) {
        const newE = E + extraNum;
        const newRate = newE / I;
        const addedAnnual = Math.round(extraNum * 12 * 1.10);
        resp = `Adding ₹${fmt(extraNum)} to Fortress Endowments brings your rate to ${Math.round(newRate*100)}% — ${newRate>=0.35?'Aggressive':newRate>=0.20?'Builder':'Beginner'} level. That extra contribution yields roughly ₹${fmt(addedAnnual)} per year at 10% returns, Sir.`;
      } else if (isMandates && extraNum > 0) {
        const newN = N + extraNum;
        const newNr = newN / I;
        const dev = (newNr - 0.50) * 100;
        resp = `Adding ₹${fmt(extraNum)} to Mandates brings them to ₹${fmt(newN)} — ${Math.round(newNr*100)}% of income. `;
        resp += dev > 10 ? `That is ${Math.round(dev)}% above the 50% target — needs attention, Sir.` :
                dev > 5  ? `Slightly above the 50% target — a soft caution.` :
                           `Still within acceptable range.`;
      } else if (isIncome && extraNum > 0) {
        const newI = I + extraNum;
        resp = `On ₹${fmt(newI)} income, Sir — new targets:
Mandates (50%): ₹${fmt(Math.round(newI*0.50))}
Gratuities (30%): ₹${fmt(Math.round(newI*0.30))}
Endowments (20%): ₹${fmt(Math.round(newI*0.20))}
Route at least 50% of the ₹${fmt(extraNum)} increase to the Fortress, Sir.`;
      } else if (extraNum > 0) {
        // Has a number but unclear category — make a reasonable assumption
        const newW = W + extraNum;
        const newWr = newW / I;
        const dev = (newWr - 0.30) * 100;
        resp = `If ₹${fmt(extraNum)} goes to Gratuities, that brings them to ${Math.round(newWr*100)}% of income`;
        resp += dev > 7 ? ` — above the 30% target, Sir. Consider whether it is truly necessary.` : ` — still within acceptable range, Sir.`;
      } else {
        resp = `Tell me the amount and I can calculate the exact impact, Sir — e.g. 'What if I spend ₹3,000 more on food?' or 'What if I skip investing this month?'`;
      }
      return resp;
    }

    case 'query_score': {
      if (I === 0) return "Open the Health panel, Sir — the full score with all pillar breakdowns awaits you there. Or log your income first and I'll compute it here.";
      const r = {n:N/I, w:W/I, e:E/I};
      function ps(actual, target, isExp) {
        const d = actual - target;
        if (isExp) { if(d<=0)return 95; if(d<=0.05)return 80; if(d<=0.10)return 60; if(d<=0.15)return 40; return 20; }
        else { if(d>=0)return 95; if(d>=-0.05)return 80; if(d>=-0.10)return 60; if(d>=-0.15)return 40; return 20; }
      }
      const ns=ps(r.n,0.50,true), ws=ps(r.w,0.30,true), es=ps(r.e,0.20,false);
      const overall = Math.round(ns*0.30 + ws*0.35 + es*0.35);
      const label = overall>=80?'Excellent':overall>=65?'Good Shape':overall>=45?'Needs Work':'At Risk';
      return `Financial Health Score: ${overall}/100 — ${label}, Sir.\nCrown's Mandates: ${ns}/100\nImperial Gratuities: ${ws}/100\nFortress Endowments: ${es}/100\n\nWeighted: Mandates 30%, Gratuities 35%, Endowments 35%.`;
    }

    case 'query_tip': {
      if (I === 0) return `The estate has no income on record yet, Sir. Once you log your salary, I can offer a precise recommendation based on your actual numbers.`;
      const rN = N/I, rW = W/I, rE = E/I;
      if (rW > 0.35) return `My counsel: trim the Imperial Gratuities, Sir. You're at ${Math.round(rW*100)}% on wants — that's ${Math.round((rW-0.30)*I)} above the 30% ceiling. Even a modest reduction would compound meaningfully over the year.`;
      if (rE < 0.15) return `My counsel: the Fortress Endowments need attention, Sir. You're investing only ${Math.round(rE*100)}% — short of the 20% target by ₹${fmt(Math.round((0.20-rE)*I))} this month. Even a small SIP increase closes that gap.`;
      if (rN > 0.55) return `My counsel: your Crown's Mandates are elevated at ${Math.round(rN*100)}%. If rent is the culprit, that may be worth revisiting — even shifting ₹2,000 toward a smaller flat fee over 12 months adds up to ₹24,000 redirected.`;
      return `You are in solid shape, Sir — mandates ${Math.round(rN*100)}%, gratuities ${Math.round(rW*100)}%, endowments ${Math.round(rE*100)}%. My counsel: ensure your emergency fund covers 6 months of expenses before increasing discretionary spending.`;
    }

    case 'query_savings': {
      if (I === 0) return `No income recorded this month, Sir. Log your salary and I'll compute your precise savings figure.`;
      const spent = N + W;
      const saved = I - spent;
      const saveRate = saved / I;
      const verdict = saveRate >= 0.20 ? 'commendable' : saveRate >= 0.10 ? 'modest' : 'quite low';
      return `This month's ledger, Sir:\n\nIncome: ₹${fmt(Math.round(I))}\nSpent (needs + wants): ₹${fmt(Math.round(spent))}\nInvested: ₹${fmt(Math.round(E))}\nNet saved: ₹${fmt(Math.round(saved))}\n\nSavings rate: ${Math.round(saveRate*100)}% — ${verdict}. The target is 20% minimum, Sir.`;
    }

    case 'query_compare': {
      const prev = state.prevMonthIncome || 0;
      if (!prev) return `I have no previous month on record yet, Sir. I'll begin tracking month-over-month from next month once you've used me for a full cycle.`;
      const diff = I - prev;
      const sign = diff >= 0 ? '+' : '';
      return `Month-on-month comparison, Sir:\n\nPrevious income: ₹${fmt(Math.round(prev))}\nThis month income: ₹${fmt(Math.round(I))} (${sign}${fmt(Math.round(diff))})\n\n${diff > 0 ? `Income is up — well done, Sir. Direct the surplus toward the Fortress.` : diff < 0 ? `Income dipped this month — tighten the Gratuities accordingly.` : `Income is steady, Sir.`}`;
    }


    // ── FINANCIAL INTELLIGENCE ───────────────────────────────────────────────

    case 'query_networth': {
      const nlLoans = getLoans();
      const nlDebt = nlLoans.reduce((s,l) => s + Math.max(0, l.principal - (l.emi * l.monthsPaid)), 0);
      const nlAssets = treasury !== null ? treasury : 0;
      const nlNet = nlAssets - nlDebt;
      const nlDebtLine = nlLoans.length ? `
Active obligations outstanding: ₹${fmt(Math.round(nlDebt))}` : `
No active obligations on record.`;
      return `Estate Net Worth, Sir:

Liquid assets (Treasury): ₹${fmt(Math.round(nlAssets))}${nlDebtLine}

Net position: ₹${fmt(Math.round(nlNet))} ${nlNet >= 0 ? '— in the black, Sir.' : '— liabilities currently exceed liquid assets.'}

For a complete picture including investments, log all assets in the Ledger.`;
    }

    case 'query_debt_strategy': {
      const dsLoans = getLoans();
      if (!dsLoans.length) return `No obligations on record, Sir — a clean slate. If you acquire debt in future, I'll help you decide whether to eliminate it early or invest the difference.`;
      const dsHighest = dsLoans.reduce((a,b) => (parseFloat(a.rate)||0) > (parseFloat(b.rate)||0) ? a : b);
      const dsRate = parseFloat(dsHighest.rate) || 0;
      if (dsRate > 10) return `Your ${dsHighest.note} carries ${dsRate}% interest — a guaranteed ${dsRate}% return to eliminate it, Sir. Markets rarely beat that reliably. Clear this debt before increasing market investments.`;
      if (dsRate > 7) return `Your ${dsHighest.note} at ${dsRate}% is a close call, Sir. Equity historically returns 11-13% long term but with risk. A balanced approach — minimum payments plus a modest SIP — serves most people well here.`;
      return `Your highest obligation rate is ${dsRate}%, Sir — relatively low. Mathematically, investing the difference in equity makes more sense than prepaying. The psychological freedom of being debt-free has real value too — but the numbers favour investing.`;
    }

    case 'query_goal': {
      if (I === 0) return `Log your income first, Sir, then ask me something like "how long to save 5 lakhs?" and I'll give you a precise timeline.`;
      const glSurplus = I - N - W;
      if (glSurplus <= 0) return `No surplus to direct toward a goal currently, Sir — outflows match income. We'd need to trim Gratuities first.`;
      const glNums = extractNumbers(text);
      if (glNums.length) {
        const glTarget = glNums[0];
        const glMonths = Math.ceil(glTarget / glSurplus);
        return `At your current surplus of ₹${fmt(Math.round(glSurplus))}/month, Sir:

Target: ₹${fmt(Math.round(glTarget))}
Timeline: ${glMonths} months (${(glMonths/12).toFixed(1)} years)

Increase surplus by 20% and you'd reach it in ${Math.ceil(glTarget/(glSurplus*1.2))} months instead.`;
      }
      return `Monthly surplus available for goals: ₹${fmt(Math.round(glSurplus))}, Sir. Tell me the target amount — e.g. "how long to save 10 lakhs" — and I'll compute the exact timeline.`;
    }

    case 'query_expense_breakdown': {
      if (N + W === 0) return `No expenses recorded yet this month, Sir. Log transactions and I'll show you a full breakdown.`;
      const ebLines = [];
      if (I > 0) {
        if (N > 0) ebLines.push(`Crown's Mandates (Needs):     ₹${fmt(Math.round(N))}  (${Math.round(N/I*100)}%)`);
        if (W > 0) ebLines.push(`Imperial Gratuities (Wants):  ₹${fmt(Math.round(W))}  (${Math.round(W/I*100)}%)`);
        if (E > 0) ebLines.push(`Fortress Endowments (Invest): ₹${fmt(Math.round(E))}  (${Math.round(E/I*100)}%)`);
        const ebUnspent = I - N - W - E;
        if (ebUnspent > 0) ebLines.push(`Unallocated:                  ₹${fmt(Math.round(ebUnspent))}  (${Math.round(ebUnspent/I*100)}%)`);
      }
      return `Expense breakdown this month, Sir:\n\n${ebLines.join('\n')}\n\nOpen the Ledger for full category-level detail.`;
    }

    case 'query_income_growth': {
      const igPrev = state.prevMonthIncome || 0;
      if (!igPrev || !I) return `I need at least two months of income data to show a trend, Sir. Keep logging and I'll track from next month.`;
      const igGrowth = ((I - igPrev) / igPrev * 100).toFixed(1);
      return `Income trajectory, Sir:

Last month: ₹${fmt(Math.round(igPrev))}
This month: ₹${fmt(Math.round(I))}
Change: ${igGrowth > 0 ? '+' : ''}${igGrowth}%

${I > igPrev ? `Income is climbing. Direct the extra ₹${fmt(Math.round(I-igPrev))} intentionally — don't let lifestyle inflation absorb it silently.` : I < igPrev ? `Income dipped this month. Hold Gratuities tight until it recovers.` : `Steady income — consistency is underrated, Sir.`}`;
    }

    case 'query_biggest_leak': {
      if (W === 0 && N === 0) return `No expenses logged yet, Sir. Once you do, I'll identify exactly where the estate is leaking.`;
      const blRW = I > 0 ? W/I : 0, blRN = I > 0 ? N/I : 0;
      const blWOver = Math.max(0, blRW - 0.30), blNOver = Math.max(0, blRN - 0.50);
      if (blWOver > blNOver && blWOver > 0.03) return `Primary leak: Imperial Gratuities at ${Math.round(blRW*100)}% of income — ${Math.round(blWOver*100)} points above the 30% ceiling. That's ₹${fmt(Math.round(blWOver*I))}/month excess — ₹${fmt(Math.round(blWOver*I*12))} annualised, Sir.`;
      if (blNOver > 0.05) return `Pressure point: Crown's Mandates at ${Math.round(blRN*100)}%. Rent or EMIs are likely the culprit — structural costs are harder to cut but worth examining for renegotiation.`;
      return `No significant leaks detected, Sir — Mandates ${Math.round(blRN*100)}%, Gratuities ${Math.round(blRW*100)}%. Both within healthy parameters.`;
    }

    case 'query_emi_impact': {
      const eiLoans = getLoans();
      if (!eiLoans.length) return `No active obligations, Sir — income is entirely unencumbered. A position of strength.`;
      const eiTotal = eiLoans.reduce((s,l) => s + l.emi, 0);
      const eiPct = I > 0 ? (eiTotal/I*100).toFixed(1) : '?';
      const eiVerdict = eiPct < 30 ? 'within safe range' : eiPct < 40 ? 'approaching the upper limit' : 'high — worth addressing';
      return `EMI burden, Sir:\n\nTotal monthly EMIs: ₹${fmt(Math.round(eiTotal))}\nAs % of income: ${eiPct}% — ${eiVerdict}\n\n${eiLoans.map(l=>l.note+': \u20b9'+fmt(l.emi)+'/mo').join('\n')}\n\nRule of thumb: total EMIs should not exceed 35-40% of gross income.`;
    }

    case 'query_surplus': {
      if (I === 0) return `Log your income first, Sir, and I'll calculate your surplus immediately.`;
      const spSurplus = I - N - W - E;
      if (spSurplus <= 0) return `Income is fully allocated this month, Sir — ₹${fmt(Math.round(I))} in, ₹${fmt(Math.round(N+W+E))} accounted for. No undeployed capital.`;
      return `Unallocated surplus: ₹${fmt(Math.round(spSurplus))} (${Math.round(spSurplus/I*100)}% of income), Sir.

This capital is idle. If your emergency fund covers 6 months, direct this toward the Fortress Endowments. If not — build the buffer first.`;
    }

    case 'query_tax_basic': {
      return `Tax planning essentials, Sir:

80C (₹1.5L limit): PPF, ELSS, EPF, LIC premium, home loan principal — fill this first.
80D: Health insurance premiums — ₹25,000 self, ₹50,000 for senior parents.
HRA: Often the largest deduction for salaried individuals — claim it.
NPS 80CCD(1B): Additional ₹50,000 over the 80C limit — frequently overlooked.
Home loan interest (24b): Up to ₹2L deduction.

Old vs New regime: New has lower rates but no deductions. If your total deductions exceed ₹3.75L, old regime typically wins.

Tell me your income and I'll help you estimate which regime suits you, Sir.`;
    }

    // ── BEHAVIOURAL & PSYCHOLOGY ─────────────────────────────────────────────

    case 'query_impulse': {
      return `A lapse in discipline, Sir — it happens to everyone.

Three steps forward:
1. Log it honestly — avoidance compounds the problem
2. Name the trigger: boredom, stress, social pressure? Named, it loses power
3. Find an equivalent cut elsewhere this month to keep Gratuities in balance

One purchase does not define the estate. How you respond to it does.`;
    }

    case 'query_lifestyle_inflation': {
      const liPrev = state.prevMonthIncome || 0;
      if (!liPrev || !I) return `I need a few months of data to detect lifestyle inflation, Sir. The trap is subtle — expenses rise invisibly alongside income. Keep logging and I'll flag it the moment I see it.`;
      const liIncGrowth = (I - liPrev) / liPrev;
      const liSpendRatio = (N + W) / I;
      if (liIncGrowth > 0.05 && liSpendRatio > 0.85) return `Signs of lifestyle inflation, Sir. Income grew ${Math.round(liIncGrowth*100)}% and spending is running high at ${Math.round(liSpendRatio*100)}% of income. The antidote: when income rises, direct the increment to the Fortress before the Gratuities can absorb it.`;
      return `No significant lifestyle inflation detected, Sir. Spending hasn't run away with income — a sign of genuine discipline. Keep that ratio intact as earnings grow.`;
    }

    case 'query_guilt': {
      return `Financial guilt is a signal, Sir — not a sentence.

It tells you your actions diverged from your values. Which means your values are intact. That matters.

The constructive response is not self-punishment — it is adjustment: log what happened, understand why, make one concrete change going forward.

The estate is not built or destroyed in a single transaction. What specifically happened? Tell me, and we'll address it practically.`;
    }

    case 'query_motivation': {
      const motSaved = I > 0 ? Math.max(0, I - N - W) : 0;
      if (motSaved > 0) return `Let me show you something concrete, Sir.

At your current rate you're preserving ₹${fmt(Math.round(motSaved))}/month — ₹${fmt(Math.round(motSaved*12))}/year. Invested at 12% annually:
5 years:  ₹${fmt(Math.round(motSaved*12*5.35))}
10 years: ₹${fmt(Math.round(motSaved*12*17.55))}

Motivation follows action, not the other way round. The numbers are already working for you.`;
      return `The path to financial freedom is not exciting, Sir — it is consistent. Every budget you hold, every investment you make is a brick. You don't feel a house being built; you feel the weight of laying bricks. Log your income and I'll show you exactly where you stand.`;
    }

    case 'query_overspend_category': {
      const ocText = text.toLowerCase();
      const ocCat = /food|dining|eat|swiggy|zomato/.test(ocText) ? 'food delivery' :
                    /cloth|shopping|fashion|myntra/.test(ocText) ? 'clothing & shopping' :
                    /subscri|netflix|streaming/.test(ocText) ? 'subscriptions' :
                    /entertain|movie|outing/.test(ocText) ? 'entertainment' : 'that category';
      return `Habitual overspending on ${ocCat}, Sir — the mechanism is rarely greed, it's friction-free access.

Three interventions:
1. Hard monthly cash envelope for ${ocCat} — when it's gone, it's gone
2. Add friction — delete the app, unlink the card, enforce a 24-hour wait
3. Find a cheaper substitute that satisfies the same underlying need

Which sounds workable for you?`;
    }

    case 'query_habit': {
      return `The most powerful financial habit, Sir, is also the least glamorous: pay yourself first.

The moment income arrives, move savings and investment amounts before spending begins. Automate it — SIP on salary day, recurring transfer to savings.

Three habits that compound beautifully:
1. Weekly 10-minute review — log everything, check the pillars
2. Monthly reset — set next month's targets before it begins
3. Annual audit — review all subscriptions, insurance, and investment performance

Consistency across modest habits beats intensity across sporadic ones, Sir.`;
    }

    // ── LIFE EVENTS ───────────────────────────────────────────────────────────

    case 'query_salary_raise': {
      const srNums = extractNumbers(text);
      const srRaise = srNums.length ? srNums[0] : null;
      if (srRaise) return `Congratulations, Sir — a rise well earned.

For the additional ₹${fmt(Math.round(srRaise))}/month:
Fortress Endowments (50%): ₹${fmt(Math.round(srRaise*0.50))}/mo — increase SIP immediately
Crown's Mandates (30%):    ₹${fmt(Math.round(srRaise*0.30))}/mo — buffer for genuine need increases
Imperial Gratuities (20%): ₹${fmt(Math.round(srRaise*0.20))}/mo — a measured lifestyle upgrade

The temptation is to let the full raise flow into lifestyle. Resist it — this is how wealth compounds.`;
      return `A raise is a rare opportunity, Sir. Direct 50% of the increment to investments, 30% to needs buffer, 20% to a measured lifestyle upgrade. Tell me the amount and I'll give you exact figures.`;
    }

    case 'query_bonus': {
      const bnNums = extractNumbers(text);
      const bnBonus = bnNums.length ? bnNums[0] : null;
      const bnHighDebt = getLoans().find(l => parseFloat(l.rate) > 10);
      if (bnBonus && bnHighDebt) return `Bonus of ₹${fmt(Math.round(bnBonus))}, Sir.

Given your ${bnHighDebt.note} at ${bnHighDebt.rate}% interest:
Clear high-rate debt (60%):        ₹${fmt(Math.round(bnBonus*0.60))}
Fortress Endowments (30%):         ₹${fmt(Math.round(bnBonus*0.30))}
A worthy reward (10%):             ₹${fmt(Math.round(bnBonus*0.10))}`;
      if (bnBonus) return `Bonus of ₹${fmt(Math.round(bnBonus))}, Sir:
Emergency fund top-up (30%):       ₹${fmt(Math.round(bnBonus*0.30))}
Fortress Endowments lumpsum (60%): ₹${fmt(Math.round(bnBonus*0.60))}
A worthy reward (10%):             ₹${fmt(Math.round(bnBonus*0.10))}

Resist upgrading lifestyle with a one-time payment — it creates ongoing expectations.`;
      return `A bonus is a lump sum — the temptation is to spend it lump-sum too, Sir. Tell me the amount and I'll allocate it precisely across debt, investments, and a measured reward.`;
    }

    case 'query_job_loss': {
      const jlBurn = N + W;
      const jlRunway = jlBurn > 0 && treasury !== null ? (treasury / jlBurn).toFixed(1) : null;
      return `A difficult moment, Sir — let us be practical.

Immediate triage:
1. Runway: ${jlRunway ? `₹${fmt(Math.round(treasury||0))} ÷ ₹${fmt(Math.round(jlBurn))}/mo = ${jlRunway} months` : 'Set your treasury balance so I can calculate your runway'}
2. Suspend all non-essential Gratuities immediately
3. Pause (not cancel) investments — preserve cash
4. Identify true minimum burn: rent, food, utilities, medicines only

The Fortress was built for this moment, Sir. How long is your runway?`;
    }

    case 'query_big_purchase': {
      const bpNums = extractNumbers(text);
      const bpPrice = bpNums.length ? bpNums[0] : null;
      if (bpPrice && I > 0) {
        const bpSurplus = Math.max(1, I - N - W);
        const bpMonths = Math.ceil(bpPrice / bpSurplus);
        const bpAffordable = treasury !== null && bpPrice < treasury * 0.5;
        return `Purchase analysis — ₹${fmt(Math.round(bpPrice))}, Sir:

${bpAffordable ? `Treasury has cover — affordable without disrupting finances.` : `This is ${bpMonths} months of your current surplus.`}

${bpPrice < I * 2 ? `Manageable as a cash purchase.` : `If financing via EMI, ensure monthly payment stays under 8% of income.`}

Rule of thumb: if it requires more than 3 months of surplus, it warrants a dedicated savings goal rather than an impulse decision.`;
      }
      return `Before any major purchase, Sir — three questions:
1. Does Treasury cover it without wiping the emergency fund?
2. Does any EMI keep total loan burden under 35% of income?
3. Would waiting 30 days change your desire for it?

Tell me the amount for a precise affordability verdict.`;
    }

    case 'query_moving': {
      const mvNums = extractNumbers(text);
      const mvRent = mvNums.length ? mvNums[0] : null;
      if (mvRent && I > 0) {
        const mvPct = (mvRent/I*100).toFixed(1);
        const mvVerdict = mvPct < 25 ? 'comfortable' : mvPct < 35 ? 'manageable but tight' : 'high — proceed with caution';
        return `Relocation analysis, Sir:

New rent ₹${fmt(Math.round(mvRent))} = ${mvPct}% of income — ${mvVerdict}.

Also budget for: moving costs (₹15,000-30,000), security deposit (2-3 months rent), setup costs, and a 2-month adjustment spike.

If the new city has a higher cost of living, build an extra month of buffer before moving.`;
      }
      return `Key variables for relocation, Sir: new rent as % of income (aim under 30%), one-time moving costs, security deposit, cost-of-living differential. Tell me the new rent and I'll assess the full impact.`;
    }

    case 'query_family_expense': {
      const feText = text.toLowerCase();
      if (/marr|wedding/.test(feText)) return `Wedding planning, Sir — one of the largest financial events most people face.

Set a firm budget before engaging vendors. Distinguish non-negotiables from nice-to-haves. Never fund celebrations with high-interest debt.

Framework: if the wedding costs more than 6 months of combined income, it warrants a dedicated savings goal started 18+ months prior.`;
      if (/baby|child|kid|birth/.test(feText)) return `A child changes the financial landscape significantly, Sir.

Immediate: delivery costs, infant supplies (₹30-50K first year), possible income reduction during leave.
Medium term: increase health insurance, start an education SIP (₹3,000/mo for 18 years at 12% grows substantially).
Long term: increase term insurance cover now — your obligations have grown.`;
      if (/parent|mother|father/.test(feText)) return `Supporting parents requires a dedicated line item, Sir — not an afterthought.

Add their expenses to Crown's Mandates. Ensure they have separate health insurance. Have an honest conversation about ongoing support so it can be planned rather than reactive.`;
      return `Family milestones rarely cost less than expected, Sir. Tell me the specific event — wedding, child, parent support — and I'll give you a precise financial framework.`;
    }

    case 'query_freelance': {
      return `Variable income requires a different architecture than a salary, Sir.

Core framework:
1. Base budget on your lowest recent month — not average, not best
2. In good months, bank excess into a dedicated income smoothing buffer
3. Pay yourself a fixed "salary" from that buffer each month
4. Target 6 months expenses in buffer (vs 3 for salaried)

For taxes: set aside 25-30% of every invoice immediately — freelance has no TDS, so the liability accumulates invisibly.

For investments: SIP at a modest amount you can sustain in lean months. Make lump-sum top-ups in surplus months.`;
    }

    // ── PRODUCTS & INSTRUMENTS ────────────────────────────────────────────────

    case 'query_sip': {
      const sipRec = I > 0 ? Math.round(I * 0.20) : null;
      return `SIP guidance, Sir:

A Systematic Investment Plan automates your entry into mutual funds — fixed amount, fixed date, every month. The discipline is built-in.

${sipRec ? `At your income, a 20% target suggests ₹${fmt(sipRec)}/month.

` : ''}For beginners: Nifty 50 index fund — low cost, broad diversification, hard to beat long-term.
For builders: add flexi-cap or mid-cap once the index fund has run 12+ months.

Key rules: don't stop SIPs in a downturn (you're buying cheaper), increase by 10% annually with income, never invest money you need within 3 years in equity.`;
    }

    case 'query_fd_vs_mf': {
      return `FD vs Mutual Fund depends entirely on purpose, Sir:

Fixed Deposits:
+ Guaranteed returns (6.5-7.5% currently)
+ Zero risk, predictable
− Often lose to inflation after tax
− Best for: emergency fund, goals under 3 years

Equity Mutual Funds:
+ 11-13% historical long-term returns
+ Tax efficient (LTCG 10% after ₹1L)
− Market risk, short-term volatility
− Best for: goals 5+ years away, wealth building

Verdict: FD for money you cannot afford to lose or need within 3 years. Equity funds for everything else. A liquid fund is a superior FD alternative for your emergency fund — better returns, equally accessible.`;
    }

    case 'query_gold': {
      return `Gold's role in the estate, Sir:

Gold is a hedge — it moves differently from equity, protecting the portfolio when markets fall. Not a primary wealth builder; long-term real returns are modest.

Allocation: 5-10% of investment portfolio — no more.

Best forms:
1. Sovereign Gold Bonds (SGBs): 2.5% annual interest + price appreciation + zero capital gains if held to maturity. Clearly superior.
2. Gold ETFs: liquid, transparent pricing, no making charges.
3. Physical gold: sentimental value, but storage risk and making charges make it poor as pure investment.

If you hold no gold yet, SGBs at next tranche opening. If you hold physical gold, that covers your allocation.`;
    }

    case 'query_credit_card': {
      return `Credit card wisdom, Sir — the tool is neutral, the behaviour determines outcome.

Golden rules:
1. Pay full statement balance every month — not minimum due. The interest (36-42% annualised) is catastrophic.
2. Keep utilisation under 30% of limit — above that, it damages your credit score.
3. Treat it as a debit card with rewards. Never spend what you don't already have.
4. One or two cards maximum.

Used correctly: credit score building, cashback, purchase protection, 45-day interest-free float.

Most dangerous phrase in personal finance: "I'll pay the minimum this month." That is how ₹10,000 becomes ₹18,000 in a year, Sir.`;
    }

    case 'query_insurance': {
      const insAnnual = I * 12;
      const insCover = insAnnual > 0 ? `₹${fmt(Math.round(insAnnual * 10))} (10x annual income)` : `₹1 crore minimum`;
      return `Insurance architecture, Sir:

Term Life:
Cover needed: ${insCover}
What to buy: pure term plan only — no ULIP, no endowment. Those do both jobs poorly.

Health Insurance:
Minimum: ₹5L individual, ₹10L family floater
Add a super top-up of ₹50L — costs little, protects against catastrophic bills
Parents: separate policy — age makes them expensive in your floater

Buy insurance when young and healthy, Sir. Waiting makes it costlier or unavailable.`;
    }

    // ── WIKIPEDIA FALLBACK ────────────────────────────────────────────────────

    case 'wiki_finance_term':
    case 'wiki_concept':
    case 'wiki_product':
    case 'wiki_regulation':
    case 'wiki_general': {
      _fetchWiki(text); // async — returns placeholder, updates bubble when done
      return `One moment, Sir — consulting the archives...`;
    }
    default:
      return null;
  }
}

// ── WIKIPEDIA FETCHER ──────────────────────────────────────────────────────
// Extracts the key topic from user text and fetches a plain-English summary.
// Returns a placeholder immediately; updates the last Scott bubble when done.

function _extractWikiTerm(text) {
  const t = text.toLowerCase()
    .replace(/\b(what is|what are|what does|explain|define|tell me about|how does|meaning of|what do you mean by)\b/gi, '')
    .replace(/[?.,!]/g, '')
    .trim();
  // Take first 4 significant words
  return t.split(/\s+/).slice(0, 4).join(' ').trim();
}

async function _fetchWiki(text) {
  const term = _extractWikiTerm(text);
  if (!term) return;
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(term)}`;
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error('not found');
    const data = await r.json();
    const extract = data.extract || data.description || 'No summary available.';
    const short = extract.length > 600 ? extract.slice(0, 600) + '…' : extract;
    // Update the last Scott bubble (the placeholder "consulting the archives...")
    const chat = document.getElementById('chat');
    const bubbles = chat.querySelectorAll('.msg.scott .msg-bubble');
    const last = bubbles[bubbles.length - 1];
    if (last && last.textContent.includes('consulting the archives')) {
      last.textContent = '';
      typeMsg(last, `From the archives, Sir — on "${data.title || term}":\n\n${short}\n\nThis is from Wikipedia. For financial decisions, always verify with a qualified advisor.`, () => { const chat = document.getElementById('chat'); if(chat) chat.scrollTop = chat.scrollHeight; });
    }
  } catch(e) {
    const chat = document.getElementById('chat');
    const bubbles = chat.querySelectorAll('.msg.scott .msg-bubble');
    const last = bubbles[bubbles.length - 1];
    if (last && last.textContent.includes('consulting the archives')) {
      last.textContent = '';
      typeMsg(last, `I wasn't able to locate "${term}" in the archives, Sir. Could you rephrase or be more specific?`, () => { const chat = document.getElementById('chat'); if(chat) chat.scrollTop = chat.scrollHeight; });
    }
  }
}

// ── PROACTIVE ENGINE ───────────────────────────────────────────────────────
// Runs silently after every transaction. Fires at most one alert per event.
// Returns a string (alert message) or null (silent).

function runProactiveEngine(txn, state) {
  const I = state.income || 0;
  const N = state.needs  || 0;
  const W = state.wants  || 0;
  const E = state.investing || 0;
  if (I === 0) return null; // no income logged yet — stay silent

  // ── 1. LARGE TRANSACTION ALERT ────────────────────────────────────────────
  // Fires when a single transaction exceeds 15% of monthly income
  if (txn.amount > 0 && txn.type !== 'income' && txn.amount > I * 0.15) {
    const pct = Math.round(txn.amount / I * 100);
    return `A notable outflow, Sir — ₹${fmt(Math.round(txn.amount))} (${pct}% of monthly income) just logged for "${humanize(txn.sub_category)}". If this was planned, carry on. If not, it may be worth reviewing.`;
  }

  // ── 2. BUDGET THRESHOLD ALERTS ────────────────────────────────────────────
  // Fires when a pillar crosses its target percentage
  const rW = W / I, rN = N / I;
  if (txn.type === 'wants' && rW > 0.30 && rW - (txn.amount/I) <= 0.30) {
    return `Imperial Gratuities have crossed the 30% threshold, Sir — now at ${Math.round(rW*100)}% of income. Any further discretionary spending this month will widen the deviation.`;
  }
  if (txn.type === 'needs' && rN > 0.50 && rN - (txn.amount/I) <= 0.50) {
    return `Crown's Mandates have crossed the 50% threshold, Sir — now at ${Math.round(rN*100)}% of income. Likely a structural cost rather than a controllable one, but worth noting.`;
  }

  // ── 3. SPEND VELOCITY ALERT ───────────────────────────────────────────────
  // Fires when total spending in current month is on pace to exceed income
  const totalSpent = N + W;
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth()+1, 0).getDate();
  const dayOfMonth = today.getDate();
  const projectedMonthly = (totalSpent / dayOfMonth) * daysInMonth;
  if (dayOfMonth > 5 && projectedMonthly > I * 0.85) {
    const projPct = Math.round(projectedMonthly / I * 100);
    // Only fire this once — check a flag in state
    if (!state.velocityAlertFired) {
      state.velocityAlertFired = true;
      saveState(state);
      return `Spend velocity alert, Sir — at the current pace, Mandates + Gratuities are projected to reach ${projPct}% of income by month-end. There is still time to course-correct.`;
    }
  }

  // ── 4. IDLE CASH OPPORTUNITY ──────────────────────────────────────────────
  // Fires once when treasury is high relative to expenses and investing is low
  const treasury = getTreasury();
  const monthlyBurn = N + W;
  if (treasury > monthlyBurn * 9 && E < I * 0.10 && !state.idleCashAlertFired) {
    state.idleCashAlertFired = true;
    saveState(state);
    const months = (treasury / Math.max(1, monthlyBurn)).toFixed(0);
    return `The Treasury holds ${months} months of expenses, Sir — well above the 6-month buffer. The excess is idle. Might I suggest deploying ₹${fmt(Math.round(treasury - monthlyBurn*6))} into the Fortress Endowments?`;
  }

  // ── 5. SUBSCRIPTION DETECTOR ──────────────────────────────────────────────
  // Detects if subscription-category spending is above ₹1,500/month
  const txns = JSON.parse(localStorage.getItem('scott_transactions') || '[]');
  const thisMonth = getMonthKey();
  const subKeywords = /netflix|spotify|hotstar|prime|zee5|jiocinema|youtube premium|apple music|gamepass|adobe|notion|canva|subscri/i;
  const subTotal = txns
    .filter(t => t.month === thisMonth && subKeywords.test(t.sub_category + ' ' + t.note))
    .reduce((s, t) => s + t.amount, 0);
  if (subTotal > 1500 && subKeywords.test(txn.sub_category + ' ' + (txn.note||'')) && !state.subAlertFired) {
    state.subAlertFired = true;
    saveState(state);
    return `Subscription tracker, Sir — recurring services have totalled ₹${fmt(Math.round(subTotal))} this month. Worth a quick audit: are all of these actively used?`;
  }

  return null; // nothing to report
}

// ── MAIN INTENT ROUTER ─────────────────────────────────────────────────────
function hardKeywordRoute(text) {
  // Always-on keyword router — works even if model fails to load
  const t = text.toLowerCase();
  // Must NOT be a transaction — skip if it has amount-like patterns
  const hasAmount = /\b(\d+k?\b|lakh|crore|₹|rs\b)/.test(t);
  const isObviousTransaction = /^(spent|paid|bought|got salary|received|invested|sent \d|filled|ordered|donated|medicine|coffee|uber|petrol)/.test(t);
  if (isObviousTransaction) return null;

  if (/\b(what if|if i spend|if i invest|if my income|if i stop|what happens if)\b/.test(t)) return 'query_whatif';
  if (/\b(distribute|allocate|split my income|where.*go|how.*allocate|new.*target|where should i put)\b/.test(t)) return 'query_allocation';
  if (/\b(beginner|builder|aggressive|investor\s*level|what.*level|which.*level|what\s*kind.*investor|how\s*aggressive|investment\s*strategy|am\s*i.*investor)\b/.test(t)) return 'query_investor';
  if (/\b(wealth velocity|how fast.*wealth|grow in.*year|fortress grow|in \d+ years|in 5 years|in 10 years|annual.*growth|trajectory|how much will i have|how much would i have|project.*my.*wealth|my.*wealth.*in)\b/.test(t)) return 'query_velocity';
  if (/\b(buffer safe|emergency fund|idle cash|months.*covered|ready to invest|6 months|smart investing trigger|emergency vault)\b/.test(t)) return 'query_buffer';
  if (/\b(health score|estate score|score out of|pillar score|rank.*pillar|overall score|weighted score|flourishing|rate.*estate|rate.*finances|grade.*estate|grade.*finances|score.*estate)\b/.test(t)) return 'query_score';
  if (/\b(my ratio|current ratio|calculate.*ratio|spending breakdown|deviation|what percent|how much.*income.*going|income split)\b/.test(t)) return 'query_ratio';
  // Status — broad catch, no amounts needed
  if (!hasAmount && /\b(on track|how am i|am i okay|am i balanced|am i doing|my status|the verdict|estate doing|in good shape|spending okay|should i be worried|budget healthy|steward say|review my finances|doing financially|performing)\b/.test(t)) return 'query_status';
  if (/\b(my ratio|percentage.*spend|how much.*mandates|gratuities.*reached|spent.*income.*status|spent.*income.*verdict|spent.*income.*balanced)\b/.test(t)) return 'query_ratio';

  // ── WIKIPEDIA TRIGGERS (hardcoded — work without model) ─────────────────
  // "what is X", "explain X", "define X", "meaning of X", "what does X mean"
  // Also catches single known financial terms typed alone
  const wikiTrigger = /^(what (is|are|does|do)|explain|define|meaning of|tell me about|how does|what do you mean by)\b/i;
  const knownTerms = /^(inflation|deflation|cagr|nav|sip|elss|ppf|nps|epf|fd|mf|mutual fund|index fund|etf|ltcg|stcg|repo rate|gdp|recession|compound interest|diversification|beta|alpha|hedging|liquidity|volatility|sebi|rbi|irda|amfi|rera|fema|gst|tds|hra|ulip|sgb|nifty|sensex|p\/e ratio|pe ratio|book value|dividend|equity|debt fund|liquid fund|flexi cap|bitcoin|blockchain|startup|ipo|venture capital)\b/i;
  if (wikiTrigger.test(t) || knownTerms.test(t.trim())) return 'wiki_general';

  return null; // let model or parser handle
}

function routeInput(text) {
  const t = text.trim();

  // ── GATE: Is this clearly a transaction? ────────────────────────────────
  const looksLikeQuery = /^(what\s+if|how\s+should|how\s+much\s+will|should\s+i|where\s+should|when\s+should|am\s+i|is\s+my|i\s+got\s+a\s+(raise|bonus)|how.*allocate|what.*score|rate\s+my|what\s+kind|how\s+aggressive|tell\s+me.*invest|project\s+my|forecast|how.*fast|why\s+is|what.*happen|can\s+i|will\s+i|give\s+me|explain|show\s+me)/i.test(t);

  if (!looksLikeQuery) {
    const quickParse = parseTransaction(t);
    if (quickParse) return null; // it's a transaction — let handleSend deal with it
  }

  // ── STEP 0: Hard keyword rules — always checked first, beats ML ─────────
  // This ensures wiki queries, what-if, etc. always route correctly
  const hardFirst = hardKeywordRoute(t);
  if (hardFirst) {
    const state = loadState();
    return analyseIntent(hardFirst, t, state);
  }

  // ── STEP 1: ML model (when loaded) — primary brain ──────────────────────
  if (BRAIN) {
    const result = classifyIntent(t);
    const { intent, confidence } = result;

    // Hard reject: model is sure it's a transaction or chit-chat
    if (intent === 'log_transaction' && confidence > 0.55) return null;
    if (intent === 'small_talk'      && confidence > 0.55) return null;

    // Accept ML result when confident enough
    if (confidence >= 0.38 && intent !== 'log_transaction' && intent !== 'small_talk') {
      const state = loadState();
      const reply = analyseIntent(intent, t, state);
      if (reply) return reply;
    }

    // ML uncertain but non-transaction — still use it
    if (confidence >= 0.25 && intent !== 'log_transaction' && intent !== 'small_talk') {
      const state = loadState();
      const reply = analyseIntent(intent, t, state);
      if (reply) return reply;
    }

    return null;
  }

  // ── STEP 2: No model — fallback intent ──────────────────────────────────
  const result = fallbackIntent(t);
  const { intent, confidence } = result;
  if (intent === 'log_transaction' || intent === 'small_talk') return null;
  const state = loadState();
  return analyseIntent(intent, t, state);
}
