import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export const generateAndSharePDF = async (dispatchData) => {
  try {
    const { network, date, vehicleNo, items, totalAmount } = dispatchData;

    const tableRows = items.map((item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${item.modelName}</td>
        <td>${item.color || 'N/A'}</td>
        <td>${item.frameNo}</td>
        <td>${item.engineNo}</td>
        <td>Rs ${item.price}</td>
        <td>Rs ${item.discount || 0}</td>
        <td>Rs ${item.finalPrice}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: 'Helvetica'; padding: 20px; color: #333; }
            .header { text-align: center; color: #CC0000; padding-bottom: 20px; border-bottom: 2px solid #CC0000; }
            .title { font-size: 28px; font-weight: bold; margin: 0; }
            .subtitle { font-size: 18px; margin-top: 5px; color: #555; }
            .details-container { display: flex; justify-content: space-between; margin-top: 30px; margin-bottom: 30px; }
            .details-box { width: 45%; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f2f2f2; color: #CC0000; }
            .total { font-weight: bold; font-size: 18px; text-align: right; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header" style="border-bottom: 2px solid #CC0000; padding-bottom: 20px;">
            <div style="font-size: 24px; font-weight: bold; margin-bottom: 5px; color: #000;">BADONE MOTORS PRIVATE LIMITED</div>
            <div style="font-size: 20px; color: #CC0000; margin-bottom: 5px; font-weight: bold;">My Shiva Honda</div>
            <div style="font-size: 14px; margin-bottom: 5px; color: #555;">
              00, Ward No 6, Biaora Bus Stand Guna Road,<br/>
              Biaora, Rajgarh, Madhya Pradesh - 465674
            </div>
            <div style="font-size: 14px; margin-bottom: 15px; color: #555;">Contact Number: 9425038999</div>
            <h2 style="margin: 0; color: #333; font-size: 22px;">Dispatch Invoice</h2>
          </div>
          
          <div class="details-container">
            <div class="details-box">
              <strong>Network Details:</strong><br/>
              Name: ${network.networkName}<br/>
              City: ${network.city}<br/>
              Owner: ${network.ownerName || 'N/A'}<br/>
              Contact: ${network.contactNumber || 'N/A'}
            </div>
            <div class="details-box">
              <strong>Dispatch Details:</strong><br/>
              Date: ${date}<br/>
              Transport Vehicle: ${vehicleNo || 'N/A'}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Sr No</th>
                <th>Model</th>
                <th>Color</th>
                <th>Frame No</th>
                <th>Engine No</th>
                <th>Ex-Showroom Price</th>
                <th>Dealer Discount</th>
                <th>Final Price</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>

          <div class="total">
            Total Amount: Rs ${totalAmount}
          </div>
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html: htmlContent });
    
    if (!(await Sharing.isAvailableAsync())) {
      alert("Sharing isn't available on your platform");
      return uri;
    }
    
    await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    return uri;

  } catch (error) {
    console.error("PDF generation failed:", error);
    throw error;
  }
};
