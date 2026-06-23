import api from './api'

export async function downloadExport(url: string, filename: string) {
  try {
    const res = await api.get(url, { responseType: 'blob' })
    const blob = new Blob([res.data], { type: 'text/csv' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(link.href)
  } catch {
    alert('Error al descargar el archivo')
  }
}
