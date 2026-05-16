// ─── Constants ───────────────────────────────────────────────────────────────
const COLUMNS = ["HUL Code", "HUL Outlet Name", "ECO", "BTD", "Beat"];
const PAGE_SIZE = 100;

// ─── State ────────────────────────────────────────────────────────────────────
let filterButtonActive = false;
let jsonData = [];
let filteredData = [];
let currentPage = 1;

// ─── Fetch & Initialize ───────────────────────────────────────────────────────
async function fetchData() {
    showLoading();
    try {
        const response = await fetch("json/coverage.json");
        if (!response.ok) throw new Error("Failed to fetch data.");
        jsonData = await response.json();
        initialize();
    } catch (error) {
        console.error("Error fetching data:", error);
        showError("Failed to load data. Please refresh the page.");
    }
}

// ─── Table Rendering ──────────────────────────────────────────────────────────
function populateTable(data) {
    const tableBody = document.getElementById("table-body");
    tableBody.innerHTML = "";

    // Update record count
    updateRecordCount(data.length);

    // Empty state
    if (data.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="${COLUMNS.length + 1}" class="empty-state">
                    No records found for the selected filters.
                </td>
            </tr>`;
        updatePaginationControls(0);
        return;
    }

    // Paginate
    const totalPages = Math.ceil(data.length / PAGE_SIZE);
    currentPage = Math.min(currentPage, totalPages);
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageData = data.slice(start, start + PAGE_SIZE);

    pageData.forEach((item, index) => {
        const row = document.createElement("tr");

        // Serial number (descending from total)
        const serialCell = document.createElement("td");
        serialCell.textContent = data.length - start - index;
        row.appendChild(serialCell);

        COLUMNS.forEach((key) => {
            const cell = document.createElement("td");
            const value = item[key] !== undefined ? item[key] : "";

            // Highlight ECO < 1000
            if (key === "ECO") {
                const ecoVal = parseFloat(value);
                if (!isNaN(ecoVal) && ecoVal < 1000) {
                    cell.style.color = "#e74c3c";
                    cell.style.fontWeight = "600";
                }
            }

            cell.textContent = value;
            row.appendChild(cell);
        });

        tableBody.appendChild(row);
    });

    updatePaginationControls(totalPages);
}

// ─── Filtering ────────────────────────────────────────────────────────────────
function applyFilters() {
    const meName = document.getElementById("filter-me-name").value;
    const day = document.getElementById("filter-day").value;
    const searchQuery = document.getElementById("search-bar").value.toLowerCase().trim();

    filteredData = jsonData.filter((row) => {
        const ecoValue = parseFloat(row["ECO"]);

        const matchME = meName === "" || row["ME Name"] === meName;
        const matchDay = day === "" || row["Day"] === day;
        const matchSearch =
            searchQuery === "" ||
            (row["HUL Code"] && row["HUL Code"].toLowerCase().includes(searchQuery)) ||
            (row["HUL Outlet Name"] && row["HUL Outlet Name"].toLowerCase().includes(searchQuery));
        const matchECO = !filterButtonActive || (!isNaN(ecoValue) && ecoValue < 1000);

        return matchME && matchDay && matchSearch && matchECO;
    });

    currentPage = 1; // Reset to first page on filter change
    populateTable(filteredData);
    updateDropdowns(); // Always built from full jsonData
}

// ─── Dropdowns ────────────────────────────────────────────────────────────────
function updateDropdowns() {
    // Built from FULL dataset so options never disappear
    const meSelected = document.getElementById("filter-me-name").value;
    const daySelected = document.getElementById("filter-day").value;

    const meSet = new Set(jsonData.map((r) => r["ME Name"]).filter(Boolean));
    const daySet = new Set(jsonData.map((r) => r["Day"]).filter(Boolean));

    populateDropdown("filter-me-name", meSet, "ME Name", meSelected);
    populateDropdown("filter-day", daySet, "Day", daySelected);
}

function populateDropdown(id, optionsSet, headerName, selectedValue = "") {
    const dropdown = document.getElementById(id);
    dropdown.innerHTML = `<option value="">${headerName}</option>`;
    Array.from(optionsSet)
        .sort()
        .forEach((option) => {
            const opt = document.createElement("option");
            opt.value = option;
            opt.textContent = option;
            if (option === selectedValue) opt.selected = true;
            dropdown.appendChild(opt);
        });
}

// ─── Pagination ───────────────────────────────────────────────────────────────
function updatePaginationControls(totalPages) {
    const container = document.getElementById("pagination");
    if (!container) return;
    container.innerHTML = "";

    if (totalPages <= 1) return;

    // Prev button
    const prev = document.createElement("button");
    prev.textContent = "← Prev";
    prev.disabled = currentPage === 1;
    prev.addEventListener("click", () => {
        if (currentPage > 1) { currentPage--; populateTable(filteredData); }
    });
    container.appendChild(prev);

    // Page info
    const info = document.createElement("span");
    info.textContent = ` Page ${currentPage} of ${totalPages} `;
    container.appendChild(info);

    // Next button
    const next = document.createElement("button");
    next.textContent = "Next →";
    next.disabled = currentPage === totalPages;
    next.addEventListener("click", () => {
        if (currentPage < totalPages) { currentPage++; populateTable(filteredData); }
    });
    container.appendChild(next);
}

// ─── Reset ────────────────────────────────────────────────────────────────────
function resetFilters() {
    filterButtonActive = false;
    currentPage = 1;
    const btn = document.getElementById("filter-button");
    if (btn) btn.style.backgroundColor = "#007bff";
    document.getElementById("search-bar").value = "";
    document.querySelectorAll("select").forEach((dropdown) => (dropdown.value = ""));
    applyFilters();
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────
function showLoading() {
    const tableBody = document.getElementById("table-body");
    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="${COLUMNS.length + 1}" class="empty-state">
                    ⏳ Loading data...
                </td>
            </tr>`;
    }
}

function showError(message) {
    const tableBody = document.getElementById("table-body");
    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="${COLUMNS.length + 1}" class="empty-state" style="color:#e74c3c;">
                    ⚠️ ${message}
                </td>
            </tr>`;
    }
    updateRecordCount(0);
}

function updateRecordCount(count) {
    const el = document.getElementById("record-count");
    if (el) el.textContent = `Showing ${count.toLocaleString()} record${count !== 1 ? "s" : ""}`;
}

// ─── Debounce ─────────────────────────────────────────────────────────────────
function debounce(func, delay = 500) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => func(...args), delay);
    };
}

// ─── Initialize ───────────────────────────────────────────────────────────────
function initialize() {
    document.getElementById("reset-button").addEventListener("click", resetFilters);

    document.getElementById("search-bar").addEventListener(
        "input",
        debounce(applyFilters, 500)
    );

    document.querySelectorAll("select").forEach((dropdown) =>
        dropdown.addEventListener("change", applyFilters)
    );

    const filterBtn = document.getElementById("filter-button");
    if (filterBtn) {
        filterBtn.addEventListener("click", () => {
            filterButtonActive = !filterButtonActive;
            filterBtn.style.backgroundColor = filterButtonActive ? "#27ae60" : "#007bff";
            applyFilters();
        });
    }

    updateDropdowns();
    applyFilters();
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
fetchData();
