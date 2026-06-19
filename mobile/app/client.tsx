import { useState, useEffect } from 'react'
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import api from '../src/lib/api'

interface Client {
  id: number
  name: string
  phone: string
  vehicle: string
  creditLimit: number
  currentBalance: number
}

export default function ClientScreen() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Client[]>([])
  const [selected, setSelected] = useState<Client | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const t = setTimeout(async () => {
      try {
        const res = await api.get('/clients', { params: { q: query } })
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
            <Text style={styles.detailLabel}>Teléfono</Text>
            <Text style={styles.detailValue}>{selected.phone}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Vehículo</Text>
            <Text style={styles.detailValue}>{selected.vehicle || '-'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Límite Crédito</Text>
            <Text style={styles.detailValue}>{formatCurrency(selected.creditLimit)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Saldo Actual</Text>
            <Text style={[styles.detailValue, selected.currentBalance > 0 && { color: '#dc2626' }]}>
              {formatCurrency(selected.currentBalance)}
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
        <Text style={styles.headerTitle}>Clientes</Text>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Nombre o teléfono..."
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
              <Text style={styles.resultMeta}>{item.phone}{item.vehicle ? ` | ${item.vehicle}` : ''}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.resultBalance}>
                Saldo: {formatCurrency(item.currentBalance)}
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
  resultBalance: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40, fontSize: 16 },
  detailCard: { backgroundColor: 'white', margin: 10, padding: 20, borderRadius: 12 },
  detailTitle: { fontSize: 20, fontWeight: 'bold', color: '#1f2937', marginBottom: 16 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  detailLabel: { color: '#6b7280', fontSize: 14 },
  detailValue: { color: '#1f2937', fontSize: 14, fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 8 },
})
