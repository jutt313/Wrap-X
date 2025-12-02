import React, { useState, useRef, useEffect } from 'react';
import '../styles/ToolsConfigModal.css';

function FileUploadModal({ isOpen, onClose, onUpload }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const fileInputRef = useRef(null);

  // Validate props on mount and when they change
  useEffect(() => {
    if (isOpen) {
      console.log('FileUploadModal: Modal opened', { 
        hasOnUpload: typeof onUpload === 'function',
        hasOnClose: typeof onClose === 'function',
        onUploadType: typeof onUpload,
        onCloseType: typeof onClose
      });
      
      if (typeof onUpload !== 'function') {
        console.error('FileUploadModal: onUpload is not a function!', {
          onUpload,
          onUploadType: typeof onUpload,
          props: { isOpen, onClose, onUpload }
        });
      }
    }
  }, [isOpen, onUpload, onClose]);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file size (50MB max for all files)
    if (selectedFile.size > 50 * 1024 * 1024) {
      setError('File size must be less than 50MB');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setSuccess(null);
  };

  const handleUpload = async () => {
    console.log('FileUploadModal: handleUpload called', { 
      hasFile: !!file, 
      fileName: file?.name,
      hasOnUpload: typeof onUpload === 'function',
      onUpload
    });

    if (!file) {
      const errorMsg = 'Please select a file first';
      console.warn('FileUploadModal:', errorMsg);
      setError(errorMsg);
      return;
    }

    // Validate onUpload prop
    if (typeof onUpload !== 'function') {
      const errorMsg = 'Upload handler is not available. Please refresh the page.';
      console.error('FileUploadModal: onUpload is not a function!', {
        onUpload,
        onUploadType: typeof onUpload,
        props: { isOpen, onClose, onUpload }
      });
      setError(errorMsg);
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      console.log('FileUploadModal: Reading file content', { 
        fileName: file.name, 
        fileType: file.type, 
        fileSize: file.size 
      });
      
      // Read file content based on file type
      const fileData = await readFileContent(file);
      console.log('FileUploadModal: File content read successfully', { 
        fileType: fileData.fileType,
        contentLength: fileData.content?.length,
        mimeType: fileData.mimeType
      });
      
      const uploadData = {
        filename: file.name,
        content: fileData.content,
        type: file.type,
        size: file.size,
        fileType: fileData.fileType
      };
      
      console.log('FileUploadModal: Calling onUpload handler', {
        filename: uploadData.filename,
        fileType: uploadData.fileType,
        size: uploadData.size,
        contentPreview: uploadData.content?.substring(0, 50) + '...'
      });
      
      // Call the upload handler with file data
      await onUpload(uploadData);

      console.log('FileUploadModal: Upload successful');
      setSuccess(`File "${file.name}" uploaded successfully!`);
      setUploading(false);
      
      // Reset after 1.5 seconds and close modal
      setTimeout(() => {
        setFile(null);
        setSuccess(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        onClose();
      }, 1500);
    } catch (err) {
      console.error('FileUploadModal: Upload error occurred', {
        error: err,
        message: err.message,
        stack: err.stack,
        response: err.response,
        fileName: file?.name
      });
      setError(err.message || 'Failed to upload file');
      setUploading(false);
    }
  };

  const readFileContent = (file) => {
    return new Promise((resolve, reject) => {
      console.log('FileUploadModal: readFileContent called', { 
        fileName: file.name, 
        fileType: file.type,
        fileSize: file.size
      });

      // Handle PDF files - read as ArrayBuffer and convert to base64
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        console.log('FileUploadModal: Processing PDF file');
        const pdfReader = new FileReader();
        pdfReader.onload = (e) => {
          try {
            console.log('FileUploadModal: PDF file read, converting to base64');
            const arrayBuffer = e.target.result;
            // Convert ArrayBuffer to base64
            const bytes = new Uint8Array(arrayBuffer);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            const base64 = btoa(binary);
            console.log('FileUploadModal: PDF converted to base64', { 
              base64Length: base64.length 
            });
            resolve({ 
              content: base64, 
              fileType: 'pdf',
              mimeType: 'application/pdf'
            });
          } catch (err) {
            console.error('FileUploadModal: PDF processing error:', err, {
              error: err,
              message: err.message,
              stack: err.stack
            });
            reject(new Error('Failed to process PDF file: ' + err.message));
          }
        };
        pdfReader.onerror = (e) => {
          console.error('FileUploadModal: PDF read error:', e, {
            error: e,
            target: e.target,
            errorCode: e.target?.error?.code
          });
          reject(new Error('Failed to read PDF file'));
        };
        pdfReader.readAsArrayBuffer(file);
        return;
      }

      // Handle text files (CSV, TXT) - read as text
      if (file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv') ||
          file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')) {
        console.log('FileUploadModal: Processing text file (CSV/TXT)');
        const textReader = new FileReader();
        textReader.onload = (e) => {
          try {
            const content = e.target.result;
            const fileType = getFileType(file);
            console.log('FileUploadModal: Text file read successfully', { 
              fileType,
              contentLength: content.length 
            });
            resolve({ content, fileType, mimeType: file.type });
          } catch (err) {
            console.error('FileUploadModal: Text file processing error:', err, {
              error: err,
              message: err.message,
              stack: err.stack
            });
            reject(new Error('Failed to read text file: ' + err.message));
          }
        };
        textReader.onerror = (e) => {
          console.error('FileUploadModal: Text file read error:', e, {
            error: e,
            target: e.target,
            errorCode: e.target?.error?.code
          });
          reject(new Error('Failed to read text file'));
        };
        textReader.readAsText(file, 'UTF-8');
        return;
      }

      // For all other file types, read as base64 Data URL
      console.log('FileUploadModal: Processing other file type as base64');
      const base64Reader = new FileReader();
      base64Reader.onload = (e) => {
        try {
          const dataUrl = e.target.result;
          const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
          console.log('FileUploadModal: File converted to base64', { 
            base64Length: base64.length,
            fileType: getFileType(file)
          });
          resolve({ 
            content: base64, 
            fileType: getFileType(file),
            mimeType: file.type || 'application/octet-stream'
          });
        } catch (err) {
          console.error('FileUploadModal: Base64 conversion error:', err, {
            error: err,
            message: err.message,
            stack: err.stack
          });
          reject(new Error('Failed to process file: ' + err.message));
        }
      };
      base64Reader.onerror = (e) => {
        console.error('FileUploadModal: Base64 read error:', e, {
          error: e,
          target: e.target,
          errorCode: e.target?.error?.code
        });
        reject(new Error('Failed to read file'));
      };
      base64Reader.readAsDataURL(file);
    });
  };

  const getFileType = (file) => {
    const fileName = file.name.toLowerCase();
    if (file.type === 'application/pdf' || fileName.endsWith('.pdf')) {
      return 'pdf';
    } else if (file.type === 'text/csv' || fileName.endsWith('.csv')) {
      return 'csv';
    } else if (file.type === 'text/plain' || fileName.endsWith('.txt')) {
      return 'txt';
    } else {
      return 'other';
    }
  };

  const getFileIcon = (fileName) => {
    if (fileName.endsWith('.pdf')) {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M8 12H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <path d="M8 16H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      );
    } else if (fileName.endsWith('.csv')) {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M8 10L10 12L8 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 10H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      );
    } else {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setError(null);
    setSuccess(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay credential-form-overlay" onClick={onClose}>
      <div className="modal-card credential-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            Upload Document
          </h3>
          <button className="modal-close" onClick={onClose} style={{ display: 'block' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        
        <div className="modal-body">
          <div className="credential-form">
            <div className="file-upload-area">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.csv,.txt,.doc,.docx,.xls,.xlsx,.json,.xml"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              
              {!file ? (
                <div 
                  className="file-upload-dropzone"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <p className="upload-text">Click to select file or drag and drop</p>
                  <p className="upload-hint">
                    Supported: PDF, CSV, TXT, DOC, DOCX, XLS, XLSX, JSON, XML (max 50MB)
                  </p>
                </div>
              ) : (
                <div className="file-selected">
                  <div className="file-info">
                    {getFileIcon(file.name)}
                    <div className="file-details">
                      <p className="file-name">{file.name}</p>
                      <p className="file-size">{(file.size / 1024).toFixed(2)} KB</p>
                    </div>
                  </div>
                  <button className="remove-file-btn" onClick={handleRemoveFile}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              )}

              {error && (
                <div className="error-message" style={{ marginTop: '1rem' }}>
                  {error}
                </div>
              )}

              {success && (
                <div className="success-message" style={{ marginTop: '1rem' }}>
                  {success}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose} disabled={uploading}>
            Cancel
          </button>
          <button 
            className="btn-primary" 
            onClick={handleUpload} 
            disabled={!file || uploading}
          >
            {uploading ? 'Uploading...' : 'Upload File'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default FileUploadModal;

