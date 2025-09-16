from __future__ import annotations

import asyncio
import logging
import tempfile
from pathlib import Path
from typing import Optional

from fastapi import UploadFile

from app.core.config import get_settings
from app.models.estimate import Estimate

logger = logging.getLogger(__name__)


class ExcelService:
    """Service for Excel file generation and management."""
    
    @staticmethod
    async def generate_excel(estimate: Estimate) -> str:
        """Generate Excel file from estimate data."""
        settings = get_settings()
        
        # Create temp directory for Excel generation
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            
            # Prepare file paths - use absolute paths
            json_path = temp_path / f"{estimate.id}.json"
            # Get absolute path to template file
            backend_dir = Path(__file__).parent.parent.parent  # Go up from services/excel.py to backend/
            template_path = backend_dir / "data scripts" / "sample.xlsx"
            output_path = temp_path / f"{estimate.project.name}_FILLED_{estimate.id}.xlsx"
            
            # Write estimate data as JSON
            json_path.write_text(
                estimate.model_dump_json(indent=2),
                encoding="utf-8"
            )
            
            # Ensure template exists
            if not template_path.exists():
                raise FileNotFoundError(f"Excel template not found: {template_path}")
            
            # Run populate_estimates.py script - use absolute path
            script_path = backend_dir / "data scripts" / "populate_estimates.py"
            cmd = [
                "python",
                str(script_path),
                "--json", str(json_path),
                "--inbook", str(template_path),
                "--outbook", str(output_path)
            ]
            
            try:
                logger.info(f"Running Excel generation command: {' '.join(str(c) for c in cmd)}")
                process = await asyncio.create_subprocess_exec(
                    *cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                stdout, stderr = await process.communicate()
                
                if process.returncode != 0:
                    error_msg = stderr.decode('utf-8', errors='ignore') if stderr else "Unknown error"
                    stdout_msg = stdout.decode('utf-8', errors='ignore') if stdout else ""
                    full_error = f"stderr: {error_msg}, stdout: {stdout_msg}"
                    logger.error(f"Excel generation failed with return code {process.returncode}: {full_error}")
                    raise RuntimeError(f"Excel generation failed: {full_error}")
                
                # Move generated file to permanent location
                final_path = Path(settings.UPLOAD_DIR) / f"{estimate.id}.xlsx"
                final_path.parent.mkdir(parents=True, exist_ok=True)
                
                import shutil
                shutil.copy2(output_path, final_path)
                
                logger.info(f"Generated Excel file for estimate {estimate.id}")
                return str(final_path)
                
            except Exception as e:
                logger.error(f"Failed to generate Excel: {e}")
                raise
    
    @staticmethod
    async def get_or_generate_excel(estimate: Estimate) -> str:
        """Get existing Excel file or generate new one."""
        settings = get_settings()
        excel_path = Path(settings.UPLOAD_DIR) / f"{estimate.id}.xlsx"
        
        if excel_path.exists():
            return str(excel_path)
        
        return await ExcelService.generate_excel(estimate)
    
    @staticmethod
    async def generate_with_custom_template(estimate: Estimate, template_file: UploadFile) -> str:
        """Generate Excel file with custom template."""
        settings = get_settings()
        
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            
            # Save uploaded template
            template_path = temp_path / "template.xlsx"
            template_content = await template_file.read()
            template_path.write_bytes(template_content)
            
            # Prepare file paths
            json_path = temp_path / f"{estimate.id}.json"
            output_path = temp_path / f"{estimate.project.name}_FILLED_{estimate.id}.xlsx"
            
            # Get absolute path to script
            backend_dir = Path(__file__).parent.parent.parent
            
            # Write estimate data as JSON
            json_path.write_text(
                estimate.model_dump_json(indent=2),
                encoding="utf-8"
            )
            
            # Run populate_estimates.py script
            script_path = backend_dir / "data scripts" / "populate_estimates.py"
            cmd = [
                "python",
                str(script_path),
                "--json", str(json_path),
                "--inbook", str(template_path),
                "--outbook", str(output_path)
            ]
            
            try:
                process = await asyncio.create_subprocess_exec(
                    *cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                stdout, stderr = await process.communicate()
                
                if process.returncode != 0:
                    error_msg = stderr.decode('utf-8', errors='ignore') if stderr else "Unknown error"
                    stdout_msg = stdout.decode('utf-8', errors='ignore') if stdout else ""
                    full_error = f"stderr: {error_msg}, stdout: {stdout_msg}"
                    logger.error(f"Excel generation failed with return code {process.returncode}: {full_error}")
                    raise RuntimeError(f"Excel generation failed: {full_error}")
                
                # Move generated file to permanent location
                final_path = Path(settings.UPLOAD_DIR) / f"{estimate.id}.xlsx"
                final_path.parent.mkdir(parents=True, exist_ok=True)
                
                import shutil
                shutil.copy2(output_path, final_path)
                
                logger.info(f"Generated Excel file with custom template for estimate {estimate.id}")
                return str(final_path)
                
            except Exception as e:
                logger.error(f"Failed to generate Excel with custom template: {e}")
                raise
