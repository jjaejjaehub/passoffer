'use client'

import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  Download,
  CheckCircle,
  AlertTriangle,
  XCircle,
  FileSpreadsheet,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UploadState, BulkUploadRow, CarrierId } from '@/src/entities/delivery'
import { CARRIER_CONFIG } from '@/src/entities/delivery'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// Mock parsed data
const MOCK_PARSED_DATA: BulkUploadRow[] = [
  { rowNumber: 2, orderId: 'QOO-2024-018471', carrierId: 'cj', trackingNumber: '1234-5678-9012', validationStatus: 'valid' },
  { rowNumber: 3, orderId: 'QOO-2024-018472', carrierId: 'lotte', trackingNumber: '2345-6789-0123', validationStatus: 'valid' },
  { rowNumber: 4, orderId: 'QOO-2024-018473', carrierId: 'cj', trackingNumber: '3456-7890-1234', validationStatus: 'warning', validationMessage: '이미 등록된 송장번호입니다 (중복 허용 후 등록 가능)' },
  { rowNumber: 5, orderId: 'QOO-2024-018474', carrierId: 'hanjin', trackingNumber: '4567-8901-2345', validationStatus: 'valid' },
  { rowNumber: 6, orderId: 'QOO-2024-018499', carrierId: 'epost', trackingNumber: '567-8901-2345', validationStatus: 'error', validationMessage: '주문번호를 찾을 수 없습니다' },
  { rowNumber: 7, orderId: 'QOO-2024-018475', carrierId: 'cj', trackingNumber: '5678-9012-3456', validationStatus: 'valid' },
  { rowNumber: 8, orderId: 'QOO-2024-018476', carrierId: 'lotte', trackingNumber: 'ABC123', validationStatus: 'error', validationMessage: '송장번호 형식이 올바르지 않습니다' },
  { rowNumber: 9, orderId: 'QOO-2024-018477', carrierId: 'cj', trackingNumber: '6789-0123-4567', validationStatus: 'valid' },
]

interface ExcelUploadZoneProps {
  onUploadComplete?: (validRows: BulkUploadRow[]) => void
  onViewHistory?: () => void
}

export function ExcelUploadZone({ onUploadComplete, onViewHistory }: ExcelUploadZoneProps) {
  const [state, setState] = useState<UploadState>('idle')
  const [parsedData, setParsedData] = useState<BulkUploadRow[]>([])
  const [fileName, setFileName] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [submitProgress, setSubmitProgress] = useState(0)
  const [filterStatus, setFilterStatus] = useState<'all' | 'valid' | 'warning' | 'error'>('all')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validCount = parsedData.filter((r) => r.validationStatus === 'valid').length
  const warningCount = parsedData.filter((r) => r.validationStatus === 'warning').length
  const errorCount = parsedData.filter((r) => r.validationStatus === 'error').length
  const submittableCount = validCount + warningCount

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setState('dragover')
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setState('idle')
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.name.endsWith('.xlsx')) {
      processFile(file)
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }, [])

  const processFile = async (file: File) => {
    setFileName(file.name)
    setState('uploading')
    setUploadProgress(0)

    // Simulate upload progress
    for (let i = 0; i <= 100; i += 20) {
      await new Promise((resolve) => setTimeout(resolve, 200))
      setUploadProgress(i)
    }

    // Set mock parsed data
    setParsedData(MOCK_PARSED_DATA)
    setState('preview')
  }

  const handleSubmit = async () => {
    setState('submitting')
    setSubmitProgress(0)

    const validRows = parsedData.filter(
      (r) => r.validationStatus === 'valid' || r.validationStatus === 'warning'
    )

    // Simulate submission progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise((resolve) => setTimeout(resolve, 150))
      setSubmitProgress(i)
    }

    setState('done')
    onUploadComplete?.(validRows)
  }

  const handleReset = () => {
    setState('idle')
    setParsedData([])
    setFileName('')
    setUploadProgress(0)
    setSubmitProgress(0)
    setFilterStatus('all')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleTemplateDownload = () => {
    alert('양식 다운로드 기능 (시뮬레이션)')
  }

  const filteredData = filterStatus === 'all'
    ? parsedData
    : parsedData.filter((r) => r.validationStatus === filterStatus)

  return (
    <div className="h-full flex flex-col">
      <AnimatePresence mode="wait">
        {/* Idle / Dragover state */}
        {(state === 'idle' || state === 'dragover') && (
          <motion.div
            key="upload"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center p-8"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                'w-full max-w-md border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
                state === 'dragover'
                  ? 'border-indigo-400 bg-indigo-50'
                  : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
              )}
            >
              <Upload
                className={cn(
                  'size-10 mx-auto mb-4',
                  state === 'dragover' ? 'text-indigo-500' : 'text-slate-400'
                )}
              />
              <p className={cn(
                'text-base font-medium mb-1',
                state === 'dragover' ? 'text-indigo-700' : 'text-slate-700'
              )}>
                {state === 'dragover'
                  ? '파일을 놓으세요'
                  : '엑셀 파일을 여기에 드래그하거나 클릭해서 업로드하세요'}
              </p>
              <p className="text-sm text-slate-400">.xlsx 파일만 지원됩니다</p>
            </div>

            <div className="w-full max-w-md mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleTemplateDownload}
                className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700"
              >
                <Download className="size-4" />
                양식 다운로드
              </button>
              <span className="text-slate-300">|</span>
              <span className="text-sm text-slate-500">
                필수 열: 주문번호, 택배사, 송장번호
              </span>
            </div>
          </motion.div>
        )}

        {/* Uploading state */}
        {state === 'uploading' && (
          <motion.div
            key="uploading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center p-8"
          >
            <FileSpreadsheet className="size-12 text-slate-400 mb-4" />
            <p className="text-base font-medium text-slate-700 mb-4">
              파일을 분석하는 중입니다...
            </p>
            <Progress value={uploadProgress} className="w-64" />
          </motion.div>
        )}

        {/* Preview state */}
        {state === 'preview' && (
          <motion.div
            key="preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            {/* Summary header */}
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="size-5 text-slate-500" />
                  <span className="font-medium text-slate-700">{fileName}</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-sm text-slate-500">총 {parsedData.length}행 분석 완료</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFilterStatus('all')}
                  className={cn(
                    'px-2 py-1 rounded text-sm font-medium transition-colors',
                    filterStatus === 'all' ? 'bg-slate-200 text-slate-700' : 'text-slate-500 hover:bg-slate-100'
                  )}
                >
                  전체 {parsedData.length}건
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('valid')}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded text-sm font-medium transition-colors',
                    filterStatus === 'valid' ? 'bg-green-100 text-green-700' : 'text-green-600 hover:bg-green-50'
                  )}
                >
                  <CheckCircle className="size-3.5" />
                  정상 {validCount}건
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('warning')}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded text-sm font-medium transition-colors',
                    filterStatus === 'warning' ? 'bg-yellow-100 text-yellow-700' : 'text-yellow-600 hover:bg-yellow-50'
                  )}
                >
                  <AlertTriangle className="size-3.5" />
                  경고 {warningCount}건
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('error')}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded text-sm font-medium transition-colors',
                    filterStatus === 'error' ? 'bg-red-100 text-red-700' : 'text-red-600 hover:bg-red-50'
                  )}
                >
                  <XCircle className="size-3.5" />
                  오류 {errorCount}건
                </button>
              </div>
            </div>

            {/* Preview table */}
            <div className="flex-1 overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow>
                    <TableHead className="w-16">행번호</TableHead>
                    <TableHead className="w-36">주문번호</TableHead>
                    <TableHead className="w-28">택배사</TableHead>
                    <TableHead className="w-36">송장번호</TableHead>
                    <TableHead className="w-20">유효성</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((row) => (
                    <TableRow
                      key={row.rowNumber}
                      className={cn(
                        row.validationStatus === 'error' && 'bg-red-50'
                      )}
                    >
                      <TableCell className="text-sm text-slate-500">
                        {row.rowNumber}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {row.orderId}
                      </TableCell>
                      <TableCell className="text-sm">
                        {CARRIER_CONFIG[row.carrierId]?.name || row.carrierId}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {row.trackingNumber}
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                {row.validationStatus === 'valid' && (
                                  <CheckCircle className="size-5 text-green-500" />
                                )}
                                {row.validationStatus === 'warning' && (
                                  <AlertTriangle className="size-5 text-yellow-500" />
                                )}
                                {row.validationStatus === 'error' && (
                                  <XCircle className="size-5 text-red-500" />
                                )}
                              </span>
                            </TooltipTrigger>
                            {row.validationMessage && (
                              <TooltipContent>
                                {row.validationMessage}
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between gap-3">
              <Button variant="outline" onClick={handleReset}>
                다시 업로드
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submittableCount === 0}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                오류 제외 {submittableCount}건 등록하기
              </Button>
            </div>
          </motion.div>
        )}

        {/* Submitting state */}
        {state === 'submitting' && (
          <motion.div
            key="submitting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center p-8"
          >
            <p className="text-base font-medium text-slate-700 mb-4">
              {submittableCount}건 중 {Math.round((submitProgress / 100) * submittableCount)}건 등록 중...
            </p>
            <Progress value={submitProgress} className="w-64" />
          </motion.div>
        )}

        {/* Done state */}
        {state === 'done' && (
          <motion.div
            key="done"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center p-8"
          >
            <motion.div
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <CheckCircle className="size-16 text-green-500 mb-4" />
            </motion.div>
            <p className="text-lg font-medium text-slate-900 mb-2">
              {submittableCount}건이 성공적으로 등록됐습니다
            </p>
            <button
              type="button"
              onClick={onViewHistory}
              className="text-sm text-indigo-600 hover:text-indigo-700 underline mb-6"
            >
              처리 이력 보기
            </button>
            <Button variant="outline" onClick={handleReset}>
              다시 업로드
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
