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
    """A JupyterWidget for displaying Ibis tables"""

    _esm = Path(__file__).parent / "widget.js"
    source_table = traitlets.Instance(ibis.Table)
    result_table = traitlets.Instance(ibis.Table, read_only=True).tag(
        sync=True, to_json=_table_to_json
    )
    n_rows_source = traitlets.Int(read_only=True).tag(sync=True)
    n_rows_filtered = traitlets.Int(read_only=True).tag(sync=True)
    columns = traitlets.List().tag(sync=True)
    filters = traitlets.List(traitlets.Instance(ibis.Deferred)).tag(sync=True)
    start = traitlets.Int().tag(sync=True)
    stop = traitlets.Int().tag(sync=True)

    @property
    def filtered(self) -> ir.Table:
        t = self.source_table
        if self.filters:
            t = t.filter(self.filters)
        return t

    @property
    def n_rows_shown(self) -> int:
        return self.stop - self.start

    @traitlets.default("result_table")
    def _calc_result_table(self):
        t = self.filtered
        t = t.select(self.columns)
        t = t[self.start : self.stop]
        t = t.cache()
        return t

    @traitlets.default("n_rows_source")
    def _calc_n_rows_source(self):
        return int(self.source_table.count().execute())

    @traitlets.default("n_rows_filtered")
    def _calc_n_rows_filtered(self):
        return int(self.filtered.count().execute())

    @traitlets.observe("source_table", "columns", "filters", "start", "stop")
    def _update_derived(self, change):
        self.set_trait("result_table", self._calc_result_table())
        self.set_trait("n_rows_source", self._calc_n_rows_source())
        self.set_trait("n_rows_filtered", self._calc_n_rows_filtered())

    def __init__(
        self,
        source_table: ibis.Table,
        /,
        *,
        cache: bool = True,
        columns: Iterable[str] | None = None,
        filters=[],
        start: int = 0,
        stop: int = 10,
    ):
        if cache:
            source_table = source_table.cache()
        if columns is None:
            columns = source_table.columns
        columns = list(columns)
        filters = list(filters)
        super().__init__(
            source_table=source_table,
            columns=columns,
            filters=filters,
            start=start,
            stop=stop,
        )
