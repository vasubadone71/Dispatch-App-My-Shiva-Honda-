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

export default function ColorMasterScreen() {
  const [colorList, setColorList] = useState([]);
  const [formData, setFormData] = useState({ id: null, colorName: '' });
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
      let newColors = [];

      jsonData.forEach((row, index) => {
        const colName = row["Color Name"];
        
        if (!colName) {
          skipped++;
          return;
        }

        newColors.push({
          id: Date.now().toString() + index,
          colorName: String(colName)
        });
      });

      if (newColors.length > 0) {
        const finalColors = mergeUnique(colorList, newColors, "colorName");
        const addedCount = finalColors.length - colorList.length;
        const duplicates = newColors.length - addedCount;
        
        setColorList(finalColors);
        await storeData(STORAGE_KEYS.COLORS, finalColors);
        
        Alert.alert('Import Success', `✅ ${addedCount} Colors Imported\n⚠ ${duplicates} Duplicates Skipped\n❌ ${skipped} Invalid Rows Skipped`);
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
        { "Color Name": "Black" }
      ];
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sample");
      const base64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
      const fileUri = FileSystem.documentDirectory + "colors_sample.xlsx";
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
    loadColors();
  }, []);

  const loadColors = async () => {
    const data = await getData(STORAGE_KEYS.COLORS);
    if (data) setColorList(data);
  };

  const handleSave = async () => {
    if (!formData.colorName) {
      Alert.alert('Error', 'Color Name is required.');
      return;
    }
    let updated;
    if (isEditing) {
      updated = colorList.map(c => c.id === formData.id ? { ...formData } : c);
    } else {
      updated = [...colorList, { ...formData, id: Date.now().toString() }];
    }
    setColorList(updated);
    await storeData(STORAGE_KEYS.COLORS, updated);
    resetForm();
  };

  const handleDelete = (id) => {
    Alert.alert('Delete', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const remaining = colorList.filter(c => c.id !== id);
        setColorList(remaining);
        await storeData(STORAGE_KEYS.COLORS, remaining);
      }}
    ]);
  };

  const resetForm = () => {
    setFormData({ id: null, colorName: '' });
    setIsEditing(false);
  };

  return (
    <View style={styles.container}>
      <Header title="Color Master" hideLogo />
      <FlatList
        data={colorList}
        keyExtractor={item => item.id}
        ListHeaderComponent={(
          <Card>
            <View style={styles.headerRow}>
              <Text style={styles.formTitle}>{isEditing ? 'Edit Color' : 'Add New Color'}</Text>
              <View style={styles.headerActions}>
                <CustomButton title="📥 Import Excel" onPress={pickExcelFile} style={styles.actionBtn} />
                <CustomButton title="📥 Download Sample Excel" type="outline" onPress={downloadSample} style={styles.actionBtn} />
              </View>
            </View>
            <InputField 
              label="Color Name *" 
              value={formData.colorName} 
              onChangeText={(text) => setFormData({...formData, colorName: text})} 
              placeholder="e.g. Matte Axis Gray"
            />
            <CustomButton title={isEditing ? 'Update Color' : 'Save Color'} onPress={handleSave} />
            {isEditing && <CustomButton title="Cancel" type="outline" onPress={resetForm} />}
          </Card>
        )}
        renderItem={({ item }) => (
          <Card style={styles.row}>
            <View style={styles.info}>
              <Text style={styles.name}>{item.colorName}</Text>
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
