const User = require('../models/User');

// CREATE
exports.createUser = async (req, res) => {
  try {   
  const user = await User.create(req.body);
  console.log('[CREATE USER] Created:', user); // ✅ log output
  res.json(user);
  } catch (err) {
    console.error(err);
    console.log('[CREATE USER] Error Creating User:', err); // ✅ log error
    if (err.name === 'ZodError') return res.status(400).json({ message: 'Validation failed Or Create User Failed Or server error', errors: err.issues });
    return res.status(500).json({ message: 'Server error' });
  }
};

// READ ALL
exports.getUsers = async (req, res) => {
  try{
  const users = await User.find();
  console.log('[GET USERS] Retrieved:', users); // ✅ log output
  res.json(users);
  } catch (err) {
    console.error(err);
    console.log('[GET USERS] Error Fetching Users:', err); // ✅ log error
    return res.status(500).json({ message: 'Server error' });
  }
};

// READ ONE
exports.getUserById = async (req, res) => {
  try{
  const user = await User.findById(req.params.id);
  console.log('[GET USER BY ID] Payload:', req.params.id); // ✅ log input
  if (!user) return res.status(404).json({ message: 'Not found' });
  res.json(user);
  } catch (err) {
    console.error(err);
    console.log('[GET USER BY ID] Error Fetching User :', err); // ✅ log error
    return res.status(500).json({ message: 'Server error' });
  } 
};

// READ ONE
exports.getUserById = async (req, res) => {
  try{
  const user = await User.findById(req.params.id);
  console.log('[GET USER BY ID] Payload:', req.params.id); // ✅ log input
  if (!user) return res.status(404).json({ message: 'Not found' });
  res.json(user); 
  } catch (err) {
    console.error(err);
    console.log('[GET USER BY ID] Error Fetching User :', err); // ✅ log error
    return res.status(500).json({ message: 'Server error' });
  } 
};

// UPDATE
exports.updateUser = async (req, res) => {
  console.log('[UPDATE USER] Payload:', req.params.id, req.body); // ✅ log input
  try{
  const user = await User.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );
  console.log('[UPDATE USER] Updated:', user); // ✅ log output
  res.json(user);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ message: 'Validation failed or Update Failed', errors: err.issues });
    return res.status(500).json({ message: 'Server error' });
  }       
};

// DELETE
exports.deleteUser = async (req, res) => {
  try{
  await User.findByIdAndDelete(req.params.id);
  console.log('[DELETE USER] Payload:', req.params.id); // ✅ log input
  res.json({ message: 'Deleted' });
  console.log('[DELETE USER] Deleted:', req.params.id); // ✅ log output
  } catch (err) {
    console.error(err);
    console.log('[DELETE USER] Error Deleting User :', err); // ✅ log error
    return res.status(500).json({ message: 'Server error' });
  } 
};
