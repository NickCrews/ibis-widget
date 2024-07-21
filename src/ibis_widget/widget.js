/** @param {{ model: DOMWidgetModel, el: HTMLElement }} context */
// The model has the following attributes:
// - columns: array of column names
// - _result_table: list of dictionaries, each dictionary representing a row
// - filters: list of filters
// - start: start index of the rows to display
// - stop: stop index of the rows to display
// - n_rows_source: number of rows in the source table
// - n_rows_filtered: number of rows after applying the filters
function render({model, el}) {
    const headerEl = makeTableHeaderEl(model);
    const tableEl = makeTableEl(model);
    const startEl = makeStartEl(model);
    const stopEl = makeStopEl(model);
    el.appendChild(headerEl);
    el.appendChild(tableEl);
    el.appendChild(startEl);
    el.appendChild(stopEl);
}

function makeTableHeaderEl(model) {
    const el = document.createElement("div");
    const setHtml = () => {
        const n_rows_shown = model.get("stop") - model.get("start");
        el.innerHTML = `
        <p>${model.get("n_rows_source")} total rows</p>
        <p>${model.get("n_rows_filtered")} rows after filtering</p>
        <p>${n_rows_shown} rows displayed (from ${model.get("start")} to ${model.get("stop")})</p>
        `;
    }
    setHtml();
    model.on("change:n_rows_source", setHtml);
    model.on("change:n_rows_filtered", setHtml);
    model.on("change:start", setHtml);
    model.on("change:stop", setHtml);
    return el;
}


function makeTableEl(model) {
    const el = document.createElement("div");
    const setHtml = () => {
        const columns = model.get("columns");
        const rows = model.get("result_table");
        el.innerHTML = `
        <div style="overflow-x: scroll;">
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        ${columns.map(column => `<th>${column}</th>`).join("")}
                    </tr>
                </thead>
                <tbody>
                    ${rows.map((row, idx) => `
                        <tr>
                            <td>${idx}</td>
                            ${columns.map(column => `<td>${row[column]}</td>`).join("")}
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
        `
    }
    setHtml();
    model.on("change:result_table", setHtml);
    return el;
}

function makeStartEl(model) {
    const el = document.createElement("div");
    el.innerHTML = `
    <div>
        <label for="iw-start">Start</label>
        <input id="iw-start" type="number" value="${model.get("start")}" />
    </div>
    `;
    const inp = el.querySelector("input");
    function setValue() {
        inp.value = model.get("start");
    }
    setValue();
    model.on("change:start", setValue);
    inp.addEventListener("change", () => {
        model.set("start", parseInt(inp.value));
        model.save_changes();
    });
    return el;
}

function makeStopEl(model) {
    const el = document.createElement("div");
    el.innerHTML = `
    <div>
        <label for="iw-stop">Stop</label>
        <input id="iw-stop" type="number" value="${model.get("stop")}" />
    </div>
    `;
    const inp = el.querySelector("input");
    function setValue() {
        inp.value = model.get("stop");
    }
    setValue();
    model.on("change:stop", setValue);
    inp.addEventListener("change", () => {
        model.set("stop", parseInt(inp.value));
        model.save_changes();
    });
    return el;
}

export default {render};