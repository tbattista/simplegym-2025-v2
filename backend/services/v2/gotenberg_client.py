import requests
import tempfile
from pathlib import Path
from typing import Optional
import os

class GotenbergClient:
    """Client for interacting with Gotenberg service for HTML to PDF conversion"""
    
    def __init__(self, gotenberg_url: str = None):
        # Use GOTENBERG_URL environment variable to match railway.toml configuration
        # Also check Railway's auto-generated service URL as fallback
        self.gotenberg_url = (
            gotenberg_url or 
            os.getenv('GOTENBERG_URL') or 
            f"https://{os.getenv('RAILWAY_SERVICE_GOTENBERG_URL', 'localhost:3000')}"
        )
        self.available = False
        self._check_availability()
    
    def _check_availability(self):
        """Check if Gotenberg service is available"""
        try:
            response = requests.get(f"{self.gotenberg_url}/health", timeout=5)
            self.available = response.status_code == 200
        except Exception:
            self.available = False
    
    def html_to_pdf(self, html_content: str, filename: str = "document.pdf") -> Optional[Path]:
        """
        Convert HTML content to PDF using Gotenberg
        
        Args:
            html_content: The HTML content to convert
            filename: Name for the output PDF file
            
        Returns:
            Path to the generated PDF file, or None if conversion failed
        """
        if not self.available:
            raise Exception("Gotenberg service is not available")
        
        try:
            # Create temporary HTML file
            with tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False, encoding='utf-8') as temp_html:
                temp_html.write(html_content)
                temp_html_path = temp_html.name
            
            # Prepare files for Gotenberg
            files = {
                'files': ('index.html', open(temp_html_path, 'rb'), 'text/html')
            }
            
            # PDF conversion options for A5 paper
            data = {
                'paperWidth': '5.83',
                'paperHeight': '8.27',
                'marginTop': '0.4',
                'marginBottom': '0.4',
                'marginLeft': '0.3',
                'marginRight': '0.3',
                'printBackground': 'true',
                'preferCSSPageSize': 'true'
            }
            
            # Make request to Gotenberg
            response = requests.post(
                f"{self.gotenberg_url}/forms/chromium/convert/html",
                files=files,
                data=data,
                timeout=30
            )
            
            # Clean up temporary HTML file
            os.unlink(temp_html_path)
            files['files'][1].close()
            
            if response.status_code == 200:
                # Save PDF to temporary file
                output_dir = Path("backend/uploads")
                output_dir.mkdir(exist_ok=True)
                
                pdf_path = output_dir / filename
                with open(pdf_path, 'wb') as pdf_file:
                    pdf_file.write(response.content)
                
                return pdf_path
            else:
                raise Exception(f"Gotenberg conversion failed: {response.status_code} - {response.text}")
                
        except Exception as e:
            # Clean up temporary file if it exists
            try:
                if 'temp_html_path' in locals():
                    os.unlink(temp_html_path)
                if 'files' in locals() and files['files'][1]:
                    files['files'][1].close()
            except:
                pass
            raise Exception(f"Error converting HTML to PDF: {str(e)}")
    
    def is_available(self) -> bool:
        """Check if Gotenberg service is currently available"""
        self._check_availability()
        return self.available
