const mongoose = require("mongoose");
const Shema = mongoose.Schema;

const generalBillSchema = new Shema({
  buyerName: String,
  items: String,
  description: String,
  moneySpent: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("GeneralBill", generalBillSchema);
