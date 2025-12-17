const Invoice = require('../models/Invoice');

// CREATE
exports.createInvoice = async (req, res) => {
  try {
    console.log('[CREATE INVOICE] Payload:', req.body); // ✅ log input
    const invoice = req.body;

    // minimal validation
    if (!invoice.services || invoice.services.length === 0) {
      console.log('[CREATE INVOICE] Services Missing:', req.body); // ✅ log input
      return res.status(400).json({ message: 'Services required' });
    }
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
    const invoices = await Invoice.find().sort({ createdAt: -1 });
    res.json(invoices);
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
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      console.warn('[GET INVOICE BY ID] Invoice Not Found:', req.params.id); // ✅ log error
      return res.status(404).json({ message: 'Invoice not found' });
    }
    res.json(invoice);
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
    // Auto-calculate totalAmount from services
    if (req.body.services && req.body.services.length > 0) {
      req.body.totalAmount = req.body.services.reduce(
        (sum, service) => sum + (service.amountCharged || 0), 
        0
      );
    }
    
    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!invoice) {
      console.warn('[UPDATE INVOICE] Invoice Not Found:', req.params.id); // ✅ log error
      return res.status(404).json({ message: 'Invoice not found' });
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