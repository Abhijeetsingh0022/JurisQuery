"""
Cloudinary storage implementation for JurisQuery.
Handles file uploads to Cloudinary for legal documents.
"""

import cloudinary
import cloudinary.uploader
import cloudinary.api
import httpx

from src.config import settings
from src.storage.base import BaseStorage


# Configure Cloudinary
cloudinary.config(
    cloud_name=settings.cloudinary_cloud_name,
    api_key=settings.cloudinary_api_key,
    api_secret=settings.cloudinary_api_secret,
    secure=True,
)


class CloudinaryStorage(BaseStorage):
    """Cloudinary implementation of file storage."""

    def __init__(self):
        """Initialize Cloudinary storage."""
        self.folder_prefix = "jurisquery"

    def _get_full_path(self, filename: str, folder: str = "") -> str:
        """Get full Cloudinary path for a file."""
        if folder:
            return f"{self.folder_prefix}/{folder}/{filename}"
        return f"{self.folder_prefix}/{filename}"

    def _get_public_id(self, filename: str, folder: str = "") -> str:
        """Get Cloudinary public_id for a file."""
        # Remove extension for public_id
        name_without_ext = filename.rsplit(".", 1)[0] if "." in filename else filename
        if folder:
            return f"{self.folder_prefix}/{folder}/{name_without_ext}"
        return f"{self.folder_prefix}/{name_without_ext}"

    async def upload(
        self,
        content: bytes,
        filename: str,
        folder: str = "",
        content_type: str | None = None,
    ) -> str:
        """
        Upload a file to Cloudinary.
        
        Args:
            content: File content as bytes
            filename: Name of the file
            folder: Optional folder path
            content_type: MIME type (auto-detected if not provided)
            
        Returns:
            str: Secure URL of the uploaded file
        """
        public_id = self._get_public_id(filename, folder)
        
        # Determine resource type based on file extension
        extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        resource_type = "raw"  # Use 'raw' for PDFs and documents
        
        # Upload to Cloudinary
        result = cloudinary.uploader.upload(
            content,
            public_id=public_id,
            resource_type=resource_type,
            overwrite=True,
            invalidate=True,
        )
        
        return result.get("secure_url", result.get("url", ""))

    async def delete(self, filename: str, folder: str = "") -> bool:
        """
        Delete a file from Cloudinary.
        
        Args:
            filename: Name of the file to delete
            folder: Optional folder path
            
        Returns:
            bool: True if deleted successfully
        """
        public_id = self._get_public_id(filename, folder)
        
        try:
            result = cloudinary.uploader.destroy(
                public_id,
                resource_type="raw",
                invalidate=True,
            )
            return result.get("result") == "ok"
        except Exception:
            return False

    async def get_url(self, filename: str, folder: str = "") -> str:
        """
        Get the URL of a file in Cloudinary.
        
        Args:
            filename: Name of the file
            folder: Optional folder path
            
        Returns:
            str: Secure URL of the file
        """
        public_id = self._get_public_id(filename, folder)
        
        # Build Cloudinary URL
        return cloudinary.CloudinaryImage(
            public_id,
            resource_type="raw",
        ).build_url(secure=True)

    async def download(self, filename: str, folder: str = "") -> bytes:
        """
        Download a file from Cloudinary.
        
        Args:
            filename: Name of the file
            folder: Optional folder path
            
        Returns:
            bytes: File content
        """
        url = await self.get_url(filename, folder)
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url)
            response.raise_for_status()
            return response.content
