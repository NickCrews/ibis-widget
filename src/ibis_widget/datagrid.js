// From https://www.npmjs.com/package/pretty-print-json
import {prettyPrintJson} from "https://esm.run/pretty-print-json@3.0.1";

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

    .dg-table {
        font-size: 10px;
    }

    .dg-table td {
        padding-top: 0px;
        padding-bottom: 0px;
    }

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
        max-height: 20px;          /* Set a maximum height */
        cursor: pointer;           /* Add a pointer on hover */
    }
    
    .dg-truncate:hover {
        white-space: pre;          /* Assume preformatted */
        overflow: visible;         /* Revert to default behaviour */
        text-overflow: clip;       /* Revert to default behaviour */
        max-width: none;           /* Revert to default behaviour */
        max-height: none;          /* Revert to default behaviour */
        z-index: 1;                /* Ensure the text is on top */
    }

    .dg-date {
        color: #17a2b8;
    }
    
    </style>
    <link rel=stylesheet href=https://cdn.jsdelivr.net/npm/pretty-print-json@3.0.1/dist/css/pretty-print-json.css>
    <tbody>
        ${records.map((record) => `
            <tr>
                ${columns.map(column => `<td class="dg-truncate">${renderValue(record[column], schema[column])}</td>`).join("")}
            </tr>
        `).join("")}
    </tbody>
    `
}

function renderValue(value, type) {
    // TODO: any dates nested inside arrays or structs will not be formatted
    // by prettyPrintJson
    if (type === "date") {
        return `<div class="dg-date">${value}</div>`;
    }
    return prettyPrintJson.toHtml(value);
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