/** @param {{ model: DOMWidgetModel, el: HTMLElement }} context */
// The model has the following attributes:
// - records: array of objects, each object representing a row
// - schema: dictionary of column names -> type
function render({model, el}) {
    const tableEl = makeTableEl(model);
    el.appendChild(tableEl);
}

function header(schema) {
    function headerCell(column, type) {
        return `
        <th class="dg-tooltip">${column}
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
        visibility: hidden;
        background-color: black;
        color: #fff;
        text-align: center;
        padding: 5px 0;
        border-radius: 6px;
        
        width: 120px;
        top: 100%;
        left: 50%;
        half the width to center 
        margin-left: -60px;
        z-index: 1;
    }

    .dg-tooltip:hover .dg-tooltiptext {
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


function makeTableEl(model) {
    const el = document.createElement("div");
    const setHtml = () => {
        const schema = model.get("schema");
        const records = model.get("records");
        const columns = Object.keys(schema);
        el.innerHTML = `
        <style>
        .dg-table {
            overflow: scroll;
            max-height: 500px;
        }
        </style>
        <div class="dg-table">
            <table>
                ${header(schema)}
                <tbody>
                    ${records.map((record) => `
                        <tr>
                            ${columns.map(column => `<td>${record[column]}</td>`).join("")}
                        </tr>
                    `).join("")}
                </tbody>
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