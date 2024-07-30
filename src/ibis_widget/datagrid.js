/** @param {{ model: DOMWidgetModel, el: HTMLElement }} context */
// The model has the following attributes:
// - records: array of objects, each object representing a row
// - schema: dictionary of column names -> type
function render({model, el}) {
    const tableEl = makeTableEl(model);
    el.appendChild(tableEl);
}

function renderThead(schema) {
    function headerCell(column, type) {
        return `
        <th class="dg-tooltip">
            ${column}
            <span class="dg-tooltiptext">${type}</span>
        </th>
        `
    }

    return `
    <style>
    .dg-table th {
        position: sticky;
        top: 0px;  /* 0px if you don't have a navbar, but something is required */
        background: #f8f9fa;
    }   

    .dg-tooltip {
        position: relative;
    }

    .dg-tooltip .dg-tooltiptext {
        background-color: black;
        color: #fff;
        text-align: center;
        padding: 5px 0;
        border-radius: 6px;
        
        top: 100%;
        left: 50%;
        width: 120px;
        margin-left: -60px; /* half of the width to center */
        
    }

    .dg-tooltiptext {
        position: absolute;
        visibility: hidden;
        z-index: 1;

    }

    *:hover > .dg-tooltiptext {
        visibility: visible;
    }
    </style>
    <thead>
        <tr>
            ${Object.entries(schema).map(([column, type]) => headerCell(column, type)).join("")}
        </tr>
    </thead>
    `
}

function renderTbody(records, schema) {
    const columns = Object.keys(schema);
    return `
    <style>
    .dg-null {
        color: #999;
    }
    
    .dg-string {
        color: #000;
    }
    
    .dg-truncate {
        white-space: nowrap;       /* Prevent text from wrapping */
        overflow: hidden;          /* Hide overflowed content */
        text-overflow: ellipsis;   /* Show ellipsis (...) for truncated content */
        max-width: 150px;          /* Set a maximum width */
        cursor: pointer;           /* Add a pointer on hover */
    }
    
    .dg-truncate:hover {
        white-space: normal;       /* Revert to default behaviour */
        overflow: visible;         /* Revert to default behaviour */
        text-overflow: clip;       /* Revert to default behaviour */
        z-index: 1;                /* Ensure the text is on top */
        background-color: #f8f9fa; /* Highlight on hover */
    }
    
    .dg-integer {
        color: #007bff;
        text-align: right;
    }
    
    .dg-float {
        color: #28a745;
        text-align: right;
    }
    
    .dg-boolean {
        color: #dc3545;
    }

    .dg-date {
        color: #17a2b8;
    }
    </style>
    <tbody>
        ${records.map((record) => `
            <tr>
                ${columns.map(column => `<td>${renderCell(record[column], column, schema[column])}</td>`).join("")}
            </tr>
        `).join("")}
    </tbody>
    `
}

function renderCell(value, column, type) {
    if (value === null) {
        return `<div class="dg-null">null</div>`;
    }
    // ! means non-nullable in ibis's type language
    // We don't care about that here
    type = type.replace("!", "");
    if (type === "string") {
        return `
            <div class="dg-string dg-truncate">${value}</div>`;
    }
    if (type.startsWith("int") || type.startsWith("uint")) {
        return `<div class="dg-integer">${value}</div>`;
    }
    if (type === "float" || type === "decimal") {
        return `<div class="dg-float">${value}</div>`;
    }
    if (type === "boolean") {
        return `<div class="dg-boolean">${value}</div>`;
    }
    if (type === "date") {
        return `<div class="dg-date">${value}</div>`;
    }
    return `<div>${value}</div>`;
}


function makeTableEl(model) {
    const el = document.createElement("div");
    const setHtml = () => {
        const schema = model.get("schema");
        const records = model.get("records");
        el.innerHTML = `
        <style>
        .dg-table {
            overflow: scroll;
            max-height: 500px;
        }
        </style>
        <div class="dg-table">
            <table>
                ${renderThead(schema)}
                ${renderTbody(records, schema)}
            </table>
        </div>
        `
    }
    setHtml();
    model.on("change:records", setHtml);
    model.on("change:schema", setHtml);
    return el;
}

export default {render};