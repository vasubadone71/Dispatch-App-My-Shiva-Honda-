import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export const generateAndShareExcel = async (dispatchData) => {
  try {
    const { network, date, vehicleNo, items, totalAmount } = dispatchData;

    // Formatting data for Excel rows
    const data = [
      ['BADONE MOTORS PRIVATE LIMITED'],
      ['My Shiva Honda'],
      ['Address:', '00, Ward No 6, Biaora Bus Stand Guna Road, Biaora, Rajgarh, Madhya Pradesh - 465674'],
      ['Contact:', '9425038999'],
      [],
      ['DISPATCH INVOICE'],
      [],
      ['Network Name:', network.networkName, 'Date:', date],
      ['City:', network.city, 'Vehicle No:', vehicleNo],
      ['Owner:', network.ownerName, 'Contact:', network.contactNumber],
      [],
      ['Sr No', 'Model', 'Color', 'Frame No', 'Engine No', 'Ex-Showroom Price', 'Dealer Discount', 'Final Price'],
      ...items.map((item, index) => [
        index + 1,
        item.modelName,
        item.color || 'N/A',
        item.frameNo,
        item.engineNo,
        item.price,
        item.discount || 0,
        item.finalPrice
      ]),
      [],
      ['', '', '', '', '', '', 'Total Amount:', totalAmount]
    ];

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);

    XLSX.utils.book_append_sheet(wb, ws, "Invoice");

    // Write file in binary format
    const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

    // Save using file system
    const uri = FileSystem.documentDirectory + `Dispatch_Invoice_${Date.now()}.xlsx`;
    await FileSystem.writeAsStringAsync(uri, wbout, {
      encoding: FileSystem.EncodingType.Base64
    });

    if (!(await Sharing.isAvailableAsync())) {
      alert("Sharing isn't available on your platform");
      return uri;
    }

    await Sharing.shareAsync(uri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: 'Share Dispatch Excel',
      UTI: 'com.microsoft.excel.xlsx'
    });

  } catch (error) {
    console.error("Excel generation failed:", error);
    throw error;
  }
};
