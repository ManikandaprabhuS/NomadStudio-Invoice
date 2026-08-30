const Invoice = require('../models/Invoice');
const User = require('../models/User');

const roundCurrency = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const roundFinalAmount = value => {
  const wholeAmount = Math.floor(value);
  const decimalAmount = roundCurrency(value - wholeAmount);
  return decimalAmount <= 0.5 ? wholeAmount : wholeAmount + 1;
};

const calculateInvoiceAmounts = invoice => {
  if (invoice.services && invoice.services.length > 0) {
    invoice.services = invoice.services.map(service => ({
      ...service,
      amountCharged: roundCurrency(
        Number(service.quantity || 0) * Number(service.pricePerUnit || 0)
      )
    }));
    invoice.subTotal = roundCurrency(invoice.services.reduce(
      (sum, service) => sum + Number(service.amountCharged || 0),
      0
    ));
    invoice.cgstAmount = roundCurrency(invoice.subTotal * 0.09);
    invoice.sgstAmount = roundCurrency(invoice.subTotal * 0.09);
    const totalBeforeRoundOff = roundCurrency(
      invoice.subTotal + invoice.cgstAmount + invoice.sgstAmount
    );
    invoice.totalAmount = roundFinalAmount(totalBeforeRoundOff);
    invoice.roundOff = roundCurrency(invoice.totalAmount - totalBeforeRoundOff);
  }

  const totalAmount = Number(invoice.totalAmount);
  const receivedAmount = Number(invoice.receivedAmount);
  if (Number.isFinite(totalAmount)) invoice.totalAmount = totalAmount;
  if (Number.isFinite(receivedAmount)) invoice.receivedAmount = receivedAmount;
  if (Number.isFinite(totalAmount) && Number.isFinite(receivedAmount)) {
    invoice.balanceAmount = totalAmount - receivedAmount;
  }
  return invoice;
};

const addClientDetails = async invoices => {
  const phoneNumbers = invoices.map(invoice => invoice.phoneNumber).filter(Boolean);
  const gstNumbers = invoices.map(invoice => invoice.gstNumber).filter(Boolean);
  const clients = await User.find({
    $or: [
      { phoneNumber: { $in: phoneNumbers } },
      { gstNumber: { $in: gstNumbers } }
    ]
  }).lean();
  const clientsByPhone = new Map(clients.map(client => [client.phoneNumber, client]));
  const clientsByGst = new Map(clients.map(client => [client.gstNumber, client]));

  return invoices.map(invoice => {
    const client = clientsByPhone.get(invoice.phoneNumber) || clientsByGst.get(invoice.gstNumber);
    return {
      ...invoice,
      gstNumber: invoice.gstNumber || client?.gstNumber || '',
      emailId: invoice.emailId || client?.emailId || ''
    };
  });
};

// CREATE
exports.createInvoice = async (req, res) => {
  try {
    console.log('[CREATE INVOICE] Payload:', req.body); // ✅ log input
    const invoice = calculateInvoiceAmounts({ ...req.body });

    // minimal validation
    if (!invoice.services || invoice.services.length === 0) {
      console.log('[CREATE INVOICE] Services Missing:', req.body); // ✅ log input
      return res.status(400).json({ message: 'Services required' });
    }
    if (!invoice.userName?.trim() || !invoice.phoneNumber?.trim() ||
      !invoice.gstNumber?.trim() || !invoice.emailId?.trim()) {
      return res.status(400).json({
        message: 'Client name, phone number, GST number and email ID are required'
      });
    }

    invoice.userName = invoice.userName.trim();
    invoice.phoneNumber = invoice.phoneNumber.trim();
    invoice.gstNumber = invoice.gstNumber.trim().toUpperCase();
    invoice.emailId = invoice.emailId.trim();

    await User.findOneAndUpdate(
      {
        $or: [
          { phoneNumber: invoice.phoneNumber },
          { gstNumber: invoice.gstNumber }
        ]
      },
      {
        $set: {
          userName: invoice.userName,
          phoneNumber: invoice.phoneNumber,
          gstNumber: invoice.gstNumber,
          emailId: invoice.emailId
        }
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    const savedInvoice = await Invoice.create(invoice);
    console.log('[CREATE INVOICE] Created:', savedInvoice); // ✅ log output
    res.status(201).json(savedInvoice);

  } catch (err) {
    console.error(err);
    console.log('[CREATE INVOICE] Error Creating Invoice :', err); // ✅ log error
    res.status(500).json({ message: 'Failed to create invoice' });
  }
};

// LIST
exports.getInvoices = async (req, res) => {
  try {
    console.log('[GET INVOICES] Payload:', req.body); // ✅ log input
    const invoices = await Invoice.find().sort({ createdAt: -1 }).lean();
    const calculatedInvoices = invoices.map(calculateInvoiceAmounts);
    res.json(await addClientDetails(calculatedInvoices));
  } catch (err) {
    console.error(err);
    console.log('[GET INVOICES] Error Fetching Invoices :', err); // ✅ log error
    return res.status(500).json({ message: 'Server error' });
  }
};

// GET SINGLE INVOICE
exports.getInvoiceById = async (req, res) => {
  try {
    console.log('[GET INVOICE BY ID] Payload:', req.params.id); // ✅ log input
    const invoice = await Invoice.findById(req.params.id).lean();
    if (!invoice) {
      console.warn('[GET INVOICE BY ID] Invoice Not Found:', req.params.id); // ✅ log error
      return res.status(404).json({ message: 'Invoice not found' });
    }
    const [invoiceWithClient] = await addClientDetails([calculateInvoiceAmounts(invoice)]);
    res.json(invoiceWithClient);
  } catch (err) {
    console.error(err);
    console.log('[GET INVOICE BY ID] Error Fetching Invoice :', err); // ✅ log error
    return res.status(500).json({ message: 'Server error' });
  }
};

// UPDATE
exports.updateInvoice = async (req, res) => {
  try {
    console.log('[UPDATE INVOICE] Payload:', req.params.id, req.body); // ✅ log input
    const currentInvoice = await Invoice.findById(req.params.id).lean();
    if (!currentInvoice) {
      console.warn('[UPDATE INVOICE] Invoice Not Found:', req.params.id); // ✅ log error
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const recalculatedInvoice = calculateInvoiceAmounts({ ...currentInvoice, ...req.body });
    req.body.subTotal = recalculatedInvoice.subTotal;
    req.body.cgstAmount = recalculatedInvoice.cgstAmount;
    req.body.sgstAmount = recalculatedInvoice.sgstAmount;
    req.body.roundOff = recalculatedInvoice.roundOff;
    req.body.totalAmount = recalculatedInvoice.totalAmount;
    req.body.receivedAmount = recalculatedInvoice.receivedAmount;
    req.body.balanceAmount = recalculatedInvoice.balanceAmount;
    
    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (invoice.userName && invoice.phoneNumber && invoice.gstNumber && invoice.emailId) {
      await User.findOneAndUpdate(
        {
          $or: [
            { phoneNumber: invoice.phoneNumber },
            { gstNumber: invoice.gstNumber }
          ]
        },
        {
          $set: {
            userName: invoice.userName,
            phoneNumber: invoice.phoneNumber,
            gstNumber: invoice.gstNumber,
            emailId: invoice.emailId
          }
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
    }
    
    res.json(invoice);
  } catch (err) {
    if (err.name === 'ZodError') {
      console.warn('[UPDATE INVOICE] Validation Failed:', err.issues); // ✅ log error
      return res.status(400).json({ 
        message: 'Validation failed or Update Failed', 
        errors: err.issues 
      });
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: err.message 
      });
    }
    console.error(err);
    console.log('[UPDATE INVOICE] Error Updating Invoice or server error:', err); // ✅ log error
    return res.status(500).json({ message: 'Server error' });
  } 
};

// DELETE
exports.deleteInvoice = async (req, res) => {
  try {
    console.log('[DELETE INVOICE] Payload:', req.params.id); // ✅ log input
    const invoice = await Invoice.findByIdAndDelete(req.params.id);
    
    if (!invoice) {
      console.warn('[DELETE INVOICE] Invoice Not Found:', req.params.id); // ✅ log error
      return res.status(404).json({ message: 'Invoice not found' });
    }
    
    res.json({ message: 'Invoice deleted successfully' });
    console.log('[DELETE INVOICE] Deleted:', invoice); // ✅ log output
  } catch (err) {
    console.error(err);
    console.log('[DELETE INVOICE] Error Deleting Invoice or server error:', err); // ✅ log error
    return res.status(500).json({ message: 'Server error' });
  }
};
