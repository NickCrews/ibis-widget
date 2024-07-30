from ibis_widget._widget import IbisWidget as IbisWidget


def install(name: str = "widget"):
    """Install convenience methods on ibis.Table to display IbisWidget.

    This function adds a method to `ibis.Table` and `ibis.Column`
    objects. When called, it returns an `IbisWidget` displaying the table or
    column.

    Parameters
    ----------
    name :
        The name of the method to add to `ibis.Table` and `ibis.Column`.
    """
    import ibis

    def widget(self: ibis.Table | ibis.Column) -> IbisWidget:
        """Display the table or column in an IbisWidget."""
        if isinstance(self, ibis.Column):
            return IbisWidget(self.as_table())
        else:
            return IbisWidget(self)

    setattr(ibis.Table, name, widget)
    setattr(ibis.Column, name, widget)
