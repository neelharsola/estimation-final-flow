from __future__ import annotations

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
import subprocess
import tempfile
import shutil
from pathlib import Path
import json

router = APIRouter(
    prefix="/estimates",
    tags=["Estimates"],
)


@router.post("/upload-json")
async def upload_json(file: UploadFile = File(...)):
    """Accept JSON file and return parsed content (for frontend preview)."""
    try:
        content = await file.read()
        data = json.loads(content.decode("utf-8"))
        if "rows" not in data:
            raise HTTPException(status_code=400, detail="Invalid JSON: missing 'rows'")
        return {"project": data.get("project"), "rows": data["rows"]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading JSON: {str(e)}")


@router.post("/save")
async def save_estimate(payload: dict):
    """
    Accept updated JSON and return it back (placeholder for persistence).
    Keeps schema intact; validates minimal shape.
    """
    try:
        if not isinstance(payload, dict):
            raise HTTPException(status_code=400, detail="Payload must be an object")
        # Ensure required top-level keys exist
        if "rows" not in payload or not isinstance(payload["rows"], list):
            raise HTTPException(status_code=400, detail="Invalid JSON: missing 'rows' array")
        # Echo back as acknowledgement to avoid schema loss
        return {"status": "ok", "data": payload}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/generate-excel")
async def generate_excel(json_file: UploadFile = File(...)):
    """
    Generate filled Excel using populate_estimates.py.
    - Takes uploaded estimate.json (any name)
    - Runs script with sample.xlsx
    - Returns <original_json_name>.FILLED.xlsx
    """
    tmpdir: Path | None = None
    try:
        # Temp workspace
        tmpdir = Path(tempfile.mkdtemp())

        # Extract original name (without extension)
        original_name = Path(json_file.filename).stem or "estimate"

        # Paths
        json_path = tmpdir / json_file.filename
        script_root = Path(__file__).resolve().parents[2] / "data scripts"
        # Use provided instruction paths relative to backend structure
        inbook_path = script_root / "sample.xlsx"  # fixed template
        script_path = script_root / "populate_estimates.py"
        outbook_path = tmpdir / f"{original_name}.FILLED.xlsx"

        # Save uploaded JSON
        with open(json_path, "wb") as f:
            f.write(await json_file.read())

        if not inbook_path.exists():
            raise HTTPException(status_code=500, detail="Template Excel not found")
        if not script_path.exists():
            raise HTTPException(status_code=500, detail="populate_estimates.py not found")

        # Run exact CLI command
        cmd = [
            "python", str(script_path),
            "--json", str(json_path),
            "--inbook", str(inbook_path),
            "--outbook", str(outbook_path)
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise HTTPException(status_code=500, detail=f"Script failed: {result.stderr}")

        if not outbook_path.exists():
            raise HTTPException(status_code=500, detail="Output file not generated")

        # Respond with downloadable file having dynamic name
        return FileResponse(
            str(outbook_path),
            filename=f"{original_name}.FILLED.xlsx"
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        try:
            if tmpdir and tmpdir.exists():
                shutil.rmtree(tmpdir)
        except Exception:
            pass


