import { apiClient } from '../api/client';

class DocumentService {
  async uploadDocument(wrappedApiId, fileData) {
    try {
      const response = await apiClient.post(
        `/api/wrapped-apis/${wrappedApiId}/documents`,
        {
          filename: fileData.filename,
          file_type: fileData.fileType,
          mime_type: fileData.type,
          file_size: fileData.size,
          content: fileData.content
        }
      );
      return response;
    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    }
  }

  async getDocuments(wrappedApiId) {
    try {
      const response = await apiClient.get(
        `/api/wrapped-apis/${wrappedApiId}/documents`
      );
      return response || [];
    } catch (error) {
      console.error('Error fetching documents:', error);
      throw error;
    }
  }

  async deleteDocument(wrappedApiId, documentId) {
    try {
      await apiClient.delete(
        `/api/wrapped-apis/${wrappedApiId}/documents/${documentId}`
      );
      return true;
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }
}

export const documentService = new DocumentService();

