import { useEffect } from 'react';
import '../styles/Modal.css';

function Modal({ open, title, children, onClose }) {
  // Lock/unlock background scroll based on `open`
  useEffect(() => {
    const originalBody = document.body.style.overflow;
    const originalHtml = document.documentElement.style.overflow;
    if (open) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = originalBody || '';
      document.documentElement.style.overflow = originalHtml || '';
    }
    return () => {
      document.body.style.overflow = originalBody || '';
      document.documentElement.style.overflow = originalHtml || '';
    };
  }, [open]);

  if (!open) return null;

  const onOverlay = (e) => { if (e.target === e.currentTarget) onClose(); };

  return (
    <div className="modal-overlay" onClick={onOverlay}>
      <div className="modal-card" role="dialog" aria-modal="true">
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export default Modal;


