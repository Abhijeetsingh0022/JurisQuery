"""
Base storage interface for JurisQuery.
Defines abstract interface for file storage providers.
"""

from abc import ABC, abstractmethod


class BaseStorage(ABC):
    """Abstract base class for file storage providers."""

    @abstractmethod
    async def upload(
        self,
        content: bytes,
        filename: str,
        folder: str = "",
        content_type: str | None = None,
    ) -> str:
        """
        Upload a file to storage.
        
        Args:
            content: File content as bytes
            filename: Name of the file
            folder: Optional folder path
            content_type: MIME type of the file
            
        Returns:
            str: URL of the uploaded file
        """
        pass

    @abstractmethod
    async def delete(self, filename: str, folder: str = "") -> bool:
        """
        Delete a file from storage.
        
        Args:
            filename: Name of the file to delete
            folder: Optional folder path
            
        Returns:
            bool: True if deleted successfully
        """
        pass

    @abstractmethod
    async def get_url(self, filename: str, folder: str = "") -> str:
        """
        Get the URL of a file.
        
        Args:
            filename: Name of the file
            folder: Optional folder path
            
        Returns:
            str: URL of the file
        """
        pass

    @abstractmethod
    async def download(self, filename: str, folder: str = "") -> bytes:
        """
        Download a file from storage.
        
        Args:
            filename: Name of the file
            folder: Optional folder path
            
        Returns:
            bytes: File content
        """
        pass
