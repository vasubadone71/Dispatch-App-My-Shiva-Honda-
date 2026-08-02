import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Alert } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { colors, spacing } from '../theme/colors';
import { getData, STORAGE_KEYS, storeData } from '../utils/storage';
import { generateAndSharePDF } from '../utils/pdfGenerator';
import { generateAndShareExcel } from '../utils/excelGenerator';
import Header from '../components/Header';
import Card from '../components/Card';
import CustomButton from '../components/Button';

export default function HistoryScreen() {
  const [history, setHistory] = useState([]);
  const isFocused = useIsFocused(); // Re-fetch on focus navigation

  useEffect(() => {
    if (isFocused) {
      loadHistory();
    }
  }, [isFocused]);

  const loadHistory = async () => {
    const data = await getData(STORAGE_KEYS.HISTORY);
    if (data) setHistory(data.reverse()); // Show latest first
  };

  const clearHistory = () => {
    Alert.alert('Clear History', 'Are you sure you want to delete all dispatch history?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear All', style: 'destructive', onPress: async () => {
        await storeData(STORAGE_KEYS.HISTORY, []);
        setHistory([]);
      }}
    ]);
  };

  return (
    <View style={styles.container}>
      <Header title="Dispatch History" hideLogo />
      <FlatList
        data={history}
        keyExtractor={item => item.id}
        ListHeaderComponent={(
          <View style={styles.listHeader}>
             <Text style={styles.subtitle}>{history.length} Record(s) Found</Text>
             {history.length > 0 && (
               <CustomButton title="Clear All" type="outline" onPress={clearHistory} style={styles.clearBtn} />
             )}
          </View>
        )}
        renderItem={({ item }) => (
          <Card>
            <View style={styles.cardHeader}>
              <Text style={styles.date}>{item.date}</Text>
              <Text style={styles.total}>Rs {item.totalAmount}</Text>
            </View>
            <Text style={styles.networkName}>{item.network.networkName} ({item.network.city})</Text>
            <Text style={styles.vehicleInfo}>Transport: {item.vehicleNo || 'N/A'}</Text>
            <Text style={styles.vehicleInfo}>Items Dispatched: {item.items.length}</Text>
            
            <View style={styles.actionRow}>
              <CustomButton title="Re-gen PDF" style={styles.actionBtn} onPress={() => generateAndSharePDF(item)} />
              <CustomButton title="Re-gen Excel" style={styles.actionBtn} type="outline" onPress={() => generateAndShareExcel(item)} />
            </View>
          </Card>
        )}
        ListEmptyComponent={(
          <Text style={styles.emptyText}>No prior dispatches found in history.</Text>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listHeader: { paddingHorizontal: spacing.m, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subtitle: { fontSize: 16, color: colors.textLight, marginVertical: spacing.m },
  clearBtn: { marginVertical: 0, paddingVertical: 6 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.s },
  date: { fontSize: 14, color: colors.textLight, fontWeight: 'bold' },
  total: { fontSize: 16, color: colors.success, fontWeight: 'bold' },
  networkName: { fontSize: 18, fontWeight: 'bold', color: colors.primary, marginBottom: spacing.s },
  vehicleInfo: { fontSize: 14, color: colors.text, marginBottom: 2 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: spacing.m },
  actionBtn: { flex: 1 },
  emptyText: { textAlign: 'center', marginTop: 50, color: colors.textLight, fontSize: 16 }
});
