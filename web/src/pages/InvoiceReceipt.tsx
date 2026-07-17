import { useEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'
import { formatCurrency } from '../lib/currency'

interface Props {
  sale: any
  config: {
    companyName: string
    rnc: string
    address: string
    phone: string
    email: string
    logoUrl: string
    ncf: string
  }
  onClose: () => void
}

function Barcode({ value, label }: { value: string; label: string }) {
  const ref = useRef<SVGSVGElement>(null)
  useEffect(() => {
    if (ref.current && value) {
      try {
        JsBarcode(ref.current, value, {
          format: 'CODE128',
          width: 1.5,
          height: 40,
          displayValue: false,
          margin: 0,
          background: '#ffffff',
        })
      } catch (e) { console.warn('Failed to generate barcode:', e) }
    }
  }, [value])
  return (
    <div className="flex flex-col items-center">
      <svg ref={ref} />
      <span className="text-[10px] text-gray-600 mt-1">{label}</span>
    </div>
  )
}

function formatInvoice(id: number) {
  return `INV-${new Date().getFullYear()}-${String(id).padStart(4, '0')}`
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('es-AR')
}

function formatTime(d: string) {
  return new Date(d).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

const methodLabel: Record<string, string> = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia', credit: 'Crédito' }

export default function InvoiceReceipt({ sale, config, onClose }: Props) {
  const invoiceNumber = sale.invoiceNumber || formatInvoice(sale.id)
  const hasDiscount = sale.discount > 0
  const tvaRate = sale.tax > 0 ? sale.tax : null

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #invoice-print, #invoice-print * { visibility: visible; }
          #invoice-print { position: fixed; left: 0; top: 0; width: 80mm; padding: 5mm; background: white; }
          .no-print { display: none !important; }
          @page { margin: 0; size: 80mm auto; }
        }
      `}</style>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
        <div className="bg-white rounded-2xl w-full max-w-sm mx-4 overflow-auto max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
          <div id="invoice-print" className="p-5 text-sm">
            <div className="text-center mb-4">
              {config.logoUrl && (
                <img src={config.logoUrl} alt="Logo" className="h-16 mx-auto mb-2 object-contain" />
              )}
              <h2 className="text-base font-bold text-gray-800 uppercase">{config.companyName}</h2>
              <p className="text-[11px] text-gray-500">RNC: {config.rnc}</p>
              <p className="text-[11px] text-gray-500">{config.address}</p>
              <p className="text-[11px] text-gray-500">Tel: {config.phone} | {config.email}</p>
            </div>

            <div className="text-center mb-4 border-t border-b border-gray-300 py-2">
              <h3 className="text-lg font-bold text-gray-800 tracking-wider">FACTURA</h3>
              <p className="text-sm font-mono text-blue-700 font-bold">{invoiceNumber}</p>
              {config.ncf && <p className="text-[11px] text-gray-600">NCF: {config.ncf}</p>}
            </div>

            <div className="mb-4 text-[11px] space-y-0.5">
              <div className="flex justify-between">
                <span className="text-gray-500">Cliente:</span>
                <span className="font-medium text-gray-800 text-right max-w-[180px]">{sale.client?.name || 'Consumidor Final'}</span>
              </div>
              {sale.client?.document && (
                <div className="flex justify-between">
                  <span className="text-gray-500">RNC/Doc:</span>
                  <span className="font-medium text-gray-800">{sale.client.document}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Fecha:</span>
                <span className="font-medium text-gray-800">{formatDate(sale.createdAt)} {formatTime(sale.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Vendedor:</span>
                <span className="font-medium text-gray-800">{sale.user?.name || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Pago:</span>
                <span className="font-medium text-gray-800">{methodLabel[sale.paymentMethod] || sale.paymentMethod}</span>
              </div>
            </div>

            <table className="w-full text-[11px] mb-4">
              <thead>
                <tr className="border-t border-b border-gray-300">
                  <th className="text-left py-1 font-medium text-gray-500 w-8">Cant</th>
                  <th className="text-left py-1 font-medium text-gray-500">Descripción</th>
                  <th className="text-right py-1 font-medium text-gray-500 w-14">Precio</th>
                  <th className="text-right py-1 font-medium text-gray-500 w-14">Total</th>
                </tr>
              </thead>
              <tbody>
                {sale.items?.map((item: any, i: number) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 text-gray-800">{item.quantity}</td>
                    <td className="py-1 text-gray-800">{item.productName}</td>
                    <td className="py-1 text-right text-gray-800">{formatCurrency(item.unitPrice)}</td>
                    <td className="py-1 text-right text-gray-800 font-medium">{formatCurrency(item.totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="text-right space-y-1 text-[12px] mb-4">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium text-gray-800">{formatCurrency(sale.subtotal || sale.total)}</span>
              </div>
              {hasDiscount && (
                <div className="flex justify-between text-red-600">
                  <span>Descuento</span>
                  <span>-{formatCurrency(sale.discount)}</span>
                </div>
              )}
              {tvaRate !== null && (
                <div className="flex justify-between">
                  <span className="text-gray-500">TVA ({tvaRate}%)</span>
                  <span className="font-medium text-gray-800">{formatCurrency(sale.taxTotal)}</span>
                </div>
              )}
              {sale.pointsRedeemed > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Desc. puntos</span>
                  <span>-{formatCurrency(Math.round(sale.pointsRedeemed * 0.05 * 100) / 100)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base border-t border-gray-300 pt-1">
                <span>TOTAL</span>
                <span>{formatCurrency(sale.total)}</span>
              </div>
              {sale.pointsEarned > 0 && (
                <div className="flex justify-between text-[11px] text-yellow-600 font-medium">
                  <span>Puntos ganados</span>
                  <span>+{sale.pointsEarned} pts</span>
                </div>
              )}
            </div>

            <div className="flex flex-col items-center gap-3 mb-3">
              <Barcode value={invoiceNumber} label="Nº Factura" />
              {config.ncf && <Barcode value={config.ncf} label="NCF" />}
            </div>

            <div className="text-center text-[11px] text-gray-400 border-t border-gray-200 pt-2">
              <p>¡Gracias por su compra!</p>
            </div>
          </div>

          <div className="flex gap-3 p-4 border-t border-gray-200 no-print">
            <button onClick={() => window.print()} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
              Imprimir
            </button>
            <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
