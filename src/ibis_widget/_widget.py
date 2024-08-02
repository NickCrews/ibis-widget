from pathlib import Path
from typing import Any, Iterable, Mapping

import anywidget
import ibis
import ipywidgets as wid
import traitlets
from ibis import selectors as s
from ibis.expr import types as ir


def _date_to_string(date: ir.DateValue) -> ir.StringValue:
    return date.cast("string")


def _table_to_json(table: ibis.Table) -> list[dict]:
    table = table.mutate(
        s.across(s.of_type("date"), _date_to_string),
        s.across(s.of_type("!date"), _date_to_string),
        s.across(s.of_type("timestamp"), _date_to_string),
        s.across(s.of_type("!timestamp"), _date_to_string),
        s.across(s.of_type("uuid"), _date_to_string),
        s.across(s.of_type("!uuid"), _date_to_string),
        s.across(s.of_type("decimal"), lambda x: x.cast("float64")),
        s.across(s.of_type("!decimal"), lambda x: x.cast("float64")),
    )
    return table.to_pandas().to_dict(orient="records")


class IbisWidget(traitlets.HasTraits):
    """A JupyterWidget for displaying Ibis tables"""

    table = traitlets.Instance(ibis.Table)
    """The source table to display. May be filtered by `filters`."""
    filters = traitlets.List(traitlets.Instance(ibis.Deferred))
    """A list of filters to apply to the table."""
    search = traitlets.Unicode()
    """A search string to filter the table."""
    offset = traitlets.Int()
    """The number of rows to skip before displaying the first row."""
    limit = traitlets.Int()
    """The maximum number of rows to display."""

    def __init__(
        self,
        table: ibis.Table | ibis.Column,
        /,
        *,
        filters: Iterable[ibis.Deferred] = [],
        search: str = "",
        offset: int = 0,
        limit: int = 100,
    ):
        """Create a new IbisWidget.

        Parameters
        ----------
        table :
            The ibis.Table or ibis.Column to display.
        filters :
            A list of filters to apply to the table.
        offset :
            The number of rows to skip before displaying the first row.
        """
        if isinstance(table, ibis.Column):
            table = table.as_table()
        super().__init__(
            table=table, filters=filters, search=search, offset=offset, limit=limit
        )

        self._search_widget = wid.Text(
            description="Search",
            layout=wid.Layout(width="300px"),
        )
        self._row_count_widget = wid.HTML(self._row_count_summary)
        self._offset_widget = wid.BoundedIntText(
            value=offset,
            min=0,
            max=10**15,
            description="Offset",
            layout=wid.Layout(width="200px"),
        )
        self._limit_widget = wid.BoundedIntText(
            value=limit,
            min=0,
            max=10_000,
            description="Limit",
            layout=wid.Layout(width="200px"),
        )
        traitlets.link((self, "search"), (self._search_widget, "value"))
        traitlets.link((self, "offset"), (self._offset_widget, "value"))
        traitlets.link((self, "limit"), (self._limit_widget, "value"))
        # TODO: I think we can reduce startup time by not materializing
        # the table until we actually display it for the first time
        self._datagrid = DataGridWidget(
            records=_table_to_json(self.result_table), schema=self._result_schema
        )
        self.observe(
            lambda _change: self._update_datagrid(),
            ["filters", "search", "limit", "offset"],
        )

    @property
    def filtered(self) -> ibis.Table:
        """The table after applying filters."""
        t = self.table
        if self.filters:
            t = t.filter(self.filters)
        t = _search_table(t, self.search)
        return t

    @property
    def result_table(self) -> ibis.Table:
        """The table after applying filters, offset, and limit."""
        t = self.filtered
        t = t.select(ibis.row_number().name("__row_id"), *t.columns)
        t = t.limit(self.limit, offset=self.offset)
        t = t.cache()
        return t

    @property
    def _result_records(self) -> list[dict[str, Any]]:
        return _table_to_json(self.result_table)

    @property
    def _result_schema(self) -> dict[str, str]:
        return {col: str(typ) for col, typ in self.result_table.schema().items()}

    @property
    def _n_rows_total(self) -> int:
        return int(self.table.count().execute())

    @property
    def _n_rows_filtered(self) -> int:
        return int(self.filtered.count().execute())

    @property
    def _row_count_summary(self) -> str:
        return f"Showing {self._n_rows_result:,} of {self._n_rows_filtered:,} filtered rows ({self._n_rows_total:,} total)."

    @property
    def _n_rows_result(self) -> int:
        return int(self.result_table.count().execute())

    def _update_datagrid(self):
        if self._n_rows_filtered < self.offset:
            self.offset = 0
        self._row_count_widget.value = self._row_count_summary
        self._datagrid.records = self._result_records
        self._datagrid.schema = self._result_schema

    def __repr__(self) -> str:
        return self.result_table._repr_mimebundle_(
            include="text/plain", exclude="text/html"
        )["text/plain"]

    def _repr_mimebundle_(self, include=None, exclude=None):
        controls = self._search_widget
        pagination = wid.HBox([self._offset_widget, self._limit_widget])
        vbox = wid.VBox([controls, self._datagrid, self._row_count_widget, pagination])
        base = vbox._repr_mimebundle_(include=include, exclude=exclude)
        return {**base, "text/plain": repr(self)}


class DataGridWidget(anywidget.AnyWidget):
    """A JupyterWidget for displaying json data in a grid with rich display.

    This is not responsible for any of the data controls or manipulation.
    You hand this a list of records and a schema, and it displays them.
    """

    _esm = Path(__file__).parent / "datagrid.js"

    records = traitlets.List(
        traitlets.Dict(key_trait=traitlets.Unicode(), value_trait=traitlets.Any())
    ).tag(sync=True)

    # the dtype uses ibis's typestrings, eg 'int64', 'string', 'date', 'array<string>'
    schema = traitlets.Dict(
        key_trait=traitlets.Unicode(), value_trait=traitlets.Unicode()
    ).tag(sync=True)

    def __init__(
        self,
        records: Iterable[dict[str, Any]],
        *,
        schema: Mapping[str, str] | None = None,
    ):
        records = list(records)
        schema = dict(schema)
        super().__init__(records=records, schema=schema)


def _search_table(t: ibis.Table, search: str) -> ibis.Table:
    search = search.strip()
    if not search:
        return t
    search = search.lower()
    terms = [term.strip() for term in search.split()]
    oneline = ibis.literal(" ").join([t[col].cast(str).lower() for col in t.columns])
    return t.filter([oneline.contains(term) for term in terms])
