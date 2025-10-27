// --- 1. GLOBAL ELEMENTS ---
const tryCalcBtn = document.getElementById("try-calc");
const navbar = document.getElementById("navbar");
const calcForm = document.getElementById("calcForm");
const dtiRatioEl = document.getElementById("dti-ratio");
const dtiMessageEl = document.getElementById("dti-message");
const monthlyRepaymentEl = document.getElementById("monthly-repayment");
const totalRepayableEl = document.getElementById("total-repayable");
const affordabilityActionsEl = document.getElementById('affordability-actions');

let loanChart;

// --- 2. DYNAMIC TEXT HEADER (Currently points to a missing element: #dynamic-text) ---
// Note: Since #dynamic-text is not in your HTML, this function will not work as intended.
// I've kept it here in case you add the element back.
const dynamicTextEl = document.getElementById('dynamic-text');
const phrases = ["True Monthly Payment", "Total Bond Cost", "Hidden Fees"];
let phraseIndex = 0;
let charIndex = 0;
let isDeleting = false;

function typeEffect() {
    // Check if the element exists before trying to access it
    if (!dynamicTextEl) return; 

    const currentPhrase = phrases[phraseIndex];

    if (isDeleting) {
        dynamicTextEl.textContent = currentPhrase.substring(0, charIndex - 1) + '|';
        charIndex--;
    } else {
        dynamicTextEl.textContent = currentPhrase.substring(0, charIndex + 1) + '|';
        charIndex++;
    }

    if (!isDeleting && charIndex === currentPhrase.length) {
        isDeleting = true;
        setTimeout(typeEffect, 1500);
    } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        phraseIndex = (phraseIndex + 1) % phrases.length;
        setTimeout(typeEffect, 500);
    } else {
        const speed = isDeleting ? 50 : 100;
        setTimeout(typeEffect, speed);
    }
}
document.addEventListener("DOMContentLoaded", typeEffect);


// --- 3. UI INTERACTIONS ---
// Sticky Navbar
window.addEventListener("scroll", function() {
    if (window.scrollY > 50) {
        navbar.classList.add("scrolled");
    } else {
        navbar.classList.remove("scrolled");
    }
});

// Scroll to Calculator
function linkToCalc(event) {
    event.preventDefault();
    tryCalcBtn.classList.add("clicked");
    setTimeout(() => tryCalcBtn.classList.remove("clicked"), 300);
    document.getElementById("calculator").scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}
tryCalcBtn.addEventListener("click", linkToCalc);

// --- 4. MAIN CALCULATION LOGIC (SA Context) ---
calcForm.addEventListener('submit', function(e) {
    e.preventDefault();
    calculateAffordability();
});

function calculateAffordability() {
    // Show loading overlay
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.classList.add('active');
    
    // Hide results initially
    const resultsColumn = document.querySelector('.results-column');
    resultsColumn.classList.remove('visible');
    
    // Simulate calculation delay (remove this in production if you want instant results)
    setTimeout(() => {
        const price = parseFloat(document.getElementById('price').value);
        const income = parseFloat(document.getElementById('income').value);
        const expenses = parseFloat(document.getElementById('expenses').value);
        const rate = parseFloat(document.getElementById('rate').value);
        const term = parseFloat(document.getElementById('term').value);
        const monthlyRate = (rate / 100) / 12;
        const termMonths = term * 12;
        const location = document.getElementById('location').value;

        let costMultiplier = 1;
        switch (location) {
            case "cape-town":
                costMultiplier = 1.25;
                break;
            case "joburg":
                costMultiplier = 1.1;
                break;
            case "pretoria":
                costMultiplier = 1.05;
                break;
            case "durban":
                costMultiplier = 0.9;
                break;
            default:
                costMultiplier = 1;
        }

        // Bond Repayment calculations
        const numerator = monthlyRate * Math.pow((1 + monthlyRate), termMonths);
        const denominator = Math.pow((1 + monthlyRate), termMonths) - 1;
        let monthlyMortgage = price * (numerator / denominator);

        const totalRepayable = monthlyMortgage * termMonths;
        const totalInterest = totalRepayable - price;

        // Hidden Costs calculations
        const annualRatesTaxes = (price * 0.003) * costMultiplier;
        const monthlyRatesTaxes = annualRatesTaxes / 12;
        const monthlyInsurance = (price * 0.0003) * costMultiplier;
        const estimatedMaintenanceLevies = 800 * costMultiplier;

        const totalMonthlyRepayment = monthlyMortgage + monthlyRatesTaxes + monthlyInsurance + estimatedMaintenanceLevies;

        // DTI Calculation
        const dtiNumerator = expenses + totalMonthlyRepayment;
        const dtiRatio = (dtiNumerator / income) * 100;
        dtiRatioEl.textContent = dtiRatio.toFixed(1) + '%';

        // Display Results
        monthlyRepaymentEl.textContent = 'R ' + Math.round(totalMonthlyRepayment).toLocaleString('en-ZA');
        totalRepayableEl.textContent = 'R ' + Math.round(totalRepayable).toLocaleString('en-ZA');

        displayDtiCallout(dtiRatio);

        // Affordability Status
        const affordabilityStatusEl = document.getElementById("affordability-status");
        let statusText = '';
        let statusColor = '';

        if (totalMonthlyRepayment / income <= 0.25) {
            statusText = "Highly Affordable (Low Risk)";
            statusColor = '#1f7168';
        } else if (totalMonthlyRepayment / income <= 0.35) {
            statusText = "Standard Affordability";
            statusColor = '#E7B400';
        } else {
            statusText = "Risky/Likely Declined";
            statusColor = '#E53935';
        }

        affordabilityStatusEl.textContent = statusText;
        affordabilityStatusEl.style.backgroundColor = statusColor;
        affordabilityStatusEl.style.color = 'white';
        
        drawLoanChart(price, totalInterest);

        // TARGET ELEMENTS
        const resultsDiv = document.getElementById('results');
        const affordabilityActionsEl = document.getElementById('affordability-actions');

        // Display Progress Tracker
        const progressHTML = displayProgressTracker(income, expenses, totalMonthlyRepayment, price);

        // Display Smart Recommendation
        const recommendationHTML = getSmartRecommendation(income, expenses, price, location, dtiRatio);

        // Remove old enhancements
        const oldProgress = document.querySelector('.progress-tracker');
        if (oldProgress) oldProgress.remove();

        // Clear the left column
        affordabilityActionsEl.innerHTML = '';

        // Add new enhancements
        resultsDiv.insertAdjacentHTML('beforeend', progressHTML);
        affordabilityActionsEl.insertAdjacentHTML('beforeend', recommendationHTML);

        // Add PDF Download Button
        const pdfButtonHTML = `
            <button id="download-pdf-btn" style="
                width: 100%;
                padding: 15px;
                background: linear-gradient(135deg, #35C5B8 0%, #0E3531 100%);
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                margin-top: 20px;
                transition: transform 0.2s;
            " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                📄 Download Full Report (PDF)
            </button>
        `;

        affordabilityActionsEl.insertAdjacentHTML('beforeend', pdfButtonHTML);

        // Add PDF download functionality
        document.getElementById('download-pdf-btn').addEventListener('click', function() {
            const formData = {
                price: price,
                location: location === 'joburg' ? 'Johannesburg' :
                    location === 'cape-town' ? 'Cape Town' :
                    location === 'pretoria' ? 'Pretoria' :
                    location === 'durban' ? 'Durban' : 'Not specified',
                rate: rate,
                term: term,
                income: income,
                expenses: expenses
            };

            const results = {
                monthlyRepayment: Math.round(totalMonthlyRepayment),
                totalRepayable: Math.round(totalRepayable),
                dtiRatio: dtiRatio.toFixed(1),
                affordabilityStatus: statusText
            };

            generatePDFReport(formData, results);
        });

        // Hide loading overlay and show results with animation
        setTimeout(() => {
            loadingOverlay.classList.remove('active');
            resultsColumn.classList.add('visible');
            
            // Scroll to results smoothly
            resultsColumn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 300); // Small delay for smooth transition
        
    }, 1000); // 1 second loading animation (adjust this to make it faster/slower)
}

// ============================================
// CRITICAL FIXES AND NEW FEATURE FUNCTIONS
// ============================================

// --- CRITICAL FIX 1: DTI CALLOUT FUNCTION ---
function displayDtiCallout(dtiRatio) {
    const dtiMessageEl = document.getElementById("dti-message");
    let message = "";
    let bgColor = ""; 
    
    if (dtiRatio <= 30) {
        message = "Excellent. Your DTI is low. Highly likely to be approved.";
        bgColor = '#008000'; // Dark Green (Good)
    } else if (dtiRatio <= 35) {
        message = "Good. Your DTI is within bank limits for high approval.";
        bgColor = '#1f7168'; // Dark Teal (Acceptable)
    } else if (dtiRatio <= 40) {
        // This is your current "orange" state
        message = "Warning. Your DTI is high. Banks may decline the loan or require a large deposit.";
        bgColor = '#CC8400'; // Strong, Opaque Orange/Gold (Caution)
    } else {
        message = "Critical. Your DTI is too high. You must reduce expenses or increase income to qualify.";
        bgColor = '#D00000'; // Strong Red (Critical)
    }

    dtiMessageEl.textContent = message;
    // CRITICAL: Set the background color here, and the text is forced white via CSS
    dtiMessageEl.style.backgroundColor = bgColor;
}

// --- CRITICAL FIX 2: CHART DRAWING FUNCTION ---
function drawLoanChart(principal, interest) {
    const ctx = document.getElementById('loanChart').getContext('2d');

    if (loanChart) {
        loanChart.destroy();
    }

    loanChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Total Bond Cost Breakdown'],
            datasets: [{
                label: 'Principal (Rands)',
                data: [principal],
                backgroundColor: '#2b8c82ff',
                borderColor: 'white',
                borderWidth: 1
            },
            {
                label: 'Interest Paid (Rands)',
                data: [interest],
                backgroundColor: 'rgba(255, 255, 255, 0.4)',
                borderColor: 'rgba(255, 255, 255, 0.8)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: true,
                    ticks: {
                        color: 'white',
                        callback: function(value, index, values) {
                            return 'R' + (value/1000000).toFixed(1) + 'M'; 
                        }
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                y: {
                    stacked: true,
                    ticks: { color: 'white' },
                    grid: { display: false }
                }
            },
            plugins: {
                legend: { labels: { color: 'white' } },
                title: {
                    display: true,
                    text: 'Total Bond Cost Breakdown (R' + (principal + interest).toLocaleString('en-ZA') + ')',
                    color: 'white',
                    font: { size: 16 }
                }
            }
        }
    });
}


// --- NEW FEATURE 1: PROGRESS TRACKER ---
function displayProgressTracker(income, expenses, totalMonthlyRepayment, price) {
    const maxAffordablePayment = income * 0.35; // 35% DTI threshold
    const currentPayment = expenses + totalMonthlyRepayment;
    const shortfall = currentPayment - maxAffordablePayment;

    let trackerHTML = '<div class="progress-tracker" style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 8px; margin: 20px 0;">';
    trackerHTML += '<h3 style="margin-top: 0;">💡 Path to Affordability</h3>';

    if (shortfall <= 0) {
        trackerHTML += '<p style="color: #0d6444ff; font-weight: bold;">✅ You can already afford this property!</p>';
    } else {
        const reduceExpenses = Math.ceil(shortfall);
        const increaseIncome = Math.ceil(shortfall / 0.35);

        trackerHTML += `<p style="margin-bottom: 15px;">You're <strong style="color: #e94409ff; font-weight: bold">R${reduceExpenses.toLocaleString('en-ZA')}</strong> away from comfortable affordability.</p>`;
        trackerHTML += '<div style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 6px; margin-bottom: 10px;">';
        trackerHTML += `<p style="margin: 0;"><strong>Option 1:</strong> Reduce monthly expenses by <span style="color: #022424ff; font-weight: bold;">R${reduceExpenses.toLocaleString('en-ZA')}</span></p>`;
        trackerHTML += '</div>';
        trackerHTML += '<div style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 6px;">';
        trackerHTML += `<p style="margin: 0;"><strong>OR Option 2:</strong> Increase monthly income by <span style="color: #022424ff; font-weight: bold;">R${increaseIncome.toLocaleString('en-ZA')}</span></p>`;
        trackerHTML += '</div>';
    }

    trackerHTML += '</div>';

    return trackerHTML;
}

// --- NEW FEATURE 2: SMART RECOMMENDATIONS ---
function getSmartRecommendation(income, expenses, price, location, dtiRatio) {
    const recommendations = [];

    // Income-based recommendations
    if (income < 15000) {
        recommendations.push({
            icon: '💼',
            title: 'Consider Co-Buying',
            message: 'Partner with a spouse or family member to combine incomes and increase your buying power.'
        });
    }

    if (location === 'cape-town') {
        recommendations.push({
            icon: '🌊',
            title: 'Cape Town Alternatives',
            message: 'Consider Bellville, Brackenfell, or Durbanville for better value while staying in the Western Cape.'
        });
    }

    if (dtiRatio > 45) {
        recommendations.push({
            icon: '💳',
            title: 'Reduce Debt First',
            message: 'Pay off high-interest debt before applying for a bond to significantly improve your DTI ratio.'
        });
    } else if (dtiRatio <= 35) {
        recommendations.push({
            icon: '⬆️',
            title: 'Room to Upgrade',
            message: 'Your DTI is excellent! You could potentially afford a property up to 15% more expensive.'
        });
    }

    if (price > income * 72) {
        recommendations.push({
            icon: '📉',
            title: 'Lower Price Range',
            message: `Consider properties around R${Math.floor(income * 60).toLocaleString('en-ZA')}k for better affordability and approval chances.`
        });
    }

    recommendations.push({
        icon: '🏦',
        title: 'First Home Finance',
        message: 'Check if you qualify for the FLISP subsidy (for properties under R600k and income under R22k/month).'
    });

    const randomRec = recommendations[Math.floor(Math.random() * recommendations.length)];

    let recHTML = '<div class="smart-recommendation" style="background: linear-gradient(135deg, #35C5B8 0%, #0E3531 100%); padding: 20px; border-radius: 8px; margin: 20px 0; color: white;">';
    recHTML += `<div style="font-size: 32px; margin-bottom: 10px;">${randomRec.icon}</div>`;
    recHTML += `<h3 style="margin: 0 0 10px 0;">${randomRec.title}</h3>`;
    recHTML += `<p style="margin: 0; opacity: 0.95;">${randomRec.message}</p>`;
    recHTML += '</div>';

    return recHTML;
}

// --- NEW FEATURE 3: PDF REPORT GENERATION ---
function generatePDFReport(formData, results) {
    const {
        jsPDF
    } = window.jspdf;
    const doc = new jsPDF();

    // Header
    doc.setFillColor(14, 53, 49);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.text('HouseScope', 20, 20);
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text('Home Affordability Report', 20, 30);

    // Date
    doc.setFontSize(10);
    const today = new Date().toLocaleDateString('en-ZA');
    doc.text(`Generated: ${today}`, 150, 25);

    // Reset text color for body
    doc.setTextColor(0, 0, 0);

    // Property Details Section
    let y = 55;
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('Property Details', 20, y);

    y += 10;
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.text(`Property Price: R${formData.price.toLocaleString('en-ZA')}`, 20, y);
    y += 7;
    doc.text(`Location: ${formData.location || 'Not specified'}`, 20, y);
    y += 7;
    doc.text(`Interest Rate: ${formData.rate}%`, 20, y);
    y += 7;
    doc.text(`Loan Term: ${formData.term} years`, 20, y);

    // Financial Summary Section
    y += 15;
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('Financial Summary', 20, y);

    y += 10;
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.text(`Monthly Income: R${formData.income.toLocaleString('en-ZA')}`, 20, y);
    y += 7;
    doc.text(`Monthly Expenses: R${formData.expenses.toLocaleString('en-ZA')}`, 20, y);
    y += 7;
    doc.text(`Debt-to-Income Ratio: ${results.dtiRatio}%`, 20, y);

    // Affordability Results Section
    y += 15;
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('Affordability Results', 20, y);

    y += 10;
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');

    // Highlight box for monthly repayment
    doc.setFillColor(53, 197, 184, 20);
    doc.roundedRect(18, y - 5, 174, 10, 2, 2, 'F');
    doc.setFont(undefined, 'bold');
    doc.text(`Total Monthly Repayment: R${results.monthlyRepayment.toLocaleString('en-ZA')}`, 20, y);

    y += 12;
    doc.setFont(undefined, 'normal');
    doc.text(`Total Amount Repayable: R${results.totalRepayable.toLocaleString('en-ZA')}`, 20, y);
    y += 7;
    doc.text(`Affordability Status: ${results.affordabilityStatus}`, 20, y);

    // Monthly Cost Breakdown
    y += 15;
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('Monthly Cost Breakdown (Estimated)', 20, y);

    y += 10;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text('• Bond Repayment (Principal + Interest)', 25, y);
    y += 6;
    doc.text('• Rates & Taxes (Municipal charges)', 25, y);
    y += 6;
    doc.text('• Home Insurance (Bond + Contents)', 25, y);
    y += 6;
    doc.text('• Maintenance/Levies (Estimated)', 25, y);

    // Disclaimer
    y += 15;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    const disclaimer = 'Disclaimer: All calculations are estimates based on publicly available data. This report is for informational purposes only and does not constitute financial advice. Please consult a qualified financial advisor before making any decisions.';
    const splitDisclaimer = doc.splitTextToSize(disclaimer, 170);
    doc.text(splitDisclaimer, 20, y);

    // Footer
    doc.setFillColor(14, 53, 49);
    doc.rect(0, 280, 210, 17, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text('HouseScope © 2025 | Find out how affordable your dream home is', 105, 290, {
        align: 'center'
    });

    // Save the PDF
    doc.save(`HouseScope-Affordability-Report-${today}.pdf`);
}


// --- ACCORDION TOGGLE LOGIC ---
document.addEventListener('DOMContentLoaded', () => {
    // Select all accordion buttons
    const headers = document.querySelectorAll('.accordion-header');

    headers.forEach(header => {
        header.addEventListener('click', () => {
            const targetId = header.getAttribute('data-target');
            const content = document.getElementById(targetId);
            const isExpanded = header.getAttribute('aria-expanded') === 'true';

            // Toggle ARIA attribute
            header.setAttribute('aria-expanded', !isExpanded);

            // Toggle visibility (for screen readers/SEO)
            content.hidden = isExpanded;

            // Toggle visual display using max-height for smooth transition
            if (isExpanded) {
                content.style.maxHeight = 0;
            } else {
                // Set height to scroll height to enable smooth collapse/expand
                content.style.maxHeight = content.scrollHeight + "px";
            }
        });
    });
});