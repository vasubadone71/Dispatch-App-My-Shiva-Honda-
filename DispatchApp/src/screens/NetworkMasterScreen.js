import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Alert } from 'react-native';
import { colors, spacing } from '../theme/colors';
import { storeData, getData, STORAGE_KEYS } from '../utils/storage';
import Header from '../components/Header';
import Card from '../components/Card';
import CustomButton from '../components/Button';
import InputField from '../components/Input';
import * as DocumentPicker from 'expo-document-picker';
import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export default function NetworkMasterScreen({ navigation }) {
  const [networks, setNetworks] = useState([]);
  const [formData, setFormData] = useState({ id: null, networkName: '', place: '', city: '', ownerName: '', contactNumber: '' });
  const [isEditing, setIsEditing] = useState(false);

  const mergeUnique = (existing, incoming, key) => {
    return [
      ...existing,
      ...incoming.filter(
        item => !existing.some(e => e[key] === item[key])
      )
    ];
  };

  const pickExcelFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/csv',
          'application/vnd.ms-excel'
        ]
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        handleImport(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick file');
    }
  };

  const handleImport = async (file) => {
    try {
      const fileString = await FileSystem.readAsStringAsync(file.uri, { encoding: 'base64' });
      const workbook = XLSX.read(fileString, { type: 'base64' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet);

      let imported = 0;
      let skipped = 0;
      let newNetworks = [];

      jsonData.forEach((row, index) => {
        const netName = row["Network Name"];
        if (!netName) {
          skipped++;
          return;
        }
        newNetworks.push({
          id: Date.now().toString() + index,
          networkName: String(netName),
          city: String(row["Location"] || ''),
          place: String(row["Location"] || ''),
          contactNumber: String(row["Mobile Number"] || ''),
          ownerName: ''
        });
        imported++;
      });

      if (newNetworks.length > 0) {
        const finalNetworks = mergeUnique(networks, newNetworks, "networkName");
        const addedCount = finalNetworks.length - networks.length;
        const duplicates = newNetworks.length - addedCount;
        
        setNetworks(finalNetworks);
        await storeData(STORAGE_KEYS.NETWORKS, finalNetworks);
        
        Alert.alert('Import Success', `✅ ${addedCount} Networks Imported\n⚠ ${duplicates} Duplicates Skipped\n❌ ${skipped} Invalid Rows Skipped`);
      } else {
        Alert.alert('Import Result', `No valid data found.\n❌ ${skipped} Invalid Rows Skipped`);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to process the Excel file. Please ensure it matches the sample format.');
    }
  };

  const downloadSample = async () => {
    try {
      const data = [
        { "Network Name": "Shiva Honda", "Location": "Biaora", "Mobile Number": "9999999999" }
      ];
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sample");
      const base64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
      const fileUri = FileSystem.documentDirectory + "networks_sample.xlsx";
      await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: 'base64' });
      
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert("Error", "Sharing is not available on this device");
        return;
      }

      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Sample file ready. Choose where to save.',
        UTI: 'com.microsoft.excel.xls'
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to download sample: ' + error.message);
    }
  };

  useEffect(() => {
    loadNetworks();
  }, []);

  const loadNetworks = async () => {
    const data = await getData(STORAGE_KEYS.NETWORKS);
    if (data) setNetworks(data);
  };

  const handleSave = async () => {
    if (!formData.networkName || !formData.city) {
      Alert.alert('Error', 'Network Name and City are required.');
      return;
    }
    let updatedNetworks;
    if (isEditing) {
      updatedNetworks = networks.map(n => n.id === formData.id ? { ...formData } : n);
    } else {
      updatedNetworks = [...networks, { ...formData, id: Date.now().toString() }];
    }
    setNetworks(updatedNetworks);
    await storeData(STORAGE_KEYS.NETWORKS, updatedNetworks);
    resetForm();
  };

  const handleDelete = (id) => {
    Alert.alert('Delete', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const remaining = networks.filter(n => n.id !== id);
        setNetworks(remaining);
        await storeData(STORAGE_KEYS.NETWORKS, remaining);
      }}
    ]);
  };

  const editNetwork = (network) => {
    setFormData(network);
    setIsEditing(true);
  };

  const resetForm = () => {
    setFormData({ id: null, networkName: '', place: '', city: '', ownerName: '', contactNumber: '' });
    setIsEditing(false);
  };

  return (
    <View style={styles.container}>
      <Header title="Network Master" hideLogo />
      <FlatList
        data={networks}
        keyExtractor={item => item.id}
        ListHeaderComponent={(
          <Card>
            <View style={styles.headerRow}>
              <Text style={styles.formTitle}>{isEditing ? 'Edit Network' : 'Add New Network'}</Text>
              <View style={styles.headerActions}>
                <CustomButton title="📥 Import Excel" onPress={pickExcelFile} style={styles.actionBtn} />
                <CustomButton title="📥 Download Sample Excel" type="outline" onPress={downloadSample} style={styles.actionBtn} />
              </View>
            </View>
            <InputField label="Network Name *" value={formData.networkName} onChangeText={(text) => setFormData({...formData, networkName: text})} />
            <InputField label="Place" value={formData.place} onChangeText={(text) => setFormData({...formData, place: text})} />
            <InputField label="City *" value={formData.city} onChangeText={(text) => setFormData({...formData, city: text})} />
            <InputField label="Owner Name" value={formData.ownerName} onChangeText={(text) => setFormData({...formData, ownerName: text})} />
            <InputField label="Contact Number" keyboardType="phone-pad" value={formData.contactNumber} onChangeText={(text) => setFormData({...formData, contactNumber: text})} />
            <CustomButton title={isEditing ? 'Update Network' : 'Save Network'} onPress={handleSave} />
            {isEditing && <CustomButton title="Cancel" type="outline" onPress={resetForm} />}
          </Card>
        )}
        renderItem={({ item }) => (
          <Card>
            <View style={styles.row}>
              <View style={styles.info}>
                <Text style={styles.name}>{item.networkName}</Text>
                <Text>{item.city} - {item.contactNumber}</Text>
              </View>
              <View style={styles.actions}>
                <CustomButton title="Edit" onPress={() => editNetwork(item)} style={styles.smallBtn} />
                <CustomButton title="Del" onPress={() => handleDelete(item.id)} type="outline" style={styles.smallBtn} />
              </View>
            </View>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  formTitle: { fontSize: 18, fontWeight: 'bold', color: colors.primary, marginBottom: 0 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginBottom: spacing.m, gap: 10 },
  headerActions: { flexDirection: 'row', gap: 10 },
  actionBtn: { paddingVertical: 8, paddingHorizontal: 12, marginVertical: 0 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: 'bold' },
  actions: { flexDirection: 'row', gap: 5 },
  smallBtn: { paddingVertical: 6, paddingHorizontal: 10, marginVertical: 0 },
});
