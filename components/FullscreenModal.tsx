'use client'

import { Maximize2, X } from 'lucide-react'

interface FullscreenModalProps {
  onConfirm: () => void
  onCancel: () => void
}

export function FullscreenModal({ onConfirm, onCancel }: FullscreenModalProps) {
  return (
    <div className="fullscreen-overlay" role="dialog" aria-modal="true">
      <div className="fullscreen-card">
        <button className="modal-close-btn" onClick={onCancel} aria-label="Close modal">
          <X size={18} />
        </button>

        <div className="fullscreen-icon-badge">
          <Maximize2 size={24} />
        </div>

        <h3>Switch to Full Screen?</h3>
        <p>
          Would you like to open the <strong>Galgotias Drone Lab Environment Dashboard</strong> in full screen mode for an optimal monitoring display?
        </p>

        <div className="fullscreen-actions">
          <button type="button" className="btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn-okay" onClick={onConfirm}>
            <Maximize2 size={16} />
            <span>Okay</span>
          </button>
        </div>
      </div>
    </div>
  )
}
