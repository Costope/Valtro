
// function checkPWA() {
//   const isStandalone = 
//     window.matchMedia('(display-mode: standalone)').matches || 
//     window.navigator.standalone === true;

//   return isStandalone;
// }

// // Sofort beim Laden ausführen
// window.addEventListener("DOMContentLoaded", () => {
//   if (!checkPWA()) {
//     alert("Bitte füge die Website zu deinem Home-Bildschirm hinzu und öffne sie als PWA!");

//     document.body.innerHTML = `
//       <div style="display: flex; justify-content: center; align-items: center; height: 100vh; text-align: center; font-family: sans-serif; padding: 20px;">
//         <div>
//           <h2>Zugriff verweigert</h2>
//           <p>Diese Anwendung kann nur genutzt werden, wenn sie als PWA vom Home-Bildschirm aus gestartet wird.</p>
//         </div>
//       </div>
//     `;
//   }
// });

// hab ich jetzt gelassen weil das wirkt so streng


function checkPWA() {
  const isStandalone = 
    window.matchMedia('(display-mode: standalone)').matches || 
    window.navigator.standalone === true; // für alte ios versionen

  return isStandalone;
}

// sofort beim laden ausführen
window.addEventListener("DOMContentLoaded", () => {
  if (!checkPWA()) {
    alert("For the best experience, please launch the website as a PWA from your home screen!\n\n1. Tap the Share button (at the bottom)\n2. Select “Add to Home Screen”\n3. Launch Valtro from there");
      }
    });

const resetBtn = document.querySelector(".reset-btn");

if (resetBtn) {
  resetBtn.addEventListener("click", () => {
    // nativer ios modal confirm dialog
    const confirmed = window.confirm("Do you really want to reset all values? This action cannot be undone.");
    
    if (confirmed) {
      // clean!!
      const textInputs = ["start-capital", "deposit-amount", "interest-rate", "duration"];
      textInputs.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = "";
      });

      const defaultInterval = document.getElementById("int-monthly");
      if (defaultInterval) defaultInterval.checked = true;

      if (typeof recalculate === "function") {
        recalculate();
      }
    }
  });
}



const state = {
  endkapital: 0,
  einzahlung: 0,
  rendite: 0,
  animationFrame: null,
  toastTimeout: null,
};

// German locale Euro formatter
function formatEUR(val, withPlusSign = false) {
  const rounded = Math.round(val);
  const formatted =
    new Intl.NumberFormat("de-DE", {
      style: "decimal",
      maximumFractionDigits: 0,
    }).format(rounded) + " €";

  if (withPlusSign && rounded > 0) {
    return "+" + formatted;
  }
  return formatted;
}

function parseGermanNumber(str) {
  if (typeof str !== "string") str = String(str || "");
  if (!str.trim()) return 0;
  
  const clean = str.replace(/\./g, "").replace(",", ".");
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

function formatInputGerman(inputElement) {
  let raw = inputElement.value.replace(/[^\d,]/g, "");
  const parts = raw.split(",");
  if (parts[0]) {
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  inputElement.value = parts.slice(0, 2).join(",");
}

function animateCounters(targetEndkapital, targetEinzahlung, targetRendite) {
  const startEnd = state.endkapital;
  const startEin = state.einzahlung;
  const startRen = state.rendite;

  const duration = 400; // Milliseconds
  const startTime = performance.now();

  if (state.animationFrame) {
    cancelAnimationFrame(state.animationFrame);
  }

  const endkapitalEl = document.getElementById("counter-endkapital");
  const einzahlungEl = document.getElementById("val-einzahlung");
  const renditeEl = document.getElementById("val-rendite");

  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);

    const easeOut = 1 - Math.pow(1 - progress, 3);

    const currentEnd = startEnd + (targetEndkapital - startEnd) * easeOut;
    const currentEin = startEin + (targetEinzahlung - startEin) * easeOut;
    const currentRen = startRen + (targetRendite - startRen) * easeOut;

    if (endkapitalEl) endkapitalEl.textContent = formatEUR(currentEnd);
    if (einzahlungEl) einzahlungEl.textContent = formatEUR(currentEin);

    if (renditeEl) {
      renditeEl.textContent = formatEUR(currentRen, true);

      if (currentRen < 0) {
        renditeEl.classList.remove("positive");
        renditeEl.classList.add("negative");
      } else {
        renditeEl.classList.remove("negative");
        renditeEl.classList.add("positive");
      }
    }

    if (progress < 1) {
      state.animationFrame = requestAnimationFrame(step);
    } else {
      state.endkapital = targetEndkapital;
      state.einzahlung = targetEinzahlung;
      state.rendite = targetRendite;
    }
  }

  state.animationFrame = requestAnimationFrame(step);
}

function recalculate() {
  const startCapitalEl = document.getElementById("start-capital");
  const depositAmountEl = document.getElementById("deposit-amount");
  const interestRateEl = document.getElementById("interest-rate");
  const durationEl = document.getElementById("duration");
  const selectedIntervalEl = document.querySelector('input[name="interval"]:checked');

  const startCapital = parseGermanNumber(startCapitalEl ? startCapitalEl.value : 0);
  const depositPerPeriod = parseGermanNumber(depositAmountEl ? depositAmountEl.value : 0);
  const annualInterest = parseGermanNumber(interestRateEl ? interestRateEl.value : 0) / 100;
  const years = parseGermanNumber(durationEl ? durationEl.value : 0);

  const selectedInterval = selectedIntervalEl ? selectedIntervalEl.value : "monthly";

  let periodsPerYear = 12;
  if (selectedInterval === "quarterly") periodsPerYear = 4;
  if (selectedInterval === "yearly") periodsPerYear = 1;

  const totalPeriods = Math.max(0, years * periodsPerYear);
  const ratePerPeriod = annualInterest / periodsPerYear;

  let endKapital = startCapital * Math.pow(1 + ratePerPeriod, totalPeriods);

  if (ratePerPeriod !== 0) {
    endKapital +=
      depositPerPeriod *
      ((Math.pow(1 + ratePerPeriod, totalPeriods) - 1) / ratePerPeriod);
  } else {
    endKapital += depositPerPeriod * totalPeriods;
  }

  const totalDeposits = startCapital + depositPerPeriod * totalPeriods;
  const totalReturn = endKapital - totalDeposits;

  animateCounters(
    isNaN(endKapital) ? 0 : endKapital,
    isNaN(totalDeposits) ? 0 : totalDeposits,
    isNaN(totalReturn) ? 0 : totalReturn,
  );
}

function copyValue() {
  const textToCopy = formatEUR(state.endkapital);

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(textToCopy).catch((err) => {
      console.error("Error copying to clipboard:", err);
    });
  } else {
    const tempInput = document.createElement("input");
    tempInput.value = textToCopy;
    document.body.appendChild(tempInput);
    tempInput.select();
    try {
      document.execCommand("copy");
    } catch (err) {
      console.error("Error:", err);
    }
    document.body.removeChild(tempInput);
  }

  const toast = document.getElementById("toast");
  if (toast) {
    if (state.toastTimeout) {
      clearTimeout(state.toastTimeout);
    }

    toast.classList.remove("show");
    
    void toast.offsetWidth;

    toast.classList.add("show");

    state.toastTimeout = setTimeout(() => {
      toast.classList.remove("show");
      state.toastTimeout = null;
    }, 2000);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const textInputs = [
    "start-capital",
    "deposit-amount",
    "interest-rate",
    "duration",
  ];

  textInputs.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;

    el.addEventListener("input", (e) => {
      if (id === "start-capital" || id === "deposit-amount") {
        formatInputGerman(e.target);
      }
      recalculate();
    });
  });

  document.querySelectorAll('input[name="interval"]').forEach((radio) => {
    radio.addEventListener("change", recalculate);
  });

  const copyBtn = document.getElementById("copyBtn");
  if (copyBtn) {
    copyBtn.addEventListener("click", copyValue);
  }
  
  const shareBtn = document.querySelector(".secondary-btn");
  if (shareBtn) {
    shareBtn.addEventListener("click", shareResult);
  }
  
  recalculate();
});




// Teilen-Funktion (Web Share API)
async function shareResult() {
  const endkapitalStr = formatEUR(state.endkapital);
  const einzahlungStr = formatEUR(state.einzahlung);
  const renditeStr = formatEUR(state.rendite);

  // Der vollständige Text inklusive Link
  const shareText = `Look what I have calculated with Valtro!\n\n` +
                    `💰 Result: ${endkapitalStr}\n` +
                    `📥 Payment: ${einzahlungStr}\n` +
                    `📈 Return: ${renditeStr}\n\n` +
                    `Calculate your result at https://valtro.costope.dev`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: "Valtro Compound Interest Result",
        text: shareText
      });
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Error sharing:", err);
      }
    }
  } else {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(shareText).then(() => {
        showToast("Result copied!");
      });
    } else {
      fallbackCopy(shareText);
    }
  }
}