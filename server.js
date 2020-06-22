const express = require("express");
const app = express();
const mongoose = require("mongoose");
const methodOverride = require("method-override");
// Connect to mongodb
mongoose.connect("mongodb://localhost:27017/tientro", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", function () {
  console.log("Connect to database successfully");
});

// set template and some stuffs
app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));

// require models
const GeneralBill = require("./models/general.model");

// routes
app.get("/", totalPerUserMiddleware, async (req, res) => {
  try {
    const totalPerUser = res.totalPerUser;
    // Chọn ra tất cả các hóa đơn có trong db
    const bill = await GeneralBill.find({}).exec((err, bill) => {
      if (err) {
        throw err;
      } else {
        res.render("homepage", { bill: bill, totalPerUser: totalPerUser });
      }
    });
  } catch (error) {
    throw error;
  }
});

app.post("/", async (req, res) => {
  try {
    const newBill = await new GeneralBill({
      buyerName: req.body.buyerName,
      items: req.body.items,
      description: req.body.description,
      moneySpent: req.body.moneySpent,
    }).save();
    res.redirect("/");
  } catch (error) {
    throw error;
  }
});

// total routes
app.get("/total", totalPerUserMiddleware, (req, res, next) => {
  totalPerUser = res.totalPerUser;
  res.render("total", { totalPerUser: totalPerUser });
});

app.post("/total", async (req, res) => {
  const startDate = req.body.startDate;
  const endDate = req.body.endDate;
  const totalPerUser = await GeneralBill.aggregate([
    // Chuyển endDate về milisecond để tránh lỗi trong trường hợp startDate và endDate trùng nhau
    {
      $match: {
        date: {
          $gte: new Date(startDate),
          $lte: new Date(new Date(endDate).getTime() + 1000 * 60 * 60 * 24),
        },
      },
    },
    { $group: { _id: "$buyerName", total: { $sum: "$moneySpent" } } },
  ]);
  // Tính tổng tiền của tất cả
  const totalAllUser = totalPerUser.reduce(function (
    totalAllUser,
    currentValue
  ) {
    return totalAllUser + currentValue.total;
  },
  0);
  // Tính khoản nợ của từng người
  // 1, tìm ra người trả nhiều nhất
  let maxMoneySpentAmount = 0;
  let maxMoneySpentUser;
  totalPerUser.forEach((user) => {
    if (user.total > maxMoneySpentAmount) {
      maxMoneySpentAmount = user.total;
      maxMoneySpentUser = user._id;
    }
  });
  // 2,Tinh tiền nợ của những người còn lại với người trả nhiều nhất.
  let needToSpendAmount = totalAllUser / 3; //Có ba người, có thể chia cho totalPerUser.length cho chính xác
  let overBalanceOfMaxSpentUser = maxMoneySpentAmount - needToSpendAmount;
  let debt = new Array();
  for (let i = 0; i < totalPerUser.length; i++) {
    // Bỏ qua người trả nhiều tiền nhất
    if (totalPerUser[i]._id === maxMoneySpentUser) {
      continue;
    } else {
      userName = totalPerUser[i]._id;
      debtAmount = needToSpendAmount - totalPerUser[i].total;
      debt.push({ userName: userName, debtAmount: debtAmount });
    }
  }
  res.render("kettoan", {
    startDate: startDate,
    endDate: endDate,
    totalPerUser: totalPerUser,
    totalAllUser: totalAllUser,
    debt: debt,
    maxMoneySpentUser: maxMoneySpentUser,
  });
});
app.delete("/bills/:id", async (req, res) => {
  let bill;
  try{
    bill = await GeneralBill.findById(req.params.id)
    await bill.remove();
    res.redirect('/')
  }catch(err){
    throw err;
  }
});
// middlewares
// Tính tổng tiền của từng người
async function totalPerUserMiddleware(req, res, next) {
  const totalPerUser = await GeneralBill.aggregate([
    { $match: {} },
    { $group: { _id: "$buyerName", total: { $sum: "$moneySpent" } } },
  ]);
  res.totalPerUser = totalPerUser;
  next();
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running at port ${PORT}`);
});
