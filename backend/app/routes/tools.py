from __future__ import annotations

import asyncio
import tempfile
import json as _json
import shutil
from pathlib import Path
from datetime import datetime

from fastapi import APIRouter, File, UploadFile, HTTPException, Depends
from fastapi.responses import FileResponse

from app.services.importer import build_estimation_from_envelope
from app.core.security import get_current_user_id

router = APIRouter()


@router.post("/process-estimation")
async def process_estimation_json(
    json_file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id)
) -> FileResponse:
    """
    Process JSON estimation data: save to database and generate Excel file
    """
    if not json_file.filename or not json_file.filename.endswith('.json'):
        raise HTTPException(status_code=400, detail="Please upload a valid JSON file")
    
    try:
        # Read and validate JSON
        json_content = await json_file.read()
        envelope = _json.loads(json_content.decode("utf-8"))
        
        if not isinstance(envelope, dict) or "rows" not in envelope:
            raise HTTPException(status_code=400, detail="JSON must contain a 'rows' key")
        
        if not isinstance(envelope["rows"], list):
            raise HTTPException(status_code=400, detail="JSON 'rows' must be an array")
            
    except _json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON format: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading JSON file: {str(e)}")

    # Save to database (continue even if this fails)
    try:
        from app.db.mongo import get_db
        est = build_estimation_from_envelope(envelope, creator_id=user_id)
        # Don't serialize the id field to avoid duplicate key error
        doc = est.model_dump(by_alias=True, exclude={'id'})
        db = get_db()
        res = await db.estimations.insert_one(doc)
        print(f"✅ Created estimation in database: {res.inserted_id}")
    except Exception as e:
        print(f"⚠️ DB import failed: {e}")

    # Generate Excel file using populate_estimates.py
    with tempfile.TemporaryDirectory() as td:
        td_path = Path(td)
        json_path = td_path / "estimation_data.json"
        
        # Save JSON to temp file
        json_path.write_text(json_content.decode("utf-8"), encoding="utf-8")
        
        # Find template file
        script_dir = Path(__file__).resolve().parents[2] / "data scripts"
        template_source = script_dir / "sample.xlsx"
        
        # Create template if it doesn't exist
        if not template_source.exists():
            # Create a minimal Excel template
            try:
                import openpyxl
                wb = openpyxl.Workbook()
                ws = wb.active
                ws.title = "Estimation"
                
                # Add headers based on the script's expectations
                headers = [
                    "Platform (Desktop / Web / Mobile)", "Module", "Component", "Features",
                    "Make/ Reuse", "Complexity (Simple / Complex / Average)", 
                    "Project Name", "Actual (working day)",
                    "UI Design", "UI Module", "BL", "General", "Service/ API", 
                    "DB Struct.", "DB Prog.", "DB - UDF", "# Comp."
                ]
                for col, header in enumerate(headers, 1):
                    ws.cell(row=1, column=col, value=header)
                
                template_source = td_path / "template.xlsx"
                wb.save(str(template_source))
                print(f"📝 Created template at {template_source}")
                
            except ImportError:
                raise HTTPException(status_code=500, detail="openpyxl is required but not installed")
        
        # Copy template to working directory
        template_path = td_path / "template.xlsx"
        if template_source != template_path:
            shutil.copy2(template_source, template_path)
        
        # Generate output filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        project_name = envelope.get("project", {}).get("name", "estimation")
        safe_project_name = "".join(c for c in project_name if c.isalnum() or c in (' ', '-', '_')).strip()
        safe_project_name = safe_project_name.replace(' ', '_')
        
        outbook_path = td_path / f"{safe_project_name}_FILLED_{timestamp}.xlsx"
        
        # Locate and run populate_estimates.py script
        script_path = script_dir / "populate_estimates.py"
        if not script_path.exists():
            raise HTTPException(status_code=500, detail="populate_estimates.py script not found")

        cmd = [
            "python",
            str(script_path),
            "--json",
            str(json_path),
            "--inbook",
            str(template_path),
            "--outbook",
            str(outbook_path),
        ]

        try:
            print(f"🚀 Running command: {' '.join(cmd)}")
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await proc.communicate()
            
            if stdout:
                print(f"📋 Script output: {stdout.decode()}")
            if stderr:
                print(f"⚠️ Script errors: {stderr.decode()}")
            
            if proc.returncode == 0 and outbook_path.exists():
                print(f"✅ Excel file generated successfully: {outbook_path}")
                return FileResponse(
                    str(outbook_path), 
                    filename=outbook_path.name,
                    media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                )
            else:
                print(f"❌ Script failed with return code: {proc.returncode}")
                
        except Exception as e:
            print(f"💥 Script execution failed: {e}")

        # Last resort: return template with basic info
        if template_path.exists():
            return FileResponse(
                str(template_path), 
                filename=f"estimation_template_{timestamp}.xlsx",
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            )
        
        raise HTTPException(status_code=500, detail="Failed to generate Excel file")


