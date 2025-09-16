from __future__ import annotations

import re
import tempfile
from pathlib import Path

from openpyxl import Workbook

from app.models.estimation import Estimation


def _safe_filename(name: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "_", name.strip())
    return cleaned or "estimation"


def generate_excel_for_estimation(estimation: Estimation) -> Path:
    wb = Workbook()
    ws = wb.active
    ws.title = "Features"

    # Header
    ws.append(["Title", "Hours", "Complexity", "Priority"]) 

    # Rows
    for feature in estimation.current_version.features:
        ws.append([
            feature.title,
            float(feature.hours) if feature.hours is not None else 0.0,
            feature.complexity or "",
            feature.priority if feature.priority is not None else "",
        ])

    # Summary sheet (optional)
    ws2 = wb.create_sheet("Summary")
    ws2["A1"] = "Estimation Title"
    ws2["B1"] = estimation.title
    ws2["A2"] = "Client"
    ws2["B2"] = estimation.client
    ws2["A3"] = "Status"
    ws2["B3"] = estimation.status
    ws2["A4"] = "Version"
    ws2["B4"] = estimation.current_version.version_number

    # Save to a temp file and return path
    tmp = tempfile.NamedTemporaryFile(suffix=".xlsx", prefix=_safe_filename(estimation.title) + "_", delete=False)
    tmp_path = Path(tmp.name)
    tmp.close()
    wb.save(tmp_path)
    return tmp_path


