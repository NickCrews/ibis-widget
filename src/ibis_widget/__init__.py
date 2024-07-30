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

    def show(self: ibis.Table | ibis.Column):
        if isinstance(self, ibis.Column):
            return IbisWidget(self.as_table())
        else:
            return IbisWidget(self)

    setattr(ibis.Table, name, show)
    setattr(ibis.Column, name, show)
