from pathlib import Path
from typing import Iterable

import anywidget
import ibis
import traitlets
from ibis import selectors as s
from ibis.expr import types as ir


def _date_to_string(date: ir.DateValue) -> ir.StringValue:
    return date.cast("string")


def _table_to_json(table: ibis.Table, widget: anywidget.AnyWidget) -> list[dict]:
    table = table.mutate(s.across(s.of_type("date"), _date_to_string))
    return table.to_pandas().to_dict(orient="records")


class IbisWidget(anywidget.AnyWidget):
    _esm = Path(__file__).parent / "widget.js"
    source_table: ibis.Table
    result_table = traitlets.Instance(ibis.Table, read_only=True).tag(
        sync=True, to_json=_table_to_json
    )
    columns = traitlets.List().tag(sync=True)
    filters = traitlets.List(traitlets.Instance(ibis.Deferred), default_value=[]).tag(
        sync=True
    )
    start = traitlets.Int(0).tag(sync=True)
    stop = traitlets.Int(10).tag(sync=True)

    @traitlets.default("columns")
    def _default_columns(self):
        return self.source_table.columns

    def _calculate_result_table(self):
        t = self.source_table
        if self.filters:
            t = t.filter(self.filters)
        t = t.select(self.columns)
        t = t[self.start : self.stop]
        return t

    @traitlets.observe("columns", "filters")
    def _update_result_table(self, change):
        self.set_trait("result_table", self._calculate_result_table())

    def __init__(
        self,
        source_table: ibis.Table,
        /,
        *,
        columns: Iterable[str] | None = None,
        filters=[],
        start: int = 0,
        stop: int = 20,
    ):
        self.source_table = source_table
        if columns is None:
            columns = source_table.columns
        columns = list(columns)
        filters = list(filters)
        super().__init__(columns=columns, filters=filters, start=start, stop=stop)
