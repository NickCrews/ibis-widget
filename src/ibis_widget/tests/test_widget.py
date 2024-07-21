from pathlib import Path

import ibis
import pytest
from ibis_widget import IbisWidget


@pytest.fixture
def table():
    path = Path(__file__).parent / "data" / "candidate_registrations.csv"
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        ibis.read_csv(
            "https://github.com/NickCrews/apoc-data/releases/download/20240717-111158/candidate_registration.csv"
        ).to_csv(path)
    return ibis.read_csv(path)


def test_no_options(table):
    IbisWidget(table)


def test_named_table_errors(table):
    with pytest.raises(TypeError):
        IbisWidget(source_table=table)
