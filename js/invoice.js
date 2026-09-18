// ==========================================
// INVOICE MODULE - PDF Invoice Generator (jsPDF)
// Green & White Theme with Clean 'Rs.' Currency
// ==========================================

const InvoiceGenerator = {
  /**
   * Generates and downloads a clean PDF invoice for a given sale object.
   * @param {Object} sale - Sale record object containing id, invoiceNo, date, items, total, customerId, etc.
   */
  generatePDF(sale) {
    if (!sale) {
      alert('Sale record not found for invoice generation.');
      return;
    }

    // Get current store settings
    const settings = Storage.getSettings();
    const storeName = settings.storeName || 'Amrut Enterprise';
    const ownerName = settings.ownerName || '';
    const storeAddress = settings.address || '';
    const storePhone = settings.phone || '';

    // Get customer details
    const customers = Storage.getCustomers();
    const customer = customers.find(c => String(c.id) === String(sale.customerId)) || {
      name: sale.customerName || 'Walk-in Customer',
      phone: sale.customerPhone || 'N/A',
      address: sale.customerAddress || 'N/A'
    };

    // Ensure jsPDF is loaded
    const { jsPDF } = window.jspdf || {};
    if (!jsPDF) {
      alert('jsPDF library failed to load. Please check your internet connection.');
      return;
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = 20;

    // Green Theme Accent Colors
    const primaryGreen = [5, 150, 105]; // #059669
    const darkGreenText = [6, 95, 70]; // #065f46
    const bgGreenLight = [240, 253, 244]; // #f0fdf4
    const borderGreen = [167, 243, 208]; // #a7f3d0

    // Header Top Green Accent Bar
    doc.setFillColor(...primaryGreen);
    doc.rect(0, 0, pageWidth, 6, 'F');

    // Store Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.text(storeName, 14, currentY);

    // Invoice Label (Right aligned in green)
    doc.setFontSize(22);
    doc.setTextColor(...primaryGreen);
    doc.text('INVOICE', pageWidth - 14, currentY, { align: 'right' });

    currentY += 7;

    // Store Sub-details
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // Slate-500
    if (ownerName) {
      doc.text(`Owner: ${ownerName}`, 14, currentY);
      currentY += 4.5;
    }
    if (storeAddress) {
      doc.text(storeAddress, 14, currentY);
      currentY += 4.5;
    }
    if (storePhone) {
      doc.text(`Phone: ${storePhone}`, 14, currentY);
      currentY += 4.5;
    }

    // Invoice Metadata (Right column)
    const metaY = 27;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.text(`Invoice No:`, pageWidth - 70, metaY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${sale.invoiceNo || 'INV-' + sale.id}`, pageWidth - 14, metaY, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.text(`Date:`, pageWidth - 70, metaY + 5);
    doc.setFont('helvetica', 'normal');
    const formattedDate = sale.date ? new Date(sale.date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) : new Date().toLocaleDateString();
    doc.text(`${formattedDate}`, pageWidth - 14, metaY + 5, { align: 'right' });

    const status = (sale.paymentStatus || sale.status || 'Pending').toUpperCase();
    doc.setFont('helvetica', 'bold');
    doc.text(`Status:`, pageWidth - 70, metaY + 10);
    if (status === 'PAID') {
      doc.setTextColor(...primaryGreen);
    } else {
      doc.setTextColor(217, 119, 6); // Amber / Pending
    }
    doc.text(status, pageWidth - 14, metaY + 10, { align: 'right' });
    doc.setTextColor(51, 65, 85);

    currentY = Math.max(currentY + 6, metaY + 18);

    // Divider Line
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.setLineWidth(0.5);
    doc.line(14, currentY, pageWidth - 14, currentY);
    currentY += 8;

    // Billed To Customer Section (Green Label)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...primaryGreen);
    doc.text('BILLED TO:', 14, currentY);
    currentY += 5.5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(customer.name || 'Valued Customer', 14, currentY);
    currentY += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    if (customer.phone && customer.phone !== 'N/A') {
      doc.text(`Phone: ${customer.phone}`, 14, currentY);
      currentY += 4.5;
    }
    if (customer.address && customer.address !== 'N/A') {
      doc.text(`Address: ${customer.address}`, 14, currentY);
      currentY += 4.5;
    }

    currentY += 6;

    // Items Table
    const tableHeaders = [['#', 'Item Description', 'Unit Price', 'Qty', 'Total']];
    const tableRows = (sale.items || []).map((item, index) => [
      (index + 1).toString(),
      item.name || 'Product',
      `Rs. ${parseFloat(item.price || 0).toFixed(2)}`,
      String(item.qty || 1),
      `Rs. ${parseFloat(item.total || item.price * item.qty || 0).toFixed(2)}`
    ]);

    if (doc.autoTable) {
      doc.autoTable({
        startY: currentY,
        head: tableHeaders,
        body: tableRows,
        theme: 'striped',
        headStyles: {
          fillColor: primaryGreen,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
          halign: 'left'
        },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center' },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 32, halign: 'right' },
          3: { cellWidth: 20, halign: 'center' },
          4: { cellWidth: 36, halign: 'right' }
        },
        styles: {
          fontSize: 9,
          cellPadding: 3.5,
          textColor: [51, 65, 85]
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        margin: { left: 14, right: 14 }
      });

      currentY = doc.lastAutoTable.finalY + 8;
    } else {
      // Fallback custom drawing if autoTable plugin is unavailable
      doc.setFillColor(...primaryGreen);
      doc.rect(14, currentY, pageWidth - 28, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('#', 16, currentY + 5.5);
      doc.text('Item Description', 30, currentY + 5.5);
      doc.text('Price', 110, currentY + 5.5);
      doc.text('Qty', 140, currentY + 5.5);
      doc.text('Total', pageWidth - 16, currentY + 5.5, { align: 'right' });
      currentY += 10;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      (sale.items || []).forEach((item, index) => {
        doc.text(String(index + 1), 16, currentY);
        doc.text(item.name || 'Product', 30, currentY);
        doc.text(`Rs. ${parseFloat(item.price || 0).toFixed(2)}`, 110, currentY);
        doc.text(String(item.qty || 1), 140, currentY);
        doc.text(`Rs. ${parseFloat(item.total || item.price * item.qty || 0).toFixed(2)}`, pageWidth - 16, currentY, { align: 'right' });
        currentY += 6.5;
      });
      currentY += 4;
    }

    // Summary Box (Green Theme) showing Subtotal, Discount, and Grand Total
    const computedItemsSubtotal = (sale.items || []).reduce((acc, i) => acc + (parseFloat(i.total) || (parseFloat(i.price) * (i.qty || 1)) || 0), 0);
    const subtotal = sale.subtotal !== undefined ? parseFloat(sale.subtotal) : computedItemsSubtotal;
    let discountAmount = sale.discountAmount !== undefined ? parseFloat(sale.discountAmount) : 0;
    if (discountAmount === 0 && sale.discountValue && parseFloat(sale.discountValue) > 0) {
      if (sale.discountType === 'percentage') {
        discountAmount = (subtotal * parseFloat(sale.discountValue)) / 100;
      } else {
        discountAmount = parseFloat(sale.discountValue);
      }
    }
    const grandTotal = parseFloat(sale.total !== undefined ? sale.total : Math.max(0, subtotal - discountAmount));

    const summaryBoxWidth = 78;
    const summaryBoxX = pageWidth - 14 - summaryBoxWidth;
    const boxHeight = 28;

    doc.setFillColor(...bgGreenLight);
    doc.setDrawColor(...borderGreen);
    doc.setLineWidth(0.5);
    doc.roundedRect(summaryBoxX, currentY, summaryBoxWidth, boxHeight, 2, 2, 'FD');

    // Subtotal Row
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text('Subtotal:', summaryBoxX + 6, currentY + 6.5);
    doc.text(`Rs. ${subtotal.toFixed(2)}`, summaryBoxX + summaryBoxWidth - 6, currentY + 6.5, { align: 'right' });

    // Discount Row
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(220, 38, 38);
    const isPercent = sale.discountType === 'percentage' && parseFloat(sale.discountValue || 0) > 0;
    const discountLabel = isPercent ? `Discount (${sale.discountValue}%):` : 'Discount:';
    doc.text(discountLabel, summaryBoxX + 6, currentY + 12.5);
    doc.text(`-Rs. ${discountAmount.toFixed(2)}`, summaryBoxX + summaryBoxWidth - 6, currentY + 12.5, { align: 'right' });

    // Divider Line inside summary box
    doc.setDrawColor(...borderGreen);
    doc.setLineWidth(0.3);
    doc.line(summaryBoxX + 4, currentY + 16, summaryBoxX + summaryBoxWidth - 4, currentY + 16);

    // Grand Total Row
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...darkGreenText);
    doc.text('GRAND TOTAL:', summaryBoxX + 6, currentY + 22.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...primaryGreen);
    doc.text(`Rs. ${grandTotal.toFixed(2)}`, summaryBoxX + summaryBoxWidth - 6, currentY + 22.5, { align: 'right' });

    currentY += boxHeight + 10;

    // Footer note
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Thank you for your business!', pageWidth / 2, currentY, { align: 'center' });

    // Download PDF
    const filename = `${sale.invoiceNo || 'Invoice-' + sale.id}.pdf`;
    doc.save(filename);
  }
};

window.InvoiceGenerator = InvoiceGenerator;

