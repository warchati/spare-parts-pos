import { useState, useEffect } from 'react'
import { View, Text, TextInput, FlatList, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import api from '../src/lib/api'

interface Product {
  id: number
  code: string
  name: string
  brand: string
  stock: number
  sellPrice: number
}

export default function HomeScreen() {
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [lowStock, setLowStock] = useState<Product[]>([])
  const router = useRouter()

  const loadProducts = async () => {
    try {
      const res = await api.get('/products', { params: { q: search || undefined } })
      const all = res.data
      setProducts(all)
      setLowStock(all.filter((p: Product) => p.stock <= 5))
    } catch {}
  }

  useEffect(() => { loadProducts() }, [search])

  const onRefresh = async () => {
    setRefreshing(true)
    await loadProducts()
    setRefreshing(false)
  }

  const formatCurrency = (n: number) => `$${n.toLocaleString('es-AR')}`

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AutoRepuestos</Text>
        <Text style={styles.subtitle}>Stock y Precios</Text>
      </View>

      {lowStock.length > 0 && (
        <View style={styles.warning}>
          <Text style={styles.warningText}>
            {lowStock.length} producto(s) con stock bajo
          </Text>
        </View>
      )}

      <TextInput
        style={styles.searchInput}
        placeholder="Buscar producto..."
        value={search}
        onChangeText={setSearch}
      />

      <FlatList
        data={products}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.productCard} onPress={() => router.push({ pathname: '/search', params: { q: item.name } })}>
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{item.name}</Text>
              <Text style={styles.productBrand}>{item.brand} | {item.code}</Text>
            </View>
            <View style={styles.productRight}>
              <Text style={styles.productPrice}>{formatCurrency(item.sellPrice)}</Text>
              <Text style={[styles.productStock, item.stock <= 5 && styles.stockLow]}>
                Stock: {item.stock}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No se encontraron productos</Text>
        }
      />

      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerBtn} onPress={() => router.push('/search')}>
          <Text style={styles.footerBtnText}>Buscar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerBtn} onPress={() => router.push('/client')}>
          <Text style={styles.footerBtnText}>Clientes</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: { backgroundColor: '#2563eb', padding: 20, paddingTop: 60 },
  title: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  subtitle: { fontSize: 14, color: '#bfdbfe', marginTop: 2 },
  warning: { backgroundColor: '#fef3c7', padding: 10, margin: 10, borderRadius: 8 },
  warningText: { color: '#92400e', textAlign: 'center', fontWeight: '500' },
  searchInput: { backgroundColor: 'white', margin: 10, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#d1d5db', fontSize: 16 },
  productCard: { backgroundColor: 'white', marginHorizontal: 10, marginVertical: 4, padding: 14, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  productInfo: { flex: 1 },
  productName: { fontSize: 15, fontWeight: '600', color: '#1f2937' },
  productBrand: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  productRight: { alignItems: 'flex-end' },
  productPrice: { fontSize: 16, fontWeight: 'bold', color: '#2563eb' },
  productStock: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  stockLow: { color: '#dc2626', fontWeight: 'bold' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40, fontSize: 16 },
  footer: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#e5e7eb', backgroundColor: 'white' },
  footerBtn: { flex: 1, alignItems: 'center', padding: 14 },
  footerBtnText: { color: '#2563eb', fontWeight: '600' },
})
