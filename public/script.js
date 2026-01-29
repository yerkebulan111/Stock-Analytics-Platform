const API_BASE_URL = 'http://localhost:3000/api';

let dataChart = null;

const companySelect = document.getElementById('company-select');
const fieldSelect = document.getElementById('field-select');
const startDateInput = document.getElementById('start-date');
const endDateInput = document.getElementById('end-date');
const fetchDataBtn = document.getElementById('fetch-data-btn');
const fetchMetricsBtn = document.getElementById('fetch-metrics-btn');
const loadingDiv = document.getElementById('loading');
const errorMessageDiv = document.getElementById('error-message');
const metricsSection = document.getElementById('metrics-section');
const chartSection = document.getElementById('chart-section');
const chartCanvas = document.getElementById('dataChart');
const chartInfo = document.getElementById('chart-info');
const metricsContainer = document.getElementById('metrics-container');
const selectedChipsContainer = document.getElementById('selected-companies-chips');


const COMPANY_COLORS = [
    { border: 'rgb(102, 126, 234)', bg: 'rgba(102, 126, 234, 0.1)' },
    { border: 'rgb(118, 75, 162)', bg: 'rgba(118, 75, 162, 0.1)' },
    { border: 'rgb(255, 99, 132)', bg: 'rgba(255, 99, 132, 0.1)' },
    { border: 'rgb(54, 162, 235)', bg: 'rgba(54, 162, 235, 0.1)' },
    { border: 'rgb(255, 206, 86)', bg: 'rgba(255, 206, 86, 0.1)' }
];


document.addEventListener('DOMContentLoaded', () => {
    loadCompanies();
    setupEventListeners();
});


function setupEventListeners() {
    fetchDataBtn.addEventListener('click', fetchAndVisualizeData);
    fetchMetricsBtn.addEventListener('click', fetchMetrics);
    
    
    companySelect.addEventListener('change', () => {
        const selected = Array.from(companySelect.selectedOptions);
        if (selected.length > 5) {
            showError('You can select maximum 5 companies at once');
            selected[selected.length - 1].selected = false;
        }
        updateSelectedChips();
    });
}



function getSelectedCompanies() {
    const selected = Array.from(companySelect.selectedOptions)
        .map(option => option.value)
        .filter(value => value !== '');
    return selected;
}


function updateSelectedChips() {
    const selectedCompanies = getSelectedCompanies();
    selectedChipsContainer.innerHTML = '';
    
    selectedCompanies.forEach((company, index) => {
        const chip = document.createElement('div');
        chip.className = 'chip';
        chip.innerHTML = `
            <span>${company}</span>
            <span class="chip-remove" data-company="${company}">×</span>
        `;
        
        
        const removeBtn = chip.querySelector('.chip-remove');
        removeBtn.addEventListener('click', () => {
            const option = Array.from(companySelect.options).find(opt => opt.value === company);
            if (option) {
                option.selected = false;
            }
            updateSelectedChips();
        });
        
        selectedChipsContainer.appendChild(chip);
    });
}


async function loadCompanies() {
    try {
        const response = await fetch(`${API_BASE_URL}/companies`);
        const data = await response.json();

        if (data.companies) {
            companySelect.innerHTML = '';
            
            
            data.companies.forEach(company => {
                const option = document.createElement('option');
                option.value = company;
                option.textContent = company;
                companySelect.appendChild(option);
            });
            
            
            if (data.companies.length > 0) {
                const defaultCompany = data.companies.find(c => c === 'AAPL' || c === 'A') || data.companies[0];
                const defaultOption = Array.from(companySelect.options).find(opt => opt.value === defaultCompany);
                if (defaultOption) {
                    defaultOption.selected = true;
                }
                
                updateSelectedChips();
            }
        }
    } catch (error) {
        console.error('Error loading companies:', error);
        showError('Failed to load companies');
    }
}


function showLoading() {
    loadingDiv.style.display = 'block';
    errorMessageDiv.style.display = 'none';
}


function hideLoading() {
    loadingDiv.style.display = 'none';
}


function showError(message) {
    errorMessageDiv.textContent = `Error: ${message}`;
    errorMessageDiv.style.display = 'block';
    hideLoading();
}


function hideError() {
    errorMessageDiv.style.display = 'none';
}


async function fetchAndVisualizeData() {
    hideError();
    showLoading();

    const field = fieldSelect.value;
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;
    const selectedCompanies = getSelectedCompanies();

    
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
        showError('Start date must be before end date');
        return;
    }

    
    if (selectedCompanies.length === 0) {
        showError('Please select at least one company');
        return;
    }


    if (selectedCompanies.length > 5) {
        showError('Please select maximum 5 companies');
        return;
    }


    try {
    
        const allData = [];
        
        for (const company of selectedCompanies) {
            let url = `${API_BASE_URL}/measurements?field=${field}&company=${company}`;
            if (startDate) url += `&start_date=${startDate}`;
            if (endDate) url += `&end_date=${endDate}`;

            const response = await fetch(url);

            if (!response.ok) {
                const errorData = await response.json();
                console.warn(`Error fetching data for ${company}:`, errorData.error);
                continue;
            }

            const data = await response.json();
            allData.push(...data);
        }

        if (allData.length === 0) {
            showError('No data found for the selected criteria');
            return;
        }

        
        visualizeData(allData, field, selectedCompanies);
        hideLoading();
        chartSection.style.display = 'block';

        
        await fetchMetrics();

    } catch (error) {
        showError(error.message);
    }
}


function visualizeData(data, field, selectedCompanies) {
    
    if (dataChart instanceof Chart) {
        dataChart.destroy();
    }
    dataChart = null;
    
    
    const ctx = chartCanvas.getContext('2d');
    ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
    
    
    const datasets = [];
    
    selectedCompanies.forEach((company, index) => {
        const companyData = data.filter(d => d.company === company);
        const colorIndex = index % COMPANY_COLORS.length;
        
        datasets.push({
            label: company,
            data: companyData.map(d => ({
                x: new Date(d.timestamp.split(' ')[0]),
                y: d[field]
            })),
            borderColor: COMPANY_COLORS[colorIndex].border,
            backgroundColor: COMPANY_COLORS[colorIndex].bg,
            borderWidth: 2,
            fill: selectedCompanies.length === 1,
            tension: 0.1,
            pointRadius: 0,
            pointHoverRadius: 5
        });
    });

    
    dataChart = new Chart(ctx, {
        type: 'line',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (field === 'Volume') {
                                label += context.parsed.y.toLocaleString();
                            } else {
                                label += '$' + context.parsed.y.toFixed(2);
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day',
                        displayFormats: {
                            day: 'MMM dd, yyyy'
                        }
                    },
                    title: {
                        display: true,
                        text: 'Date',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    grid: {
                        display: false
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: field === 'Volume' ? 'Volume' : 'Price ($)',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    ticks: {
                        callback: function(value) {
                            if (field === 'Volume') {
                                return value.toLocaleString();
                            }
                            return '$' + value.toFixed(2);
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });

    
    const companiesText = selectedCompanies.join(', ');
    const dateRange = `${startDateInput.value || '2018-11-29'} to ${endDateInput.value || '2023-11-29'}`;
    chartInfo.innerHTML = `
        <strong>Showing:</strong> ${field} data for ${companiesText}<br>
        <strong>Date Range:</strong> ${dateRange}<br>
        <strong>Data Points:</strong> ${data.length.toLocaleString()}
    `;
}



async function fetchMetrics() {
    hideError();
    showLoading();

    const field = fieldSelect.value;
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;
    const selectedCompanies = getSelectedCompanies();

    if (selectedCompanies.length === 0) {
        showError('Please select at least one company');
        return;
    }

    try {
        metricsContainer.innerHTML = '';

        
        for (let i = 0; i < selectedCompanies.length; i++) {
            const company = selectedCompanies[i];
            
        
            let url = `${API_BASE_URL}/measurements/metrics?field=${field}&company=${company}`;
            if (startDate) url += `&start_date=${startDate}`;
            if (endDate) url += `&end_date=${endDate}`;

            const response = await fetch(url);

            if (!response.ok) {
                const errorData = await response.json();
                console.warn(`Error fetching metrics for ${company}:`, errorData.error);
                continue;
            }

            const metrics = await response.json();

            
            const colorIndex = i % COMPANY_COLORS.length;
            const companyMetricsDiv = createCompanyMetricsDisplay(company, metrics, field, colorIndex);
            metricsContainer.appendChild(companyMetricsDiv);
        }

        hideLoading();
        metricsSection.style.display = 'block';

    } catch (error) {
        showError(error.message);
    }
}



function createCompanyMetricsDisplay(company, metrics, field, colorIndex) {
    const div = document.createElement('div');
    div.className = 'company-metrics';
    
    const isVolume = field === 'Volume';
    
    div.innerHTML = `
        <h3 style="border-left: 4px solid ${COMPANY_COLORS[colorIndex].border}; padding-left: 15px;">
            ${company}
        </h3>
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-label">Count</div>
                <div class="metric-value">${metrics.count.toLocaleString()}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Average</div>
                <div class="metric-value">${isVolume ? metrics.avg.toLocaleString() : '$' + metrics.avg.toFixed(2)}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Minimum</div>
                <div class="metric-value">${isVolume ? metrics.min.toLocaleString() : '$' + metrics.min.toFixed(2)}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Maximum</div>
                <div class="metric-value">${isVolume ? metrics.max.toLocaleString() : '$' + metrics.max.toFixed(2)}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Std Deviation</div>
                <div class="metric-value">${isVolume ? metrics.stdDev.toLocaleString() : '$' + metrics.stdDev.toFixed(2)}</div>
            </div>
        </div>
    `;
    
    return div;
}

function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}