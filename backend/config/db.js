const mongoose = require('mongoose');
const dns = require('dns');

// Force Node.js to use Google DNS for SRV lookups (bypasses ISP DNS that blocks SRV records)
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4']);

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
