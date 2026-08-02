import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Modal, TouchableOpacity, Alert, FlatList } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { colors, spacing } from '../theme/colors';
import { storeData, getData, STORAGE_KEYS } from '../utils/storage';
import { generateAndSharePDF } from '../utils/pdfGenerator';
import { generateAndShareExcel } from '../utils/excelGenerator';
import Header from '../components/Header';
import Card from '../components/Card';
import CustomButton from '../components/Button';
import InputField from '../components/Input';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as XLSX from 'xlsx';

export default function NewDispatchScreen({ navigation }) {
  const [networks, setNetworks] = useState([]);
  const [models, setModels] = useState([]);
  const [vehicleColors, setVehicleColors] = useState([]);

  // Form states
  const [selectedNetwork, setSelectedNetwork] = useState(null);
  const [vehicleNo, setVehicleNo] = useState('');
  const [date, setDate] = useState(new Date().toLocaleDateString());
  
  // Vehicles cart
  const [cart, setCart] = useState([]);
  
  // Modals
  const [networkModal, setNetworkModal] = useState(false);
  const [modelModal, setModelModal] = useState(false);
  const [colorModal, setColorModal] = useState(false);
  const [scannerModal, setScannerModal] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [activeCartIndex, setActiveCartIndex] = useState(null); // Which item is being edited by scanner/model
  const [activeScanField, setActiveScanField] = useState(null); // 'frameNo' or 'engineNo'

  const [hasPermission, setHasPermission] = useState(null);

  useEffect(() => {
    loadData();
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const loadData = async () => {
    const nw = await getData(STORAGE_KEYS.NETWORKS);
    if (nw) setNetworks(nw);
    const md = await getData(STORAGE_KEYS.MODELS);
    if (md) setModels(md);
    const cls = await getData(STORAGE_KEYS.COLORS);
    if (cls) setVehicleColors(cls);
  };

  const addVehicleRow = () => {
    setCart([...cart, { id: Date.now().toString(), frameNo: '', engineNo: '', modelName: '', color: '', price: 0, discount: 0, finalPrice: 0 }]);
  };

  const updateCartItem = (index, field, value) => {
    setCart(prevCart => {
      const updated = [...prevCart];
      if (!updated[index]) return prevCart;
      updated[index][field] = value;
      
      // Auto-calculate finalPrice dynamically
      if (field === 'price' || field === 'discount') {
          const p = Number(updated[index].price || 0);
          const d = Number(updated[index].discount || 0);
          updated[index].finalPrice = p - d;
      }
      return updated;
    });
  };

  const removeVehicleRow = (index) => {
    const updated = [...cart];
    updated.splice(index, 1);
    setCart(updated);
  };

  const handleBarcodeScanned = ({ type, data }) => {
    if (scanned) return;
    setScanned(true);
    
    // Defer the modal close slightly to allow the camera to finish its cycle gracefully
    setTimeout(() => {
      setScannerModal(false);
    }, 100);
    
    // Check duplicate
    if (activeScanField === 'frameNo' && cart.some(item => item.frameNo === data)) {
      Alert.alert('Duplicate', 'This frame number is already added.');
      return;
    }
    if (activeScanField === 'engineNo' && cart.some(item => item.engineNo === data)) {
      Alert.alert('Duplicate', 'This engine number is already added.');
      return;
    }

    if (activeCartIndex !== null && activeScanField) {
      updateCartItem(activeCartIndex, activeScanField, data);
    }
    setActiveCartIndex(null);
    setActiveScanField(null);
  };

  const handleBulkUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'],
      });
      if (result.canceled) return;
      
      const fileUri = result.assets[0].uri;
      const base64Data = await FileSystem.readAsStringAsync(fileUri, { encoding: 'base64' });
      const wb = XLSX.read(base64Data, { type: 'base64' });
      const wsName = wb.SheetNames[0];
      const ws = wb.Sheets[wsName];
      const data = XLSX.utils.sheet_to_json(ws);
      
      const imported = [];
      for (let row of data) {
         const modelName = row['Model'] || '';
         const color = row['Color'] || '';
         const frameNo = row['Frame No'] ? row['Frame No'].toString() : '';
         const engineNo = row['Engine No'] ? row['Engine No'].toString() : '';
         const price = Number(row['Price']) || 0;
         const discount = Number(row['Discount']) || 0;
         const finalPrice = price - discount;

         if (!color) throw new Error("A row is missing Color. All vehicle rows must have a Color.");
         
         if (!vehicleColors.some(c => c.colorName.toLowerCase() === color.toLowerCase())) {
           throw new Error(`Color '${color}' not found in Color Master. Please add it first.`);
         }

         imported.push({ id: Date.now().toString() + Math.random(), modelName, color, frameNo, engineNo, price, discount, finalPrice });
      }
      setCart([...cart, ...imported]);
      Alert.alert('Success', `Imported ${imported.length} vehicles.`);
    } catch (err) {
      Alert.alert('Import Failed', err.message);
    }
  };

  const totalAmount = cart.reduce((sum, item) => sum + Number(item.finalPrice || 0), 0);

  const saveToHistory = async () => {
    if (!selectedNetwork) {
      Alert.alert('Validation', 'Please select a network first.');
      return null;
    }
    if (cart.length === 0) {
      Alert.alert('Validation', 'Add at least one vehicle.');
      return null;
    }
    
    // Validate missing fields in cart, newly enforced rules
    for (let i = 0; i < cart.length; i++) {
        if (!cart[i].color) {
            Alert.alert('Validation', `Please select a Color for Vehicle ${i+1}`);
            return null;
        }
    }

    const newDispatch = {
      id: Date.now().toString(),
      network: selectedNetwork,
      date,
      vehicleNo,
      items: cart,
      totalAmount
    };

    let history = await getData(STORAGE_KEYS.HISTORY);
    if (!history) history = [];
    
    history.push(newDispatch);
    await storeData(STORAGE_KEYS.HISTORY, history);
    return newDispatch;
  };

  const handleExportPDF = async () => {
    const dispatchData = await saveToHistory();
    if (dispatchData) {
      await generateAndSharePDF(dispatchData);
      navigation.goBack();
    }
  };

  const handleExportExcel = async () => {
    const dispatchData = await saveToHistory();
    if (dispatchData) {
      await generateAndShareExcel(dispatchData);
      navigation.goBack();
    }
  };

  const handleClearAll = () => {
    Alert.alert('Clear All Data', 'Are you sure you want to clear all data?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear All', style: 'destructive', onPress: () => {
        setSelectedNetwork(null);
        setVehicleNo('');
        setDate(new Date().toLocaleDateString());
        setCart([]);
        setActiveCartIndex(null);
        setActiveScanField(null);
      }}
    ]);
  };

  return (
    <View style={styles.container}>
      <Header title="New Dispatch" hideLogo />
      <ScrollView contentContainerStyle={styles.scroll}>
        
        {/* Network Selection */}
        <Card>
          <Text style={styles.sectionTitle}>1. Network Details</Text>
          <TouchableOpacity style={styles.selector} onPress={() => setNetworkModal(true)}>
            <Text style={selectedNetwork ? styles.selectorTextAct : styles.selectorText}>
              {selectedNetwork ? selectedNetwork.networkName : 'Select Network / Dealer'}
            </Text>
          </TouchableOpacity>
          {selectedNetwork && (
            <View style={styles.autoFill}>
              <Text>Owner: {selectedNetwork.ownerName}</Text>
              <Text>City: {selectedNetwork.city}</Text>
              <Text>Contact: {selectedNetwork.contactNumber}</Text>
            </View>
          )}

          <InputField label="Transport Vehicle Number" value={vehicleNo} onChangeText={setVehicleNo} placeholder="e.g. MP 04 AB 1234" />
          <InputField label="Date (Auto)" value={date} onChangeText={setDate} />
        </Card>

        {/* Vehicles Cart */}
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.m }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary }}>2. Vehicles</Text>
            <CustomButton title="Import Bulk Excel" onPress={handleBulkUpload} type="outline" style={{ marginTop: 0, paddingVertical: 5 }} />
          </View>
          
          {cart.map((item, index) => (
            <View key={item.id} style={styles.vehicleRow}>
              <Text style={styles.rowTitle}>Vehicle {index + 1}</Text>
              
              {/* Model Picker */}
              <TouchableOpacity style={styles.selector} onPress={() => { setActiveCartIndex(index); setModelModal(true); }}>
                <Text style={item.modelName ? styles.selectorTextAct : styles.selectorText}>
                  {item.modelName ? `${item.modelName} (Rs ${item.price})` : 'Select Model'}
                </Text>
              </TouchableOpacity>

              {/* Color Picker dropdown */}
              <TouchableOpacity style={styles.selector} onPress={() => { setActiveCartIndex(index); setColorModal(true); }}>
                <Text style={item.color ? styles.selectorTextAct : styles.selectorText}>
                  {item.color ? item.color : 'Select Color *'}
                </Text>
              </TouchableOpacity>

              {/* Scanning Fields */}
              <View style={styles.inputRow}>
                <View style={{ flex: 1, marginRight: 5 }}>
                  <InputField label="Frame No" value={item.frameNo} onChangeText={(val) => updateCartItem(index, 'frameNo', val)} />
                </View>
                <CustomButton title="Scan" onPress={() => { setScanned(false); setActiveCartIndex(index); setActiveScanField('frameNo'); setScannerModal(true); }} style={{ marginTop: 20 }} />
              </View>

              <View style={styles.inputRow}>
                <View style={{ flex: 1, marginRight: 5 }}>
                  <InputField label="Engine No" value={item.engineNo} onChangeText={(val) => updateCartItem(index, 'engineNo', val)} />
                </View>
                <CustomButton title="Scan" onPress={() => { setScanned(false); setActiveCartIndex(index); setActiveScanField('engineNo'); setScannerModal(true); }} style={{ marginTop: 20 }} />
              </View>
              
              {/* Discount and Price Calculation fields */}
              <View style={styles.inputRow}>
                <View style={{ flex: 1, marginRight: 10 }}>
                   <InputField label="Discount" keyboardType="numeric" value={item.discount.toString()} onChangeText={(val) => updateCartItem(index, 'discount', val.replace(/[^0-9]/g, ''))} />
                </View>
                <View style={{ flex: 1 }}>
                   <InputField label="Final Price" value={item.finalPrice.toString()} editable={false} />
                </View>
              </View>

              <CustomButton title="Remove Vehicle" type="outline" onPress={() => removeVehicleRow(index)} />
              <View style={styles.divider} />
            </View>
          ))}

          <CustomButton title="+ Add Vehicle Manually" type="outline" onPress={addVehicleRow} />

        </Card>

        {/* Totals and Actions */}
        <Card style={styles.totalsCard}>
          <Text style={styles.totalText}>Total Amount: Rs {totalAmount}</Text>
          <View style={{height: 10}} />
          <CustomButton title="Save & Export PDF" onPress={handleExportPDF} />
          <CustomButton title="Save & Export Excel" type="outline" onPress={handleExportExcel} />
          <View style={{height: 10}} />
          <CustomButton 
            title="Clear All Data" 
            type="outline" 
            onPress={handleClearAll} 
          />
        </Card>

      </ScrollView>

      {/* Network Picker Modal */}
      <Modal visible={networkModal} animationType="slide" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Network</Text>
            <FlatList
              data={networks}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalItem} onPress={() => { setSelectedNetwork(item); setNetworkModal(false); }}>
                  <Text style={styles.modalItemText}>{item.networkName} ({item.city})</Text>
                </TouchableOpacity>
              )}
            />
            <CustomButton title="Close" type="outline" onPress={() => setNetworkModal(false)} />
          </View>
        </View>
      </Modal>

      {/* Model Picker Modal */}
      <Modal visible={modelModal} animationType="slide" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Model</Text>
            <FlatList
              data={models}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalItem} onPress={() => { 
                  updateCartItem(activeCartIndex, 'modelName', item.modelName);
                  updateCartItem(activeCartIndex, 'price', item.price);
                  setModelModal(false); 
                }}>
                  <Text style={styles.modalItemText}>{item.modelName} (Rs {item.price})</Text>
                </TouchableOpacity>
              )}
            />
            <CustomButton title="Close" type="outline" onPress={() => setModelModal(false)} />
          </View>
        </View>
      </Modal>

      {/* Color Picker Modal */}
      <Modal visible={colorModal} animationType="slide" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Color</Text>
            <FlatList
              data={vehicleColors}
              keyExtractor={item => item.id}
              ListEmptyComponent={<Text style={{padding: 10, textAlign: 'center'}}>No Colors Found. Add in Color Master.</Text>}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalItem} onPress={() => { 
                  updateCartItem(activeCartIndex, 'color', item.colorName);
                  setColorModal(false); 
                }}>
                  <Text style={styles.modalItemText}>{item.colorName}</Text>
                </TouchableOpacity>
              )}
            />
            <CustomButton title="Close" type="outline" onPress={() => setColorModal(false)} />
          </View>
        </View>
      </Modal>

      {/* Camera Scanner Modal */}
      <Modal visible={scannerModal} animationType="slide">
        {hasPermission === false ? <Text>No access to camera</Text> : (
          <View style={{ flex: 1 }}>
            <CameraView 
              style={StyleSheet.absoluteFillObject} 
              onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ["qr", "ean13", "ean8", "code128", "code39"],
              }}
            />
            <View style={styles.scannerOverlay}>
              <Text style={styles.scannerText}>Aim at barcode on vehicle {activeScanField === 'engineNo' ? 'engine' : 'frame'}.</Text>
              <CustomButton title="Cancel Scan" onPress={() => { setScannerModal(false); setActiveCartIndex(null); setActiveScanField(null); }} />
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: spacing.xl },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.primary, marginBottom: spacing.m },
  selector: { borderWidth: 1, borderColor: colors.border, borderRadius: 6, padding: spacing.m, marginBottom: spacing.m },
  selectorText: { color: colors.textLight, fontSize: 16 },
  selectorTextAct: { color: colors.text, fontSize: 16, fontWeight: 'bold' },
  autoFill: { backgroundColor: '#f9f9f9', padding: spacing.s, borderRadius: 4, marginBottom: spacing.m },
  vehicleRow: { marginBottom: spacing.m },
  rowTitle: { fontWeight: 'bold', marginBottom: spacing.s, color: colors.text },
  inputRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.s },
  totalsCard: { alignItems: 'stretch' },
  totalText: { fontSize: 20, fontWeight: 'bold', textAlign: 'right', color: colors.success },
  
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing.l },
  modalContent: { backgroundColor: colors.white, borderRadius: 8, padding: spacing.m, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.primary, marginBottom: spacing.m },
  modalItem: { paddingVertical: spacing.m, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalItemText: { fontSize: 16, color: colors.text },
  
  scannerOverlay: { flex: 1, justifyContent: 'flex-end', padding: spacing.xl, paddingBottom: 50 },
  scannerText: { fontSize: 18, color: 'white', backgroundColor: 'rgba(0,0,0,0.7)', padding: 10, textAlign: 'center', marginBottom: 20, borderRadius: 8 }
});
