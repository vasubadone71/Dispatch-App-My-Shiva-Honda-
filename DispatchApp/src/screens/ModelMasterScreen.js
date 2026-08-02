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

export default function ModelMasterScreen() {
  const [models, setModels] = useState([]);
  const [formData, setFormData] = useState({ id: null, modelName: '', price: '' });
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

      let skipped = 0;
      let newModels = [];

      jsonData.forEach((row, index) => {
        const modelName = row["Model Name"] || row["Model Variant"];
        const exPrice = row["Ex Showroom Price"] || row["Ex Showroom price"];
        
        if (!modelName || !exPrice) {
          skipped++;
          return;
        }
        
        const priceNum = parseFloat(exPrice);
        if (isNaN(priceNum)) {
          skipped++;
          return;
        }

        newModels.push({
          id: Date.now().toString() + index,
          modelName: String(modelName),
          price: String(priceNum)
        });
      });

      if (newModels.length > 0) {
        const finalModels = mergeUnique(models, newModels, "modelName");
        const addedCount = finalModels.length - models.length;
        const duplicates = newModels.length - addedCount;
        
        setModels(finalModels);
        await storeData(STORAGE_KEYS.MODELS, finalModels);
        
        Alert.alert('Import Success', `✅ ${addedCount} Models Imported\n⚠ ${duplicates} Duplicates Skipped\n❌ ${skipped} Invalid Rows Skipped`);
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
        { "Model Name": "SP125 OBD2B", "Ex Showroom Price": "90000" }
      ];
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sample");
      const base64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
      const fileUri = FileSystem.documentDirectory + "models_sample.xlsx";
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
    loadModels();
  }, []);

  const loadModels = async () => {
    const data = await getData(STORAGE_KEYS.MODELS);
    if (data) setModels(data);
  };

  const handleSave = async () => {
    if (!formData.modelName || !formData.price) {
      Alert.alert('Error', 'Name and Price are required.');
      return;
    }
    let updated;
    if (isEditing) {
      updated = models.map(m => m.id === formData.id ? { ...formData } : m);
    } else {
      updated = [...models, { ...formData, id: Date.now().toString() }];
    }
    setModels(updated);
    await storeData(STORAGE_KEYS.MODELS, updated);
    resetForm();
  };

  const handleDelete = (id) => {
    Alert.alert('Delete', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const remaining = models.filter(m => m.id !== id);
        setModels(remaining);
        await storeData(STORAGE_KEYS.MODELS, remaining);
      }}
    ]);
  };

  const resetForm = () => {
    setFormData({ id: null, modelName: '', price: '' });
    setIsEditing(false);
  };

  return (
    <View style={styles.container}>
      <Header title="Model Master" hideLogo />
      <FlatList
        data={models}
        keyExtractor={item => item.id}
        ListHeaderComponent={(
          <Card>
            <View style={styles.headerRow}>
              <Text style={styles.formTitle}>{isEditing ? 'Edit Model' : 'Add New Model'}</Text>
              <View style={styles.headerActions}>
                <CustomButton title="📥 Import Excel" onPress={pickExcelFile} style={styles.actionBtn} />
                <CustomButton title="📥 Download Sample Excel" type="outline" onPress={downloadSample} style={styles.actionBtn} />
              </View>
            </View>
            <InputField label="Model Name *" value={formData.modelName} onChangeText={(text) => setFormData({...formData, modelName: text})} />
            <InputField label="Ex-Showroom Price *" keyboardType="numeric" value={formData.price} onChangeText={(text) => setFormData({...formData, price: text})} />
            <CustomButton title={isEditing ? 'Update Model' : 'Save Model'} onPress={handleSave} />
            {isEditing && <CustomButton title="Cancel" type="outline" onPress={resetForm} />}
          </Card>
        )}
        renderItem={({ item }) => (
          <Card style={styles.row}>
            <View style={styles.info}>
              <Text style={styles.name}>{item.modelName}</Text>
              <Text>₹ {item.price}</Text>
            </View>
            <View style={styles.actions}>
              <CustomButton title="Edit" onPress={() => { setFormData(item); setIsEditing(true); }} style={styles.smallBtn} />
              <CustomButton title="Del" onPress={() => handleDelete(item.id)} type="outline" style={styles.smallBtn} />
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
