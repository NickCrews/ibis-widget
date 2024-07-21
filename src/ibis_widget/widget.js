/** @param {{ model: DOMWidgetModel, el: HTMLElement }} context */
function render({model, el}) {
    const columns = model.get("columns");
    const rows = model.get("result_table");
    el.innerHTML = `
        <table>
            <thead>
                <tr>
                    ${columns.map(column => `<th>${column}</th>`).join("")}
                </tr>
            </thead>
            <tbody>
                ${rows.map(row => `
                    <tr>
                        ${columns.map(column => `<td>${row[column]}</td>`).join("")}
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
}
export default {render};