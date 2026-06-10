// src/scripts/calculator.ts

interface CountryConfig {
  name: string;
  symbol: string;
  currency: string;
  pppFactor: number;
}

const countryMetrics: Record<string, CountryConfig> = {
  IN: { name: "India", symbol: "₹", currency: "INR", pppFactor: 0.23 },
  US: { name: "United States", symbol: "$", currency: "USD", pppFactor: 1.00 },
  GB: { name: "United Kingdom", symbol: "£", currency: "GBP", pppFactor: 0.69 },
  DE: { name: "Germany", symbol: "€", currency: "EUR", pppFactor: 0.74 },
  CA: { name: "Canada", symbol: "CA$", currency: "CAD", pppFactor: 0.82 },
  AU: { name: "Australia", symbol: "A$", currency: "AUD", pppFactor: 0.84 },
  AE: { name: "UAE", symbol: "AED", currency: "AED", pppFactor: 0.91 },
  SG: { name: "Singapore", symbol: "S$", currency: "SGD", pppFactor: 0.87 },
  NL: { name: "Netherlands", symbol: "€", currency: "EUR", pppFactor: 0.75 },
  FR: { name: "France", symbol: "€", currency: "EUR", pppFactor: 0.73 },
  PK: { name: "Pakistan", symbol: "₨", currency: "PKR", pppFactor: 0.16 },
  BD: { name: "Bangladesh", symbol: "৳", currency: "BDT", pppFactor: 0.19 },
  NG: { name: "Nigeria", symbol: "₦", currency: "NGN", pppFactor: 0.13 },
  BR: { name: "Brazil", symbol: "R$", currency: "BRL", pppFactor: 0.29 },
  MX: { name: "Mexico", symbol: "$", currency: "MXN", pppFactor: 0.28 },
  PH: { name: "Philippines", symbol: "₱", currency: "PHP", pppFactor: 0.18 },
  JP: { name: "Japan", symbol: "¥", currency: "JPY", pppFactor: 0.61 },
  KR: { name: "South Korea", symbol: "₩", currency: "KRW", pppFactor: 0.68 },
  CH: { name: "Switzerland", symbol: "CHF", currency: "CHF", pppFactor: 0.94 },
  SE: { name: "Sweden", symbol: "kr", currency: "SEK", pppFactor: 0.78 },
  NO: { name: "Norway", symbol: "kr", currency: "NOK", pppFactor: 0.85 },
  DK: { name: "Denmark", symbol: "kr", currency: "DKK", pppFactor: 0.81 },
  IE: { name: "Ireland", symbol: "€", currency: "EUR", pppFactor: 0.76 },
  NZ: { name: "New Zealand", symbol: "NZ$", currency: "NZD", pppFactor: 0.75 },
  ZA: { name: "South Africa", symbol: "R", currency: "ZAR", pppFactor: 0.21 },
  EG: { name: "Egypt", symbol: "E£", currency: "EGP", pppFactor: 0.14 },
  KE: { name: "Kenya", symbol: "KSh", currency: "KES", pppFactor: 0.11 },
  QA: { name: "Qatar", symbol: "QR", currency: "QAR", pppFactor: 0.85 },
  SA: { name: "Saudi Arabia", symbol: "SR", currency: "SAR", pppFactor: 0.59 },
  BH: { name: "Bahrain", symbol: "BD", currency: "BHD", pppFactor: 0.78 },
  KW: { name: "Kuwait", symbol: "KD", currency: "KWD", pppFactor: 0.86 },
  OM: { name: "Oman", symbol: "RO", currency: "OMR", pppFactor: 0.56 },
  MC: { name: "Monaco", symbol: "€", currency: "EUR", pppFactor: 1.58 },
  KY: { name: "Cayman Islands", symbol: "$", currency: "KYD", pppFactor: 1.31 },
  BS: { name: "Bahamas", symbol: "B$", currency: "BSD", pppFactor: 0.91 },
  BM: { name: "Bermuda", symbol: "BD$", currency: "BMD", pppFactor: 1.42 }
};

let cachedRatesRes: any = null;
let isForexPreloaded = false;

async function preloadForexData() {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    cachedRatesRes = await res.json();
    isForexPreloaded = true;
    (window as any).latestFetchedRates = cachedRatesRes;
  } catch (e) {
    console.warn("Forex preloader sync offline.");
  }
}

if (document.readyState === "complete" || document.readyState === "interactive") {
  preloadForexData();
} else {
  document.addEventListener("DOMContentLoaded", preloadForexData);
}

function syncDropdownExclusion() {
  const cc = currentCountryEl?.value;
  const oc = offerCountryEl?.value;
  if (offerCountryEl) Array.from(offerCountryEl.options).forEach(opt => opt.disabled = (opt.value === cc));
  if (currentCountryEl) Array.from(currentCountryEl.options).forEach(opt => opt.disabled = (opt.value === oc));
}

const currentCountryEl = document.getElementById("currentCountry") as HTMLSelectElement;
const offerCountryEl = document.getElementById("offerCountry") as HTMLSelectElement;
const currentSymbolEl = document.getElementById("currentSymbol");
const offerSymbolEl = document.getElementById("offerSymbol");
const calcBtn = document.getElementById("calcBtn") as HTMLButtonElement;

function fmt(n: number) {
  return "$" + n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

currentCountryEl?.addEventListener("change", () => {
  const code = currentCountryEl.value;
  if (currentSymbolEl) currentSymbolEl.textContent = countryMetrics[code]?.symbol || "$";
  syncDropdownExclusion();
});

offerCountryEl?.addEventListener("change", () => {
  const code = offerCountryEl.value;
  if (offerSymbolEl) offerSymbolEl.textContent = countryMetrics[code]?.symbol || "$";
  syncDropdownExclusion();
});

function triggerLiveRecalculation() {
  const resultDiv = document.getElementById("result");
  if (resultDiv && !resultDiv.classList.contains("hidden")) {
    engineCompute(true);
  }
}

document.getElementById("currentSalary")?.addEventListener("input", triggerLiveRecalculation);
document.getElementById("offerSalary")?.addEventListener("input", triggerLiveRecalculation);

async function engineCompute(isSilent = false) {
  if (!currentCountryEl || !offerCountryEl) return;

  const cc = currentCountryEl.value;
  const oc = offerCountryEl.value;
  const currentSalaryInp = document.getElementById("currentSalary") as HTMLInputElement;
  const offerSalaryInput = document.getElementById("offerSalary") as HTMLInputElement;
  
  if (!currentSalaryInp || !offerSalaryInput) return;

  const cs = parseFloat(currentSalaryInp.value);
  const os = parseFloat(offerSalaryInput.value);

  if (!cs || !os) {
    if (!isSilent) alert("Please fill in both gross salary fields.");
    return;
  }

  const resultDiv = document.getElementById("result");
  
  let originalBtnHTML = "";
  if (calcBtn && !isSilent) {
    originalBtnHTML = calcBtn.innerHTML;
    calcBtn.innerHTML = "<span class='animate-pulse'>RUNNING ANALYSIS...</span>";
    calcBtn.disabled = true;
    calcBtn.style.opacity = "0.7";
  }

  try {
    const cc_data = countryMetrics[cc];
    const oc_data = countryMetrics[oc];
    const currentCurrency = cc_data.currency;
    const targetCurrency = oc_data.currency;

    let ratesRes = cachedRatesRes;
    if (!isForexPreloaded || !ratesRes) {
      try {
        const res = await fetch("https://open.er-api.com/v6/latest/USD");
        ratesRes = await res.json();
      } catch (err) {
        ratesRes = { rates: { [currentCurrency]: 1, [targetCurrency]: 1 } };
      }
    }

    const currentRate = ratesRes.rates[currentCurrency] || 1;
    const targetRate = ratesRes.rates[targetCurrency] || 1;

    const csUSD = cs / currentRate;
    const osUSD = os / targetRate;

    const cc_ppp = cc_data.pppFactor;
    const oc_ppp = oc_data.pppFactor;
    const pppMultiplier = cc_ppp / oc_ppp;

    const equivalentOfferSalaryUSD = osUSD * pppMultiplier;
    
    const currentLifeValueLocal = cs; // Current salary is its own baseline
    const offerLifeValueLocal = equivalentOfferSalaryUSD * currentRate;

    const pppChangePct = ((offerLifeValueLocal - currentLifeValueLocal) / currentLifeValueLocal) * 100;

    if (resultDiv) resultDiv.classList.remove("hidden");

    const verdictBadge = document.getElementById("verdictBadge");
    const dynamicExplanation = document.getElementById("dynamicExplanation");
    
    if (verdictBadge && dynamicExplanation) {
      if (pppChangePct > 15) {
        verdictBadge.textContent = "Accept — Strong Financial Upgrade";
        verdictBadge.className = "text-[11px] font-black uppercase tracking-widest px-5 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 shadow-sm";
        dynamicExplanation.innerHTML = `Great news! Even adjusting for the local cost of goods, your lifestyle purchasing power increases by <b>${pppChangePct.toFixed(1)}%</b>. This means you will mathematically be able to afford a significantly better lifestyle in <b>${oc_data.name}</b> than you currently have in <b>${cc_data.name}</b>.`;
      } else if (pppChangePct >= -5 && pppChangePct <= 15) {
        verdictBadge.textContent = "Negotiate — Marginal Shift";
        verdictBadge.className = "text-[11px] font-black uppercase tracking-widest px-5 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 shadow-sm";
        dynamicExplanation.innerHTML = `Your purchasing power shift is marginal (<b>${pppChangePct.toFixed(1)}%</b>). While the absolute numbers might look different, your actual day-to-day standard of living will remain relatively similar in <b>${oc_data.name}</b> compared to <b>${cc_data.name}</b>.`;
      } else {
        verdictBadge.textContent = "Reject — Lifestyle Value Drops";
        verdictBadge.className = "text-[11px] font-black uppercase tracking-widest px-5 py-2 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-500 shadow-sm";
        dynamicExplanation.innerHTML = `Warning: Despite the numeric value of the offer, the high cost of living in <b>${oc_data.name}</b> means your true purchasing power actually <b>drops by ${Math.abs(pppChangePct).toFixed(1)}%</b>.`;
      }
    }

    

    const pppCurrent = document.getElementById("pppCurrent");
    const pppCurrentUSD = document.getElementById("pppCurrentUSD");
    const pppOffer = document.getElementById("pppOffer");
    const pppOfferUSD = document.getElementById("pppOfferUSD");
    const pppChangeEl = document.getElementById("pppChange");

    if (pppCurrent) pppCurrent.textContent = `${cc_data.symbol}${Math.round(currentLifeValueLocal).toLocaleString()} ${currentCurrency}`;
    if (pppCurrentUSD) pppCurrentUSD.textContent = `(${fmt(csUSD)} USD)`;
    
    if (pppOffer) pppOffer.textContent = `${cc_data.symbol}${Math.round(offerLifeValueLocal).toLocaleString()} ${currentCurrency}`;
    if (pppOfferUSD) pppOfferUSD.textContent = `(${fmt(equivalentOfferSalaryUSD)} USD)`;

    if (pppChangeEl) {
      const isPositive = pppChangePct >= 0;
      pppChangeEl.textContent = `${isPositive ? "▲ +" : "▼ "}${pppChangePct.toFixed(2)}%`;
      pppChangeEl.className = `text-2xl md:text-3xl font-black mt-1 ${isPositive ? "text-emerald-500" : "text-rose-500"}`;
    }

    const breakdownContent = document.getElementById("breakdownContent");
    if (breakdownContent) {
      breakdownContent.innerHTML = `
        <p class="font-bold text-sm uppercase tracking-wider border-b border-zinc-700/50 pb-1 mb-2 mt-1" style="color: var(--text-primary);">1. CONVERSION TO USD</p>
        <p>• Current: ${cs.toLocaleString()} ${currentCurrency} ÷ ${currentRate.toFixed(2)} = ${fmt(csUSD)} USD</p>
        <p>• Offered: ${os.toLocaleString()} ${targetCurrency} ÷ ${targetRate.toFixed(2)} = ${fmt(osUSD)} USD</p>
        
        <p class="font-bold text-sm uppercase tracking-wider border-b border-zinc-700/50 pb-1 mt-6 mb-2" style="color: var(--text-primary);">2. PPP EQUIVALENCE IN ${currentCurrency}</p>
        <p>• PPP Multiplier: ${cc_ppp.toFixed(2)} / ${oc_ppp.toFixed(2)} = ${pppMultiplier.toFixed(4)}</p>
        <p>• Offer (USD) × Multiplier: ${fmt(osUSD)} × ${pppMultiplier.toFixed(4)} = ${fmt(equivalentOfferSalaryUSD)} USD</p>
        <p>• Equivalent Target (${currentCurrency}): ${fmt(equivalentOfferSalaryUSD)} USD × ${currentRate.toFixed(2)} (Rate) = <b>${Math.round(offerLifeValueLocal).toLocaleString()} ${currentCurrency}</b></p>
        
        <p class="font-bold text-sm uppercase tracking-wider border-b border-zinc-700/50 pb-1 mt-6 mb-2" style="color: var(--text-primary);">3. PERCENTAGE SHIFT</p>
        <p>• Formula: ((Equivalent Target - Current) ÷ Current) × 100</p>
        <p>• Math: ((${Math.round(offerLifeValueLocal).toLocaleString()} - ${cs.toLocaleString()}) ÷ ${cs.toLocaleString()}) × 100</p>
        <p>• Final Shift: <b>${pppChangePct >= 0 ? "+" : ""}${pppChangePct.toFixed(2)}%</b></p>
      `;
    }

    if (!isSilent) resultDiv?.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (e) {
    console.error(e);
  } finally {
    if (calcBtn && !isSilent) {
      calcBtn.innerHTML = originalBtnHTML;
      calcBtn.disabled = false;
      calcBtn.style.opacity = "1";
    }
  }
}

// Replace your existing copyBreakdownBtn listener with this:
document.getElementById("copyBreakdownBtn")?.addEventListener("click", () => {
  const targetContainer = document.getElementById("breakdownContent");
  if (!targetContainer) return;
  
  const textToCopy = (targetContainer.innerText || targetContainer.textContent || "").trim();
  const btnText = document.getElementById("copyBtnText");

  // Attempt 1: Modern Clipboard API
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(textToCopy).then(() => {
      showCopiedFeedback(btnText);
    }).catch(() => {
      fallbackCopyText(textToCopy, btnText); // Error pe fallback
    });
  } else {
    // Attempt 2: Fallback for older/mobile browsers
    fallbackCopyText(textToCopy, btnText);
  }
});

function fallbackCopyText(text: string, btnText: HTMLElement | null) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  document.body.appendChild(textArea);
  textArea.select();
  try {
    document.execCommand("copy");
    showCopiedFeedback(btnText);
  } catch (err) {
    console.error("Fallback copy failed", err);
  }
  document.body.removeChild(textArea);
}

function showCopiedFeedback(btnText: HTMLElement | null) {
  if (btnText) {
    btnText.textContent = "Copied!";
    setTimeout(() => { btnText.textContent = "Copy"; }, 2000);
  }
}

calcBtn?.addEventListener("click", () => engineCompute(false));

document.getElementById("showCalcBtn")?.addEventListener("click", () => {
  const breakdown = document.getElementById("calcBreakdown");
  const btn = document.getElementById("showCalcBtn");
  if (breakdown && btn) {
    breakdown.classList.toggle("hidden");
    btn.textContent = breakdown.classList.contains("hidden") ? "Show Calculation Breakdown ↓" : "Hide Calculation Breakdown ↑";
  }
});

document.addEventListener("DOMContentLoaded", () => {

  document.addEventListener("DOMContentLoaded", () => {
  // 1. Agar URL mein koi desh select nahi hai, toh India/US set karo
  const urlParams = new URLSearchParams(window.location.search);
  if (!urlParams.get('from') && currentCountryEl) {
    currentCountryEl.value = 'IN';
    currentSymbolEl!.textContent = countryMetrics['IN'].symbol;
  }
  if (!urlParams.get('to') && offerCountryEl) {
    offerCountryEl.value = 'US';
    offerSymbolEl!.textContent = countryMetrics['US'].symbol;
  }

  // 2. Disable exclusion sync
  syncDropdownExclusion();
  
  // ... baaki ka existing code ...
 });

  const urlParams = new URLSearchParams(window.location.search);
  const urlFrom = urlParams.get('from');
  const urlTo = urlParams.get('to');

  if (urlFrom && currentCountryEl) {
    currentCountryEl.value = urlFrom.toUpperCase();
    if (currentSymbolEl) currentSymbolEl.textContent = countryMetrics[urlFrom.toUpperCase()]?.symbol || "$";
  }
  if (urlTo && offerCountryEl) {
    offerCountryEl.value = urlTo.toUpperCase();
    if (offerSymbolEl) offerSymbolEl.textContent = countryMetrics[urlTo.toUpperCase()]?.symbol || "$";
  }

  const currentSalaryInp = document.getElementById("currentSalary") as HTMLInputElement;
  const offerSalaryInp = document.getElementById("offerSalary") as HTMLInputElement;

  if (currentSalaryInp) {
    // 1. Auto-focus on page load
    setTimeout(() => { currentSalaryInp.focus(); }, 150);
    
    // 2. Pressing Enter moves focus to offer input
    currentSalaryInp.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        offerSalaryInp?.focus();
      }
    });
  }

  if (offerSalaryInp) {
    offerSalaryInp.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        document.getElementById("calcBtn")?.click();
      }
    });
  }

  document.querySelectorAll('.country-search').forEach(searchBar => {
    searchBar.addEventListener('input', (e) => {
      const searchTerm = (e.target as HTMLInputElement).value.toLowerCase();
      const select = (e.target as HTMLElement).nextElementSibling as HTMLSelectElement;
      if(select) {
        Array.from(select.options).forEach(option => {
          option.style.display = option.text.toLowerCase().includes(searchTerm) ? '' : 'none';
        });
      }
    });
  });

  document.querySelectorAll('.converter-search').forEach(searchBar => {
    searchBar.addEventListener('input', (e) => {
      const searchTerm = (e.target as HTMLInputElement).value.toLowerCase();
      const select = (e.target as HTMLElement).nextElementSibling as HTMLSelectElement;
      if(select) {
        Array.from(select.options).forEach(option => {
          option.style.display = option.text.toLowerCase().includes(searchTerm) ? '' : 'none';
        });
      }
    });
  });

  document.querySelectorAll(".faq-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const answer = btn.nextElementSibling;
      const icon = btn.querySelector(".faq-icon");
      document.querySelectorAll(".faq-btn").forEach((other) => {
        if (other !== btn) {
          other.nextElementSibling?.classList.add("hidden");
          other.querySelector(".faq-icon")?.classList.remove("rotate-180");
        }
      });
      answer?.classList.toggle("hidden");
      icon?.classList.toggle("rotate-180");
    });
  });
});

// FOREX WIDGET IMPLEMENTATION
const triggerBtn = document.getElementById("converterTriggerBtn")!;
const expandedPanel = document.getElementById("converterExpandedPanel")!;
const closeBtn = document.getElementById("closeConverterBtn")!;
const timedPopBubble = document.getElementById("converterTimedPop")!;

const srcCountrySelect = document.getElementById("instantSrcCountry") as HTMLSelectElement;
const targetCountrySelect = document.getElementById("instantTargetCountry") as HTMLSelectElement;
const srcAmountInput = document.getElementById("instantSrcAmount") as HTMLInputElement;
const targetAmountInput = document.getElementById("instantTargetAmount") as HTMLInputElement;

let liveConverterRates: Record<string, number> = {
  INR: 95.10, USD: 1.00, GBP: 0.78, EUR: 0.92, CAD: 1.36, AUD: 1.51, AED: 3.67, SGD: 1.35
};

function runLoopingPopSystem() {
  setTimeout(() => {
    showTimedPopNotification();
    setInterval(() => { showTimedPopNotification(); }, 45000);
  }, 15000);
}

function showTimedPopNotification() {
  if (expandedPanel && expandedPanel.style.display !== "block") {
    timedPopBubble.classList.remove("opacity-0", "translate-y-2");
    timedPopBubble.classList.add("opacity-100", "translate-y-0");
    setTimeout(() => {
      timedPopBubble.classList.remove("opacity-100", "translate-y-0");
      timedPopBubble.classList.add("opacity-0", "translate-y-2");
    }, 4000);
  }
}

if(triggerBtn) {
  triggerBtn.addEventListener("click", () => {
    triggerBtn.style.display = "none";
    timedPopBubble.classList.remove("opacity-100", "translate-y-0");
    timedPopBubble.classList.add("opacity-0", "translate-y-2");
    expandedPanel.classList.remove("hidden");
    expandedPanel.style.display = "block";
    setTimeout(() => {
      expandedPanel.classList.remove("scale-95", "opacity-0");
      expandedPanel.classList.add("scale-100", "opacity-100");
    }, 10);
    syncCalculationsEngine('source');
  });
}

if(closeBtn) {
  closeBtn.addEventListener("click", () => {
    expandedPanel.classList.remove("scale-100", "opacity-100");
    expandedPanel.classList.add("scale-95", "opacity-0");
    setTimeout(() => {
      expandedPanel.style.display = "none";
      expandedPanel.classList.add("hidden");
      if(triggerBtn) triggerBtn.style.display = "flex";
    }, 200);
  });
}

function getCurrencyToken(countryCode: string): string {
  const tokens: Record<string, string> = {
    IN: "INR", US: "USD", GB: "GBP", DE: "EUR", CA: "CAD", AU: "AUD", AE: "AED", SG: "SGD",
    NL: "EUR", FR: "EUR", PK: "PKR", BD: "BDT", NG: "NGN", BR: "BRL", MX: "MXN", PH: "PHP",
    JP: "JPY", KR: "KRW", CH: "CHF", SE: "SEK", NO: "NOK", DK: "DKK", IE: "EUR", NZ: "NZD",
    ZA: "ZAR", EG: "EGP", KE: "KES", QA: "QAR", SA: "SAR", BH: "BHD", KW: "KWD", OM: "OMR"
  };
  return tokens[countryCode] || "USD";
}

function syncCalculationsEngine(activeSource: 'source' | 'target') {
  if (!srcCountrySelect || !targetCountrySelect || !srcAmountInput || !targetAmountInput) return;
  const srcCurrency = getCurrencyToken(srcCountrySelect.value);
  const targetCurrency = getCurrencyToken(targetCountrySelect.value);
  const currentUSDRes = (window as any).latestFetchedRates;
  if (currentUSDRes && currentUSDRes.rates) { liveConverterRates = currentUSDRes.rates; }
  const srcRateUSD = liveConverterRates[srcCurrency] || 1;
  const targetRateUSD = liveConverterRates[targetCurrency] || 1;

  if (activeSource === 'source') {
    const srcVal = parseFloat(srcAmountInput.value);
    if (isNaN(srcVal)) { targetAmountInput.value = ""; return; }
    targetAmountInput.value = ((srcVal / srcRateUSD) * targetRateUSD).toFixed(2);
  } else {
    const targetVal = parseFloat(targetAmountInput.value);
    if (isNaN(targetVal)) { srcAmountInput.value = ""; return; }
    srcAmountInput.value = ((targetVal / targetRateUSD) * srcRateUSD).toFixed(2);
  }
}

if(srcAmountInput) srcAmountInput.addEventListener("input", () => syncCalculationsEngine('source'));
if(targetAmountInput) targetAmountInput.addEventListener("input", () => syncCalculationsEngine('target'));
if(srcCountrySelect) srcCountrySelect.addEventListener("change", () => syncCalculationsEngine('source'));
if(targetCountrySelect) targetCountrySelect.addEventListener("change", () => syncCalculationsEngine('source'));

runLoopingPopSystem();