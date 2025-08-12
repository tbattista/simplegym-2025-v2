from jinja2 import Template, Environment, FileSystemLoader
from pathlib import Path
import tempfile
import os
from datetime import datetime
from typing import Dict, Any, Optional
from ...models import WorkoutData
from .gotenberg_client import GotenbergClient

class DocumentServiceV2:
    """V2 Service for processing HTML templates and generating PDFs via Gotenberg"""
    
    def __init__(self):
        self.temp_dir = Path("backend/uploads")
        self.temp_dir.mkdir(exist_ok=True)
        
        # Set up Jinja2 environment for HTML templates
        self.template_dir = Path("backend/templates/html")
        self.template_dir.mkdir(exist_ok=True)
        
        self.jinja_env = Environment(
            loader=FileSystemLoader(str(self.template_dir)),
            autoescape=True
        )
        
        # Initialize Gotenberg client
        self.gotenberg_client = GotenbergClient()
    
    def generate_html_document(self, workout_data: WorkoutData, template_name: str = "gym_log_template.html") -> str:
        """
        Generate filled HTML document from template and workout data
        
        Args:
            workout_data: The workout information to fill into the template
            template_name: Name of the HTML template file
            
        Returns:
            Generated HTML content as string
        """
        try:
            # Load the HTML template
            template = self.jinja_env.get_template(template_name)
            
            # Create replacement dictionary
            template_vars = self._create_template_variables(workout_data)
            
            # Render the template with variables
            html_content = template.render(**template_vars)
            
            return html_content
            
        except Exception as e:
            raise Exception(f"Error generating HTML document: {str(e)}")
    
    def generate_html_file(self, workout_data: WorkoutData, template_name: str = "gym_log_template.html") -> Path:
        """
        Generate HTML file and save to disk
        
        Args:
            workout_data: The workout information to fill into the template
            template_name: Name of the HTML template file
            
        Returns:
            Path to the generated HTML file
        """
        try:
            # Generate HTML content
            html_content = self.generate_html_document(workout_data, template_name)
            
            # Generate output filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_filename = f"gym_log_{workout_data.workout_name.replace(' ', '_')}_{timestamp}.html"
            output_path = self.temp_dir / output_filename
            
            # Save HTML file
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(html_content)
            
            return output_path
            
        except Exception as e:
            raise Exception(f"Error generating HTML file: {str(e)}")
    
    def generate_pdf_preview(self, workout_data: WorkoutData, template_name: str = "gym_log_template.html") -> Path:
        """
        Generate a PDF preview using Gotenberg
        
        Args:
            workout_data: The workout information to fill into the template
            template_name: Name of the HTML template file
            
        Returns:
            Path to the generated PDF file
        """
        if not self.gotenberg_client.is_available():
            raise Exception("PDF generation is not available. Gotenberg service is not running.")
        
        try:
            # Generate HTML content
            html_content = self.generate_html_document(workout_data, template_name)
            
            # Generate PDF filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            pdf_filename = f"gym_log_{workout_data.workout_name.replace(' ', '_')}_{timestamp}.pdf"
            
            # Convert HTML to PDF using Gotenberg
            pdf_path = self.gotenberg_client.html_to_pdf(html_content, pdf_filename)
            
            return pdf_path
            
        except Exception as e:
            raise Exception(f"Error generating PDF preview: {str(e)}")
    
    def _create_template_variables(self, workout_data: WorkoutData) -> Dict[str, str]:
        """
        Create a dictionary of all template variables and their replacements
        Compatible with existing V1 variable names
        
        Args:
            workout_data: The workout data containing all the information
            
        Returns:
            Dictionary mapping template variables to replacement values
        """
        template_vars = {
            # Basic workout information
            'workout_name': workout_data.workout_name,
            'workout_date': workout_data.workout_date,
        }
        
        # Add all exercise variables
        for key, value in workout_data.exercises.items():
            # Remove the double braces from V1 format and convert hyphens to underscores
            clean_key = key.replace('{{ ', '').replace(' }}', '').replace('-', '_')
            template_vars[clean_key] = value
        
        # Add sets, reps, and rest variables
        for key, value in workout_data.sets.items():
            clean_key = key.replace('{{ ', '').replace(' }}', '').replace('-', '_')
            template_vars[clean_key] = value
            
        for key, value in workout_data.reps.items():
            clean_key = key.replace('{{ ', '').replace(' }}', '').replace('-', '_')
            template_vars[clean_key] = value
            
        for key, value in workout_data.rest.items():
            clean_key = key.replace('{{ ', '').replace(' }}', '').replace('-', '_')
            template_vars[clean_key] = value
        
        # Add bonus exercise variables
        for key, value in workout_data.bonus_exercises.items():
            clean_key = key.replace('{{ ', '').replace(' }}', '').replace('-', '_')
            template_vars[clean_key] = value
            
        # Add bonus sets, reps, and rest variables
        for key, value in workout_data.bonus_sets.items():
            clean_key = key.replace('{{ ', '').replace(' }}', '').replace('-', '_')
            template_vars[clean_key] = value
            
        for key, value in workout_data.bonus_reps.items():
            clean_key = key.replace('{{ ', '').replace(' }}', '').replace('-', '_')
            template_vars[clean_key] = value
            
        for key, value in workout_data.bonus_rest.items():
            clean_key = key.replace('{{ ', '').replace(' }}', '').replace('-', '_')
            template_vars[clean_key] = value
        
        # Ensure all variables have values (empty string if not provided)
        # This prevents template errors for missing variables
        default_vars = {
            'exercise_1a': '', 'exercise_1b': '', 'exercise_1c': '',
            'exercise_2a': '', 'exercise_2b': '', 'exercise_2c': '',
            'exercise_3a': '', 'exercise_3b': '', 'exercise_3c': '',
            'exercise_4a': '', 'exercise_4b': '', 'exercise_4c': '',
            'exercise_5a': '', 'exercise_5b': '', 'exercise_5c': '',
            'exercise_6a': '', 'exercise_6b': '', 'exercise_6c': '',
            'sets_1': '', 'sets_2': '', 'sets_3': '', 'sets_4': '', 'sets_5': '', 'sets_6': '',
            'reps_1': '', 'reps_2': '', 'reps_3': '', 'reps_4': '', 'reps_5': '', 'reps_6': '',
            'rest_1': '', 'rest_2': '', 'rest_3': '', 'rest_4': '', 'rest_5': '', 'rest_6': '',
            'exercise_bonus_1': '', 'exercise_bonus_2': '',
            'sets_bonus_1': '', 'reps_bonus_1': '', 'rest_bonus_1': '',
            'reps_bonus_2': '', 'rest_bonus_2': ''
        }
        
        # Merge defaults with actual values (actual values take precedence)
        for key, default_value in default_vars.items():
            if key not in template_vars:
                template_vars[key] = default_value
        
        return template_vars
    
    def get_template_info(self, template_name: str = "gym_log_template.html") -> Dict[str, Any]:
        """
        Get information about an HTML template
        
        Args:
            template_name: Name of the HTML template file
            
        Returns:
            Dictionary containing template information
        """
        try:
            template_path = self.template_dir / template_name
            
            if not template_path.exists():
                raise Exception(f"Template '{template_name}' not found")
            
            # Read template content
            with open(template_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Extract variables from template (simple regex approach)
            import re
            variables = re.findall(r'\{\{\s*([^}]+)\s*\}\}', content)
            
            return {
                "template_name": template_name,
                "template_variables": list(set(variables)),
                "content_preview": content[:500] + "..." if len(content) > 500 else content,
                "template_type": "html",
                "version": "v2"
            }
            
        except Exception as e:
            raise Exception(f"Error analyzing template: {str(e)}")
    
    def cleanup_old_files(self, max_age_hours: int = 24) -> int:
        """
        Clean up old generated files
        
        Args:
            max_age_hours: Maximum age of files to keep in hours
            
        Returns:
            Number of files deleted
        """
        try:
            deleted_count = 0
            current_time = datetime.now()
            
            # Clean up HTML and PDF files
            for pattern in ["gym_log_*.html", "gym_log_*.pdf"]:
                for file_path in self.temp_dir.glob(pattern):
                    # Get file modification time
                    file_time = datetime.fromtimestamp(file_path.stat().st_mtime)
                    age_hours = (current_time - file_time).total_seconds() / 3600
                    
                    if age_hours > max_age_hours:
                        file_path.unlink()
                        deleted_count += 1
            
            return deleted_count
            
        except Exception as e:
            # Log error but don't fail the application
            print(f"Warning: Error cleaning up old files: {str(e)}")
            return 0
    
    def is_gotenberg_available(self) -> bool:
        """Check if Gotenberg service is available for PDF generation"""
        return self.gotenberg_client.is_available()
