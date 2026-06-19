import { useState, useEffect } from 'react'
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import api from '../src/lib/api'

interface Product {
  id: number
  code: string
  name: string
  brand: string
  category: string
  oemNumber: string
  stock: number
  sellPrice: number
  buyPrice: number
  location: string
}

export default function SearchScreen() {
  const { q: initialQ } = useLocalSearchParams<{ q: string }>()
  const [query, setQuery] = useState(initialQ || '')
  const [results, setResults] = useState<Product[]>([])
  const [selected, setSelected] = useState<Product | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const t = setTimeout(async () => {
      try {
        const res = await api.get('/products', { params: { q: query, active: true } })
        setResults(res.data)
      } catch {}
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  const formatCurrency = (n: number) => `$${n.toLocaleString('es-AR')}`

  if (selected) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelected(null)}>
            <Text style={styles.backText}>Volver</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.detailCard}>
          <Text style={styles.detailTitle}>{selected.name}</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Código</Text>
            <Text style={styles.detailValue}>{selected.code}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Marca</Text>
            <Text style={styles.detailValue}>{selected.brand}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Categoría</Text>
            <Text style={styles.detailValue}>{selected.category}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>OEM</Text>
            <Text style={styles.detailValue}>{selected.oemNumber || '-'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Ubicación</Text>
            <Text style={styles.detailValue}>{selected.location || '-'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Stock</Text>
            <Text style={[styles.detailValue, selected.stock <= 5 && { color: '#dc2626', fontWeight: 'bold' }]}>
              {selected.stock}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Precio Compra</Text>
            <Text style={styles.detailValue}>{formatCurrency(selected.buyPrice)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Precio Venta</Text>
            <Text style={[styles.detailValue, { color: '#2563eb', fontWeight: 'bold', fontSize: 20 }]}>
              {formatCurrency(selected.sellPrice)}
            </Text>
          </View>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Buscar Producto</Text>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Código, nombre, OEM..."
        value={query}
        onChangeText={setQuery}
        autoFocus
      />

      <FlatList
        data={results}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.resultCard} onPress={() => setSelected(item)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.resultName}>{item.name}</Text>
              <Text style={styles.resultMeta}>{item.brand} | {item.code}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.resultPrice}>{formatCurrency(item.sellPrice)}</Text>
              <Text style={[styles.resultStock, item.stock <= 5 && { color: '#dc2626' }]}>
                Stock: {item.stock}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          query ? <Text style={styles.empty}>Sin resultados</Text> : null
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: { backgroundColor: '#2563eb', padding: 20, paddingTop: 60, flexDirection: 'row', alignItems: 'center', gap: 16 },
  backText: { color: '#bfdbfe', fontSize: 16 },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  searchInput: { backgroundColor: 'white', margin: 10, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#d1d5db', fontSize: 16 },
  resultCard: { backgroundColor: 'white', marginHorizontal: 10, marginVertical: 4, padding: 14, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultName: { fontSize: 15, fontWeight: '600', color: '#1f2937' },
  resultMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  resultPrice: { fontSize: 16, fontWeight: 'bold', color: '#2563eb' },
  resultStock: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40, fontSize: 16 },
  detailCard: { backgroundColor: 'white', margin: 10, padding: 20, borderRadius: 12 },
  detailTitle: { fontSize: 20, fontWeight: 'bold', color: '#1f2937', marginBottom: 16 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  detailLabel: { color: '#6b7280', fontSize: 14 },
  detailValue: { color: '#1f2937', fontSize: 14, fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 8 },
})
