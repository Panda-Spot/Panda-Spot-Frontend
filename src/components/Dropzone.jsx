import { useRef, useState } from 'react'
import { UploadCloud } from 'lucide-react'

export default function Dropzone({ onFiles, accept, multiple = true, disabled, hint }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  const handleFiles = (fileList) => {
    const files = Array.from(fileList || [])
    if (files.length > 0) onFiles(files)
  }

  return (
    <div
      className={`dropzone${dragging ? ' dropzone-active' : ''}`}
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        if (!disabled) handleFiles(e.dataTransfer.files)
      }}
      onClick={() => !disabled && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }}
        style={{ display: 'none' }}
      />
      <UploadCloud size={36} strokeWidth={1.5} />
      <p className="dropzone-title">Drag & drop photos here</p>
      <p className="dropzone-hint">{hint || 'or click to browse'}</p>
    </div>
  )
}
